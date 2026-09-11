// src/app/(admin)/announcements.js
import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import {
  collection, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp,
  query, where, getDocs,
} from "firebase/firestore";
import { auth, db } from "../../../firebase/config";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import ThemedButton from "../../../components/ThemedButton";

const TARGETS = [
  { key: "all", label: "Everyone" },
  { key: "student", label: "Students" },
  { key: "alumni", label: "Alumni" },
  { key: "business", label: "Businesses" },
];

export default function AdminAnnouncements() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, "announcements"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(list);
    });
  }, []);

  async function broadcast() {
    if (!title.trim() || !body.trim()) { Alert.alert("Missing info", "Title and body required."); return; }
    setBusy(true);
    try {
      const created = await addDoc(collection(db, "announcements"), {
        title: title.trim(), body: body.trim(), target,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      // Fan out per-user notifications
      let usersQ = query(collection(db, "users"), where("status", "==", "active"));
      if (target !== "all") {
        usersQ = query(collection(db, "users"), where("status", "==", "active"), where("role", "==", target));
      }
      const snap = await getDocs(usersQ);
      for (const d of snap.docs) {
        await addDoc(collection(db, "notifications"), {
          userId: d.id, type: "announcement", message: title.trim(),
          relatedId: created.id, read: false, createdAt: serverTimestamp(),
        });
      }
      setTitle(""); setBody("");
      Alert.alert("Broadcast sent", `Reached ${snap.docs.length} user(s).`);
    } catch (err) {
      Alert.alert("Broadcast failed", err.message);
    } finally {
      setBusy(false);
    }
  }

  function remove(id) {
    Alert.alert("Delete announcement?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteDoc(doc(db, "announcements", id)) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 240 }}
        keyboardShouldPersistTaps="handled">
        <Text style={typography.h1}>Announcements</Text>
        <Text style={typography.bodyDim}>Broadcast to everyone or a specific role. Recipients see it as a notification and pinned on their feed.</Text>

        <View style={styles.card}>
          <Text style={styles.h}>Compose</Text>

          <Text style={styles.lbl}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.in} placeholderTextColor={colors.textDim} />

          <Text style={styles.lbl}>Body</Text>
          <TextInput value={body} onChangeText={setBody} style={[styles.in, styles.multi]} multiline placeholderTextColor={colors.textDim} />

          <Text style={styles.lbl}>Target audience</Text>
          <View style={styles.chipRow}>
            {TARGETS.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setTarget(t.key)}
                style={[styles.chip, target === t.key && styles.chipActive]}>
                <Text style={[styles.chipText, target === t.key && styles.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: spacing.md }}>
            <ThemedButton title="Broadcast" onPress={broadcast} loading={busy} />
          </View>
        </View>

        <Text style={styles.section}>History</Text>
        {items.length === 0 && <Text style={typography.bodyDim}>No announcements yet.</Text>}
        {items.map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.h}>{a.title}</Text>
            <Text style={[styles.meta, { color: colors.accent }]}>{a.target}</Text>
            <Text style={styles.desc}>{a.body}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => remove(a.id)} style={[styles.actionBtn, styles.actionDanger]}>
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, marginTop: spacing.md,
  },
  h: { color: colors.text, fontWeight: "700", fontSize: 15 },
  lbl: { color: colors.textDim, fontSize: 12, marginTop: spacing.sm, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 },
  in: {
    backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 10,
    color: colors.text, fontSize: 14,
  },
  multi: { minHeight: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: colors.panelLight, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  meta: { fontSize: 11, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.4 },
  desc: { color: colors.text, fontSize: 13, marginTop: 6, lineHeight: 18 },
  section: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.lg },
  actions: { flexDirection: "row", gap: 6, marginTop: spacing.sm },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border },
  actionDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
