// Content moderation. Reachable from the "Moderate content" button
// on the admin Home tab, not the tab bar. Lists every post in the
// system with flag/unflag/delete controls, plus a filter toggle
// between All posts and Flagged only.
import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../../../firebase/config";
import { colors, spacing, typography, radius } from "../../../theme/colors";

export default function AdminModeration() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    return onSnapshot(collection(db, "posts"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPosts(list);
    });
  }, []);

  const visible = tab === "flagged" ? posts.filter((p) => p.flagged) : posts;

  function remove(id) {
    Alert.alert("Delete post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteDoc(doc(db, "posts", id)) },
    ]);
  }
  async function toggleFlag(id, flagged) {
    await updateDoc(doc(db, "posts", id), { flagged: !flagged });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={typography.h2}>🛡️ Content moderation</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.chipRow}>
          <TouchableOpacity onPress={() => setTab("all")} style={[styles.chip, tab === "all" && styles.chipActive]}>
            <Text style={[styles.chipText, tab === "all" && styles.chipTextActive]}>All ({posts.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab("flagged")} style={[styles.chip, tab === "flagged" && styles.chipActive]}>
            <Text style={[styles.chipText, tab === "flagged" && styles.chipTextActive]}>Flagged ({posts.filter((p) => p.flagged).length})</Text>
          </TouchableOpacity>
        </View>

        {visible.length === 0 && <Text style={typography.bodyDim}>No posts here.</Text>}
        {visible.map((p) => (
          <View key={p.id} style={styles.card}>
            <Text style={styles.author}>{p.authorName} <Text style={styles.roleTag}>{p.authorRole}</Text></Text>
            {p.flagged && <Text style={[styles.flag, { color: colors.danger }]}>⚑ flagged</Text>}
            <Text style={styles.postText}>{p.text}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => toggleFlag(p.id, p.flagged)} style={styles.actionBtn}>
                <Text style={styles.actionSecondaryText}>{p.flagged ? "Unflag" : "Flag"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(p.id)} style={[styles.actionBtn, styles.actionDanger]}>
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.textDim, fontSize: 24 },
  chipRow: { flexDirection: "row", gap: 6, marginBottom: spacing.md },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  author: { color: colors.text, fontWeight: "700", fontSize: 14 },
  roleTag: { color: colors.accent, fontWeight: "600", fontSize: 11, textTransform: "uppercase" },
  flag: { fontSize: 11, marginTop: 2, fontWeight: "700" },
  postText: { color: colors.text, fontSize: 13, marginTop: spacing.sm, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 6, marginTop: spacing.sm },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border },
  actionDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  actionSecondaryText: { color: colors.textDim, fontWeight: "600", fontSize: 12 },
});
