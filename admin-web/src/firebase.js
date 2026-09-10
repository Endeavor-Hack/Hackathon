// Same project the mobile app talks to.
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBOG1MMzpQgAMrlhiskng6WxyCEIG4wv0c",
  authDomain: "endeavourai-a8a27.firebaseapp.com",
  projectId: "endeavourai-a8a27",
  storageBucket: "endeavourai-a8a27.firebasestorage.app",
  messagingSenderId: "759618763180",
  appId: "1:759618763180:web:4289d404f5dac86d196209",
  measurementId: "G-KPEBXV8NSC",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
