// Write a notification doc for a target user. The receiving screen
// listens live to /notifications where userId == me, so the banner
// appears in-app in real time. On device builds, deliverPush (a
// Cloud Function on this collection) also sends the OS-level push
// through Expo. No polling on either path.
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export async function createNotification(userId, type, message, relatedId = null) {
  if (!userId) return; // e.g. don't notify yourself for liking your own post
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
    // A notification is always a side-effect of some other action —
    // its failure shouldn't roll back the like/comment/apply/etc.
    console.error("Failed to create notification:", err.code, err.message);
  }
}
