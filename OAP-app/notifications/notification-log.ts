import { getItem, removeItem, setItem } from '@/storage/universal-storage';

const LOG_KEY = 'notifications.poll_logs';
const MAX_LOGS = 50;

export type NotificationPollLog = {
  id: string;
  at: string;
  status: string;
  detail?: string;
  count?: number;
};

function buildLogId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function getNotificationLogs() {
  const raw = await getItem(LOG_KEY);
  if (!raw) {
    return [] as NotificationPollLog[];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NotificationPollLog[]) : [];
  } catch {
    return [];
  }
}

export async function appendNotificationLog(entry: Omit<NotificationPollLog, 'id'>) {
  const logs = await getNotificationLogs();
  const next = [{ ...entry, id: buildLogId() }, ...logs].slice(0, MAX_LOGS);
  await setItem(LOG_KEY, JSON.stringify(next));
  return next;
}

export async function clearNotificationLogs() {
  await removeItem(LOG_KEY);
}
