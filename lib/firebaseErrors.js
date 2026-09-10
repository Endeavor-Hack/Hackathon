// lib/firebaseErrors.js
// Single source of truth for turning Firebase's raw error codes into
// something a user actually understands. Return null for unknown codes
// so callers can decide whether to fall through to a generic message.
export function mapFirebaseError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again shortly.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "That password is too weak. Use at least 8 characters.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been suspended. Please contact an administrator.";
    case "permission-denied":
      return "You don't have permission to do that.";
    default:
      return null;
  }
}
