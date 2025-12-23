export function getAttachmentsCount(value: unknown) {
  if (!value) {
    return 0;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

export function getPriority(title: string) {
  if (!title) {
    return 'normal';
  }
  if (title.includes('紧急') || title.includes('重要')) {
    return 'high';
  }
  return 'normal';
}
