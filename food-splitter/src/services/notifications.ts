/**
 * Push notification service using Expo Notifications.
 *
 * Notifications are sent when:
 * - Someone adds you to a meal split
 * - You receive a payment request ("You owe Alex $33.15")
 * - Someone pays their share of your meal
 * - All payments for a meal are settled
 */

import * as Notifications from "expo-notifications";
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";

// ─── Configure notification behavior ────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Register for Push Notifications ────────────────────
export async function registerForPushNotifications(userId: string): Promise<string | null> {
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

  // Save token to user's Firestore profile
  await updateDoc(doc(db, "users", userId), { pushToken: token });

  return token;
}

// ─── Send Local Notification ────────────────────────────
export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null, // immediate
  });
}

// ─── Notification Listeners ─────────────────────────────
export function onNotificationReceived(callback: (notification: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function onNotificationTapped(callback: (response: Notifications.NotificationResponse) => void) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
