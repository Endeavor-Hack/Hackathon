// src/app/(business)/listings.js
import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity } from "react-native";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import ThemedButton from "../../../components/ThemedButton";
import { logSnapshotError } from "../../../lib/handleSnapshotError";

const TYPES = ["internship", "learnership", "part-time", "graduate"];

const EMPTY = { title: "", type: "internship", location: "", description: "", skillsRequired: "", programme: "" };

export default function BusinessListings() {
  const { firebaseUser, userDoc } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(collection(db, "opportunities"), where("businessId", "==", firebaseUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(list);
      setLoading(false);
    }, (err) => { logSnapshotError("Listings error", err); setLoading(false); });
    return unsub;
  }, [firebaseUser]);

  function set(k, v) { setForm((prev) => ({ ...prev, [k]: v })); }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      type: item.type || "internship",
      location: item.location || "",
      description: item.description || "",
      skillsRequired: (item.skillsRequired || []).join(", "),
      programme: item.programme || "",
    });
  }

  async function save() {
    setError("");
    if (!form.title.trim()) { setError("Title is required."); return; }
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      type: form.type,
      location: form.location.trim(),
      description: form.description.trim(),
      skillsRequired: form.skillsRequired.split(",").map((s) => s.trim()).filter(Boolean),
      programme: form.programme.trim(),
      businessId: firebaseUser.uid,
      companyName: userDoc?.companyName || userDoc?.fullName || "Unknown company",
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "opportunities", editingId), payload);
      } else {
        await addDoc(collection(db, "opportunities"), {
          ...payload,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }
      setForm(EMPTY);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirmSimple("Delete this listing?")) return;
    await deleteDoc(doc(db, "opportunities", id));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
      <Text style={[typography.h1, { marginBottom: spacing.md }]}>My listings</Text>
      <Text style={[typography.bodyDim, { marginBottom: spacing.md }]}>
        Post opportunities. All new listings need admin approval before they appear to students.
      </Text>

      <View style={styles.card}>
        <Text style={styles.h}>{editingId ? "Edit listing" : "New listing"}</Text>

        <Text style={styles.lbl}>Title</Text>
        <TextInput value={form.title} onChangeText={(v) => set("title", v)} style={styles.in} placeholder="e.g. Junior Developer Internship" placeholderTextColor={colors.textDim} />

        <Text style={styles.lbl}>Type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {TYPES.map((t) => (
            <TouchableOpacity key={t} onPress={() => set("type", t)} style={[styles.chip, form.type === t && styles.chipActive]}>
              <Text style={[styles.chipText, form.type === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.lbl}>Location</Text>
        <TextInput value={form.location} onChangeText={(v) => set("location", v)} style={styles.in} placeholder="e.g. Sandton" placeholderTextColor={colors.textDim} />

        <Text style={styles.lbl}>Description</Text>
        <TextInput value={form.description} onChangeText={(v) => set("description", v)} style={[styles.in, styles.multi]} multiline placeholder="What the role is about, ideal candidate, etc." placeholderTextColor={colors.textDim} />

        <Text style={styles.lbl}>Skills required (comma separated)</Text>
        <TextInput value={form.skillsRequired} onChangeText={(v) => set("skillsRequired", v)} style={styles.in} placeholder="Python, SQL, teamwork" placeholderTextColor={colors.textDim} />

        <Text style={styles.lbl}>Target programme (optional — for smart matching)</Text>
        <TextInput value={form.programme} onChangeText={(v) => set("programme", v)} style={styles.in} placeholder="e.g. BSc Computer Science" placeholderTextColor={colors.textDim} />

        {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}

        <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
          <View style={{ flex: 1 }}>
            <ThemedButton title={editingId ? "Save changes" : "Publish for review"} onPress={save} loading={busy} />
          </View>
          {editingId && (
            <View style={{ flex: 1 }}>
              <ThemedButton title="Cancel" variant="secondary" onPress={() => { setEditingId(null); setForm(EMPTY); }} />
            </View>
          )}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your listings</Text>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {!loading && items.length === 0 ? (
        <Text style={typography.bodyDim}>No listings yet.</Text>
      ) : (
        items.map((o) => (
          <View key={o.id} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{o.title}</Text>
                <Text style={styles.itemMeta}>{o.type} · {o.location || "—"}</Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                  <View style={[styles.badge, statusColor(o.status)]}>
                    <Text style={styles.badgeText}>{o.status}</Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity onPress={() => startEdit(o)} style={styles.iconBtn}><Text>✏️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => remove(o.id)} style={styles.iconBtn}><Text>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function statusColor(status) {
  if (status === "approved") return { borderColor: colors.good };
  if (status === "rejected") return { borderColor: colors.danger };
  return { borderColor: colors.warn };
}
function confirmSimple(msg) { return typeof window !== "undefined" ? window.confirm(msg) : true; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  h: { color: colors.text, fontWeight: "700", fontSize: 15, marginBottom: spacing.sm },
  lbl: { color: colors.textDim, fontSize: 12, marginTop: spacing.sm, marginBottom: 4 },
  in: {
    backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8,
    color: colors.text, fontSize: 14,
  },
  multi: { minHeight: 80, textAlignVertical: "top" },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: colors.panelLight, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  sectionTitle: { color: colors.textDim, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  itemTitle: { color: colors.text, fontWeight: "700", fontSize: 15 },
  itemMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.full, borderWidth: 1 },
  badgeText: { color: colors.text, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  iconBtn: { padding: 6 },
});
