// Who's signed in, what their user doc looks like, and whether we're
// still loading either. Anything auth-related in the app reads from
// here via useAuth() rather than talking to Firebase directly.
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

    // Push token registration is idempotent, so it's fine to fire this
    // every time the auth session changes.
    registerPushToken(firebaseUser.uid);

    // Live listener on the user doc — if an admin flips a pending
    // account to active while the app is open, the pending screen
    // updates without needing a manual refresh.
    const unsubscribe = onSnapshot(
      doc(db, "users", firebaseUser.uid),
      (snap) => {
        setUserDoc(snap.exists() ? snap.data() : null);
        setInitializing(false);
      },
      (error) => {
        // Without this, a rules-denied read would leave userDoc stuck
        // at null forever with nothing in the UI or logs to explain it.
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
