// lib/displayName.js
// Single source of truth for "what name do we show for this person."
// Before the profile screen existed, several screens each had their own
// copy of an email-derived fallback — this replaces all of those.

export function getDisplayName(userLike) {
  if (userLike?.fullName?.trim()) return userLike.fullName.trim();
  return nameFromEmail(userLike?.email);
}

export function nameFromEmail(email) {
  if (!email) return "Unknown";
  const localPart = email.split("@")[0];
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}
