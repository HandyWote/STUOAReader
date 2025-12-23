export function formatDateLabel() {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      weekday: 'long',
      month: 'numeric',
      day: 'numeric',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString();
  }
}

export function formatTimeLabel(iso?: string) {
  if (!iso) {
    return '--:--';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function getDayPeriod(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return '上午好';
  }
  if (hour >= 12 && hour < 18) {
    return '下午好';
  }
  return '晚上好';
}
