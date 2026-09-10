// firebase/config.js
// Fill in your actual project values from the Firebase console:
// Project Settings → General → Your apps → SDK setup and configuration.
// These are safe to keep in the client — Firebase's real security boundary
// is Firestore/Storage security rules, not hiding this config object.

import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBOG1MMzpQgAMrlhiskng6WxyCEIG4wv0c",
  authDomain: "endeavourai-a8a27.firebaseapp.com",
  projectId: "endeavourai-a8a27",
  storageBucket: "endeavourai-a8a27.firebasestorage.app",
  messagingSenderId: "759618763180",
  appId: "1:759618763180:web:4289d404f5dac86d196209",
  measurementId: "G-KPEBXV8NSC"
};

export const app = initializeApp(firebaseConfig);

// initializeAuth (not getAuth) + AsyncStorage persistence is required in
// React Native — without this, users get logged out every time the app
// restarts, since there's no browser localStorage to fall back on.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
