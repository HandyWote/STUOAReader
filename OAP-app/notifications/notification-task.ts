import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { getApiBaseUrl } from '@/services/api';
import {
  getLastSince,
  getNextAllowedAt,
  getNotificationsEnabled,
  resetNotificationState,
  setLastSince,
  setNextAllowedAt,
} from '@/notifications/notification-storage';
import { isExpoGo } from '@/notifications/notification-env';

const TASK_NAME = 'oap-articles-background-fetch';
const CHANNEL_ID = 'oa-updates';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const JITTER_MAX_MS = 15 * 60 * 1000;

let notificationHandlerReady = false;

async function getNotificationsModule() {
  if (Platform.OS !== 'android' || isExpoGo()) {
    return null;
  }
  return await import('expo-notifications');
}

function isWithinWindow(date: Date) {
  const hour = date.getHours();
  return hour >= 8 && hour < 24;
}

function buildNextAllowedAt(now: number) {
  const jitter = Math.floor(Math.random() * JITTER_MAX_MS);
  return now + TWO_HOURS_MS + jitter;
}

async function ensureAndroidChannel() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'OA通知',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function notifySingle(summary: string) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }
  if (!notificationHandlerReady) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerReady = true;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '最新OA',
      body: summary,
    },
    trigger: null,
  });
}

async function notifyCombined(summaries: string[], total: number) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }
  if (!notificationHandlerReady) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerReady = true;
  }
  const body = summaries.join('\n');
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `最新OA（${total}条）`,
      body,
    },
    trigger: null,
  });
}

TaskManager.defineTask(TASK_NAME, async () => {
  if (Platform.OS !== 'android' || isExpoGo()) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }
  const enabled = await getNotificationsEnabled();
  if (!enabled) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  const now = new Date();
  if (!isWithinWindow(now)) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  const nowMs = now.getTime();
  const nextAllowedAt = await getNextAllowedAt();
  if (nextAllowedAt && nowMs < nextAllowedAt) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  const since = await getLastSince();
  const params = since ? `?since=${since}` : '';
  const headers: Record<string, string> = {};
  if (since) {
    headers['If-Modified-Since'] = new Date(since).toUTCString();
  }
  const resp = await fetch(`${getApiBaseUrl()}/articles/${params}`, { headers });

  if (resp.status === 304) {
    await setNextAllowedAt(buildNextAllowedAt(nowMs));
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  if (!resp.ok) {
    await setNextAllowedAt(buildNextAllowedAt(nowMs));
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  const data = await resp.json();
  const articles = Array.isArray(data?.articles) ? data.articles : [];
  if (articles.length === 0) {
    await setNextAllowedAt(buildNextAllowedAt(nowMs));
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  const parsed = articles
    .map((article: { created_at?: string; summary?: string }) => {
      const createdAt = article.created_at ? new Date(article.created_at).getTime() : 0;
      return {
        createdAt,
        summary: article.summary || '暂无摘要',
      };
    })
    .filter((item: { createdAt: number }) => item.createdAt > 0)
    .sort((a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt);

  const newItems = since ? parsed.filter((item) => item.createdAt > since) : parsed;
  if (newItems.length === 0) {
    await setNextAllowedAt(buildNextAllowedAt(nowMs));
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  await ensureAndroidChannel();

  if (newItems.length <= 2) {
    for (const item of newItems) {
      await notifySingle(item.summary);
    }
  } else {
    const summaries = newItems.slice(0, 3).map((item) => item.summary);
    await notifyCombined(summaries, newItems.length);
  }

  const maxCreatedAt = Math.max(...newItems.map((item) => item.createdAt));
  await setLastSince(maxCreatedAt);
  await setNextAllowedAt(buildNextAllowedAt(nowMs));
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

export async function registerNotificationTask() {
  if (Platform.OS !== 'android' || isExpoGo()) {
    return;
  }
  const tasks = await BackgroundFetch.getRegisteredTasksAsync();
  const alreadyRegistered = tasks.some((task) => task.taskName === TASK_NAME);
  if (alreadyRegistered) {
    return;
  }
  await BackgroundFetch.registerTaskAsync(TASK_NAME, {
    minimumInterval: TWO_HOURS_MS / 1000,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterNotificationTask() {
  if (Platform.OS !== 'android' || isExpoGo()) {
    return;
  }
  await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
}

export async function disableNotifications() {
  const Notifications = await getNotificationsModule();
  if (Notifications) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  await unregisterNotificationTask();
  await resetNotificationState();
}

export async function registerNotificationTaskIfEnabled() {
  if (Platform.OS !== 'android' || isExpoGo()) {
    return;
  }
  const enabled = await getNotificationsEnabled();
  if (enabled) {
    await registerNotificationTask();
  }
}
