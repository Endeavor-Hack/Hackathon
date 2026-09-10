// context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { logSnapshotError } from "../lib/handleSnapshotError";
import { registerPushToken } from "../lib/registerPush";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserDoc(null);
        setInitializing(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    // Live listener — if an admin approves a pending account while the
    // app is open, this updates automatically without a manual refresh.
    // Register for push once the user doc exists — safe to call
    // repeatedly (getExpoPushTokenAsync is idempotent).
    registerPushToken(firebaseUser.uid);

    const unsubscribe = onSnapshot(
      doc(db, "users", firebaseUser.uid),
      (snap) => {
        setUserDoc(snap.exists() ? snap.data() : null);
        setInitializing(false);
      },
      (error) => {
        // This used to fail completely silently — if the read was ever
        // denied by security rules or hit any other error, userDoc just
        // stayed null forever with zero visible explanation anywhere.
        logSnapshotError("AuthContext: failed to read user document", error);
        setUserDoc(null);
        setInitializing(false);
      }
    );
    return unsubscribe;
  }, [firebaseUser]);

  return (
    <AuthContext.Provider value={{ firebaseUser, userDoc, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
