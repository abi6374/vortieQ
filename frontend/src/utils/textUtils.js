/**
 * Comprehensive utility to remove all Unicode emojis, pictographs, symbols,
 * modifiers, flags, and surrogate sequences from text.
 * Preserves alphanumeric characters, spaces, punctuation, symbols (|, -, (), etc.),
 * and international languages.
 */
export function stripEmojis(str) {
  if (!str || typeof str !== 'string') return str || ''
  return str
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\p{Extended_Pictographic}]/gu,
      ''
    )
    .replace(/\s{2,}/g, ' ')
    .trim()
}
