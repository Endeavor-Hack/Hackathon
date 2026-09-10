// Deterministic conversation id for a pair of users: sorted uids joined
// with "_". This way both directions resolve to the same doc without
// needing a lookup — and the id is stable enough to use in the URL.
export function conversationIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}
