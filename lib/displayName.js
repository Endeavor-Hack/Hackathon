// One place that answers "what name do we show for this person?"
// Falls back to a capitalised local-part of the email if no name is
// set yet (so new signups don't render as "Unknown" for a beat).
export function getDisplayName(userLike) {
  if (userLike?.fullName?.trim()) return userLike.fullName.trim();
  return nameFromEmail(userLike?.email);
}

export function nameFromEmail(email) {
  if (!email) return "Unknown";
  const localPart = email.split("@")[0];
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}
