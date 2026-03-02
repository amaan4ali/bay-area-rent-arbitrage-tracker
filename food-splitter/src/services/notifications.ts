/**
 * Push notification service using Expo Notifications.
 * In demo mode, notifications are no-ops.
 */

import { DEMO_MODE } from "../config";

// ─── Register for Push Notifications ────────────────────
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (DEMO_MODE) return null;

  const Notifications = await import("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  return token;
}

// ─── Send Local Notification ────────────────────────────
export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  if (DEMO_MODE) return;
  const Notifications = await import("expo-notifications");
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null,
  });
}
