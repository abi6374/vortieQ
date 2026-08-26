"""Resume parsing + topic extraction.

Accepts a PDF or DOCX file's bytes, pulls text out, hands it to Groq with the
resume_extract prompt, returns the structured topic list. No persistence at
this layer — the router or a later phase decides what to store.
"""

import io
import json
from pathlib import Path as _Path

from app.config import groq_client, settings

MAX_BYTES = 5 * 1024 * 1024  # 5 MB cap
MAX_TEXT_CHARS = 60_000       # trim very long resumes before sending to the LLM


def _load_prompt(name: str) -> str:
    return (_Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


# ---------------------------------------------------------------- text extraction
def _pdf_to_text(data: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(data))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def _docx_to_text(data: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(data))
    parts = [p.text for p in doc.paragraphs if p.text]
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text:
                    parts.append(cell.text)
    return "\n".join(parts)


def extract_text(data: bytes, filename: str, content_type: str = "") -> str:
    """Return plain text from a resume file. Raises ValueError on unsupported/empty."""
    if not data:
        raise ValueError("Empty file")
    if len(data) > MAX_BYTES:
        raise ValueError(f"File too large ({len(data)} bytes; max {MAX_BYTES})")

    name = (filename or "").lower()
    ct = (content_type or "").lower()

    is_pdf = name.endswith(".pdf") or "pdf" in ct
    is_docx = name.endswith(".docx") or "wordprocessingml" in ct

    if is_pdf:
        text = _pdf_to_text(data)
    elif is_docx:
        text = _docx_to_text(data)
    else:
        raise ValueError("Unsupported file type. Please upload a PDF or DOCX.")

    text = text.strip()
    if not text:
        raise ValueError("Could not read any text from the file (is it scanned/image-only?)")
    return text[:MAX_TEXT_CHARS]


# ---------------------------------------------------------------- LLM extraction
def _strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def _call_groq(messages: list, max_tokens: int = 3000) -> str:
    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.1,
        reasoning_effort="low",
    )
    return (response.choices[0].message.content or "").strip()


VALID_LEVELS = {"basic", "intermediate", "advanced", "expert"}


def _validate(payload: dict) -> dict:
    topics = payload.get("topics")
    if not isinstance(topics, list):
        raise ValueError("payload.topics is not a list")
    clean = []
    for t in topics:
        name = (t.get("name") or "").strip()
        level = (t.get("suggested_level") or "").lower().strip()
        evidence = (t.get("evidence") or "").strip()
        if not name or level not in VALID_LEVELS:
            continue
        clean.append({"name": name, "evidence": evidence, "suggested_level": level})
    years = payload.get("detected_years_experience", 0)
    try:
        years = int(years)
    except (TypeError, ValueError):
        years = 0
    return {"topics": clean, "detected_years_experience": max(0, years)}


def extract_topics(resume_text: str) -> dict:
    """Returns {topics: [...], detected_years_experience: N}."""
    messages = [
        {"role": "system", "content": _load_prompt("resume_extract.txt")},
        {"role": "user", "content": f"RESUME:\n\n{resume_text}"},
    ]
    raw = _call_groq(messages)
    try:
        return _validate(json.loads(_strip_fences(raw)))
    except (json.JSONDecodeError, ValueError):
        # Retry once with an explicit reminder.
        messages.append({"role": "assistant", "content": raw})
        messages.append({
            "role": "user",
            "content": "Return ONLY the JSON object. No markdown, no explanation.",
        })
        try:
            return _validate(json.loads(_strip_fences(_call_groq(messages))))
        except Exception:
            return {"topics": [], "detected_years_experience": 0}
