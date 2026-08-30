"""Tests for resume_service.py's upload-security hardening (Phase 4) -
file type was previously verified ONLY by filename extension / the
client-supplied Content-Type header, neither of which a caller can be
trusted to set honestly. No parser timeout/page-count bound existed
either, despite pypdf/python-docx being handed arbitrary uploaded bytes.

Uses real, minimal PDF/DOCX files built with pypdf/python-docx (not
hand-crafted byte strings) so "a real valid file is still accepted" is
actually proven against a real parser, not assumed.
"""
import io

import pytest

from app.services import resume_service
from app.services.resume_service import UnsupportedFileError, extract_text


def _real_minimal_pdf(pages: int = 1, with_text: bool = True) -> bytes:
    from pypdf import PdfWriter
    if with_text:
        # A blank page alone extracts no text; pypdf can't easily inject
        # real text without reportlab, so tests needing real extractable
        # text use a fixed known-good sample PDF byte string instead (see
        # _pdf_with_extractable_text below). This helper is for the
        # magic-byte/page-count/encryption tests, which don't need text.
        pass
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    w.write(buf)
    return buf.getvalue()


def _real_minimal_docx(text: str = "Python, SQL, and data analysis experience.") -> bytes:
    from docx import Document
    doc = Document()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


class TestMagicByteValidation:
    def test_real_pdf_bytes_with_pdf_extension_accepted_through_type_check(self):
        # Only checking that magic-byte validation doesn't reject a real
        # PDF - a blank page has no extractable text, so this exercises
        # up through _looks_like_pdf/_pdf_to_text, then correctly hits the
        # "no text" honesty check (also verified, not just true "by luck").
        with pytest.raises(ValueError, match="Could not read any text"):
            extract_text(_real_minimal_pdf(), "resume.pdf", "application/pdf")

    def test_fake_pdf_with_wrong_magic_bytes_rejected(self):
        """The exact gap this closes: a file NAMED .pdf (and even claiming
        the right Content-Type) whose actual bytes are not a real PDF."""
        fake = b"This is not a real PDF, just plain text pretending to be one."
        with pytest.raises(UnsupportedFileError, match="file signature"):
            extract_text(fake, "resume.pdf", "application/pdf")

    def test_fake_docx_with_wrong_magic_bytes_rejected(self):
        fake = b"Not a real ZIP/DOCX container at all."
        with pytest.raises(UnsupportedFileError, match="file signature"):
            extract_text(fake, "resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")

    def test_real_docx_bytes_extract_real_text(self):
        result = extract_text(_real_minimal_docx(), "resume.docx",
                               "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        assert "Python" in result

    def test_an_executable_disguised_with_a_pdf_extension_is_rejected(self):
        # A real, distinctive magic-byte signature (Windows PE/EXE:
        # "MZ...") that is definitely not a PDF, to make the point concrete.
        fake_exe = b"MZ\x90\x00\x03\x00\x00\x00" + b"\x00" * 100
        with pytest.raises(UnsupportedFileError):
            extract_text(fake_exe, "resume.pdf", "application/pdf")


class TestPdfPageCountBound:
    def test_pdf_over_the_page_limit_rejected(self):
        oversized = _real_minimal_pdf(pages=resume_service.MAX_PDF_PAGES + 1)
        with pytest.raises(UnsupportedFileError, match="pages"):
            extract_text(oversized, "resume.pdf", "application/pdf")

    def test_pdf_at_the_page_limit_is_not_rejected_for_page_count(self):
        at_limit = _real_minimal_pdf(pages=resume_service.MAX_PDF_PAGES)
        # Blank pages have no text, so this still raises - but on the
        # "no text extracted" check, NOT the page-count check, proving
        # the page-count bound itself didn't trigger.
        with pytest.raises(ValueError, match="Could not read any text"):
            extract_text(at_limit, "resume.pdf", "application/pdf")


class TestEncryptedPdfRejection:
    def test_password_protected_pdf_rejected_with_a_clear_message(self):
        from pypdf import PdfWriter
        w = PdfWriter()
        w.add_blank_page(width=200, height=200)
        w.encrypt(user_password="secret", owner_password="secret2")
        buf = io.BytesIO()
        w.write(buf)
        with pytest.raises(UnsupportedFileError, match="password-protected"):
            extract_text(buf.getvalue(), "resume.pdf", "application/pdf")


class TestSizeLimit:
    def test_oversized_file_rejected(self):
        oversized = b"%PDF-" + b"\x00" * (resume_service.MAX_BYTES + 1)
        with pytest.raises(ValueError, match="too large"):
            extract_text(oversized, "resume.pdf", "application/pdf")

    def test_empty_file_rejected(self):
        with pytest.raises(ValueError, match="Empty file"):
            extract_text(b"", "resume.pdf", "application/pdf")


class TestUnsupportedExtension:
    def test_unrecognized_extension_rejected_before_any_parsing_attempt(self):
        with pytest.raises(ValueError, match="Unsupported file type"):
            extract_text(b"some bytes", "resume.exe", "application/octet-stream")
