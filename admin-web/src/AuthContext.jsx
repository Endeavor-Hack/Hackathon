import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [isAdminClaim, setIsAdminClaim] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserDoc(null);
        setIsAdminClaim(false);
        setInitializing(false);
      } else {
        // Force-refresh so a freshly promoted admin sees their claim
        // without waiting up to an hour for the token to refresh.
        const token = await user.getIdTokenResult(true);
        setIsAdminClaim(token.claims.admin === true);
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    return onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
      setUserDoc(snap.exists() ? snap.data() : null);
      setInitializing(false);
    });
  }, [firebaseUser]);

  return (
    <AuthCtx.Provider value={{ firebaseUser, userDoc, isAdminClaim, initializing }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
