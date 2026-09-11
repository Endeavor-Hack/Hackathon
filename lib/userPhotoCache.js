// A tiny shared cache of uid → photoUrl. Twenty avatars in a busy
// feed shouldn't fire twenty separate Firestore reads for the same
// user — the first Avatar to mount for a given uid starts a live
// listener on that user's doc, and every other Avatar for that uid
// reads instantly from the cache.
//
// The cache lives for the app's lifetime. It resets on the next cold
// start after sign-out, which is fine — the data isn't sensitive.
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

const cache = new Map(); // uid -> photoUrl | null
const subscribers = new Map(); // uid -> Set<setState>
const listeners = new Map(); // uid -> Firestore unsubscribe fn

export function useUserPhoto(uid) {
  const [photo, setPhoto] = useState(uid ? cache.get(uid) ?? null : null);

  useEffect(() => {
    if (!uid) return;

    // Publish current cached value immediately
    setPhoto(cache.get(uid) ?? null);

    // Register this component as a subscriber
    if (!subscribers.has(uid)) subscribers.set(uid, new Set());
    subscribers.get(uid).add(setPhoto);

    // Start (or reuse) the Firestore listener for this uid
    if (!listeners.has(uid)) {
      const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
        const url = snap.exists() ? (snap.data().photoUrl || null) : null;
        cache.set(uid, url);
        subscribers.get(uid)?.forEach((fn) => fn(url));
      });
      listeners.set(uid, unsub);
    }

    return () => {
      const set = subscribers.get(uid);
      if (!set) return;
      set.delete(setPhoto);
      // Keep the listener alive across the app lifetime — the cost of
      // dropping and re-subscribing when a user scrolls in and out of a
      // feed row is worse than one persistent listener per unique uid.
    };
  }, [uid]);

  return photo;
}
