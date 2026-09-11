// Ask the OS for a push token and stash it on the user's Firestore
// doc. The deliverPush Cloud Function reads that token whenever a
// notification doc is created and sends the banner through Expo's
// push service — no polling anywhere in the loop.
//
// A trap worth knowing about: `import * as Notifications from
// "expo-notifications"` throws at IMPORT time in Expo Go on SDK 53+
// because Android push was removed from Expo Go. That means a normal
// static import at the top of this file crashes the whole app before
// AuthContext even mounts, and expo-router then reports "no default
// export" on every screen because the module tree never finished
// evaluating. So the module is loaded with `require()` inside the
// function, after we've confirmed we're not in Expo Go.
import { Platform } from "react-native";
import Constants from "expo-constants";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export async function registerPushToken(uid) {
  try {
    // Expo Go on SDK 53+ can't do push. Bail cleanly rather than
    // touching the broken module.
    if (Constants.appOwnership === "expo") return;

    // Web doesn't get device push either.
    if (Platform.OS === "web") return;

    // Only real devices issue tokens (simulators return errors).
    if (!Constants.isDevice) return;

    const Notifications = require("expo-notifications");

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
    // Non-fatal — the app still works with in-app-only notifications.
    console.warn("Push registration skipped:", err.message);
  }
}
