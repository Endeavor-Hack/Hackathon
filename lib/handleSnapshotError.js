// Every onSnapshot listener in the app funnels errors through here.
//
// There's one specific error we don't want to surface: when a user
// signs out, their auth token invalidates a tick or two before all
// their listeners have unsubscribed. That race throws
// "permission-denied" on the way out, harmlessly. Left uncaught it
// showed a scary red error every sign-out — so we swallow that one
// case and log everything else.
export function logSnapshotError(context, error) {
  if (error.code === "permission-denied") return;
  console.error(`${context}:`, error.code, error.message);
}
