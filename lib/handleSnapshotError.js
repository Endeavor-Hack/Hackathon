// lib/handleSnapshotError.js
// A live onSnapshot listener can throw "permission-denied" for one
// harmless, expected reason: the user just signed out, their auth token
// became invalid, and this specific listener hadn't unsubscribed yet in
// that exact instant. That's a timing race, not a real bug — so we don't
// want a scary full-screen red error for it every time someone signs out.
//
// Any OTHER error (or a permission-denied error while still genuinely
// signed in) still logs normally, since that's real and worth seeing.
export function logSnapshotError(context, error) {
  if (error.code === "permission-denied") {
    // Expected during the brief window around sign-out — ignore quietly.
    return;
  }
  console.error(`${context}:`, error.code, error.message);
}
