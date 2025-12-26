import { getItem, multiRemove, removeItem, setItem } from '@/storage/universal-storage';

const ENABLED_KEY = 'notifications.enabled';
const LAST_SINCE_KEY = 'notifications.last_since';
const NEXT_ALLOWED_KEY = 'notifications.next_allowed_at';

export async function getNotificationsEnabled() {
  const value = await getItem(ENABLED_KEY);
  return value === 'true';
}

export async function setNotificationsEnabled(enabled: boolean) {
  await setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function getLastSince() {
  const value = await getItem(LAST_SINCE_KEY);
  return value ? Number(value) : null;
}

export async function setLastSince(value: number | null) {
  if (value === null) {
    await removeItem(LAST_SINCE_KEY);
    return;
  }
  await setItem(LAST_SINCE_KEY, String(value));
}

export async function getNextAllowedAt() {
  const value = await getItem(NEXT_ALLOWED_KEY);
  return value ? Number(value) : null;
}

export async function setNextAllowedAt(value: number | null) {
  if (value === null) {
    await removeItem(NEXT_ALLOWED_KEY);
    return;
  }
  await setItem(NEXT_ALLOWED_KEY, String(value));
}

export async function resetNotificationState() {
  await multiRemove([LAST_SINCE_KEY, NEXT_ALLOWED_KEY]);
}
