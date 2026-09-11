// List of every conversation the current user is in, sorted by
// recency. Tapping a row opens the conversation screen. The
// participants array on each conversation doc is our filter — one
// query, one round trip.
import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import { logSnapshotError } from "../../../lib/handleSnapshotError";
import { getDisplayName } from "../../../lib/displayName";
import Avatar from "../../../components/Avatar";

export default function Messages() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(collection(db, "conversations"),
      where("participants", "array-contains", firebaseUser.uid));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setConversations(list);
      setLoading(false);

      // Fetch other party's profile once per conversation
      list.forEach((c) => {
        const otherUid = c.participants.find((p) => p !== firebaseUser.uid);
        if (otherUid && !profiles[otherUid]) {
          getDoc(doc(db, "users", otherUid)).then((snap) => {
            if (snap.exists()) setProfiles((prev) => ({ ...prev, [otherUid]: snap.data() }));
          });
        }
      });
    }, (err) => { logSnapshotError("Conversations error", err); setLoading(false); });
  }, [firebaseUser]);

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={
          <Text style={[typography.h1, { marginBottom: spacing.md }]}>Messages</Text>
        }
        renderItem={({ item }) => {
          const otherUid = item.participants.find((p) => p !== firebaseUser.uid);
          const other = profiles[otherUid];
          return (
            <TouchableOpacity
              onPress={() => router.push(`/conversation?uid=${otherUid}`)}
              style={styles.row}
            >
              <Avatar uid={otherUid} name={other ? getDisplayName(other) : "?"} photoUrl={other?.photoUrl} size={40} style={{ marginRight: spacing.sm }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{other ? getDisplayName(other) : "…"}</Text>
                <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || "(no messages yet)"}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} /> :
          <Text style={[typography.bodyDim, { textAlign: "center", marginTop: spacing.xl }]}>
            No conversations yet. Open someone's profile from Connections and tap "Message".
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: "center", alignItems: "center", marginRight: spacing.sm },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  name: { color: colors.text, fontWeight: "700", fontSize: 14 },
  preview: { color: colors.textDim, fontSize: 12, marginTop: 2 },
});
