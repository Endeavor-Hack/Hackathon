// lib/registerPush.js
// Register the device with Expo's push service and persist the token on
// the user doc. The Cloud Function `deliverPush` reads that token
// whenever a notification doc is created and delivers it as a real
// device push — this closes the loop from Firestore write to phone
// banner without any polling.
//
// NOTE: push tokens are only issued in a native build (development or
// production). Expo Go on SDK 53+ does not support push, so this call
// silently no-ops in that environment.
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export async function registerPushToken(uid) {
  try {
    if (!Constants.isDevice && Platform.OS !== "web") return;

    const settings = await Notifications.getPermissionsAsync();
    let status = settings.status;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await updateDoc(doc(db, "users", uid), {
      expoPushToken: tokenResp.data,
    });
  } catch (err) {
    // Non-fatal: fall back to in-app notifications only.
    console.warn("Push registration skipped:", err.message);
  }
}
