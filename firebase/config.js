// Firebase client SDK bootstrap. The API key is safe to commit —
// Firebase's real security boundary is the Firestore + Storage rules
// (see firestore.rules and storage.rules), not hiding this config.

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

// initializeAuth (not getAuth) + AsyncStorage is what keeps users
// signed in across app restarts in React Native. Without this we'd
// bounce everyone to the login screen every cold start.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
