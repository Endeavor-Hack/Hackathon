// A pair of UIDs → a single deterministic conversation ID. Sorting
// first means Alice→Bob and Bob→Alice always resolve to the same doc,
// so we never accidentally create two parallel threads for one
// conversation.
export function conversationIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}
