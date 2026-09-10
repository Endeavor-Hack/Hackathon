// lib/notify.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

// Real-time in-app notifications, backed by a live Firestore listener on
// the receiving screen — not polling. This is the in-app-alert half of
// the brief's real-time requirement; device-level push notifications
// (via Expo's push service / FCM) are a separate, later layer that needs
// an EAS dev build rather than Expo Go, since Expo Go doesn't support
// raw FCM.
export async function createNotification(userId, type, message, relatedId = null) {
  if (!userId) return; // e.g. don't try to notify a like on your own post
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      type,
      message,
      relatedId,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Notifications are a nice-to-have side effect — a failure here
    // shouldn't block or crash whatever main action triggered it.
    console.error("Failed to create notification:", err.code, err.message);
  }
}
