export function sanitizeText(text: string) {
  return text.replace(/[^\w\u4e00-\u9fff]+/g, ' ').trim();
}

export function extractKeywords(question: string) {
  const cleaned = sanitizeText(question);
  if (!cleaned) {
    return [];
  }
  const tokens = cleaned.split(/\s+/).filter((token) => token.length >= 2);
  const unique = Array.from(new Set(tokens));
  unique.sort((a, b) => b.length - a.length);
  return unique.slice(0, 8);
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function splitHighlightedText(text: string, highlights: string[]) {
  if (!text || highlights.length === 0) {
    return [{ value: text, isMatch: false }];
  }
  const pattern = highlights.map(escapeRegex).join('|');
  if (!pattern) {
    return [{ value: text, isMatch: false }];
  }
  const regex = new RegExp(`(${pattern})`, 'gi');
  return text.split(regex).map((part) => ({
    value: part,
    isMatch: regex.test(part),
  }));
}
