// src/app/(admin)/events.js
import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import {
  collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp,
  query, where, getDocs,
} from "firebase/firestore";
import { auth, db } from "../../../firebase/config";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import ThemedButton from "../../../components/ThemedButton";

const EMPTY = { title: "", date: "", location: "", description: "", targetProgrammes: "" };

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, "events"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.date > b.date ? 1 : -1));
      setEvents(list);
    });
  }, []);

  function set(k, v) { setForm((prev) => ({ ...prev, [k]: v })); }

  function startEdit(ev) {
    setEditingId(ev.id);
    setForm({
      title: ev.title || "",
      date: ev.date || "",
      location: ev.location || "",
      description: ev.description || "",
      targetProgrammes: (ev.targetProgrammes || []).join(", "),
    });
  }

  async function save() {
    if (!form.title || !form.date) { Alert.alert("Missing info", "Title and date are required."); return; }
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      date: form.date.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      targetProgrammes: form.targetProgrammes.split(",").map((s) => s.trim()).filter(Boolean),
      createdBy: auth.currentUser.uid,
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), payload);
      } else {
        const created = await addDoc(collection(db, "events"), { ...payload, createdAt: serverTimestamp() });
        await notifyTargeted(created.id, payload);
      }
      setForm(EMPTY);
      setEditingId(null);
    } catch (err) {
      Alert.alert("Save failed", err.message);
    } finally {
      setBusy(false);
    }
  }

  function remove(id) {
    Alert.alert("Delete event?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteDoc(doc(db, "events", id)) },
    ]);
  }

  async function notifyTargeted(eventId, ev) {
    let usersToNotify = [];
    if (!ev.targetProgrammes.length) {
      const snap = await getDocs(query(collection(db, "users"), where("status", "==", "active")));
      usersToNotify = snap.docs.map((d) => d.id);
    } else {
      const snap = await getDocs(query(
        collection(db, "users"),
        where("status", "==", "active"),
        where("programme", "in", ev.targetProgrammes.slice(0, 10)),
      ));
      usersToNotify = snap.docs.map((d) => d.id);
    }
    for (const uid of usersToNotify) {
      await addDoc(collection(db, "notifications"), {
        userId: uid,
        type: "event",
        message: `New event: ${ev.title}`,
        relatedId: eventId,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 240 }}
        keyboardShouldPersistTaps="handled">
        <Text style={typography.h1}>Events</Text>
        <Text style={typography.bodyDim}>Career fairs, workshops, networking. Only admins can publish these.</Text>

        <View style={styles.card}>
          <Text style={styles.h}>{editingId ? "Edit event" : "New event"}</Text>

          <Text style={styles.lbl}>Title</Text>
          <TextInput value={form.title} onChangeText={(v) => set("title", v)} style={styles.in} placeholder="e.g. Autumn Career Fair" placeholderTextColor={colors.textDim} />

          <Text style={styles.lbl}>Date (YYYY-MM-DD)</Text>
          <TextInput value={form.date} onChangeText={(v) => set("date", v)} style={styles.in} placeholder="2026-04-15" placeholderTextColor={colors.textDim} />

          <Text style={styles.lbl}>Location</Text>
          <TextInput value={form.location} onChangeText={(v) => set("location", v)} style={styles.in} placeholder="e.g. Richfield Johannesburg" placeholderTextColor={colors.textDim} />

          <Text style={styles.lbl}>Description</Text>
          <TextInput value={form.description} onChangeText={(v) => set("description", v)} style={[styles.in, styles.multi]} multiline placeholderTextColor={colors.textDim} />

          <Text style={styles.lbl}>Target programmes (comma separated, blank = everyone)</Text>
          <TextInput value={form.targetProgrammes} onChangeText={(v) => set("targetProgrammes", v)} style={styles.in} placeholder="BSc Computer Science, BCom, ..." placeholderTextColor={colors.textDim} />

          <View style={{ marginTop: spacing.md }}>
            <ThemedButton title={editingId ? "Save changes" : "Publish event"} onPress={save} loading={busy} />
          </View>
          {editingId && (
            <View style={{ marginTop: spacing.sm }}>
              <ThemedButton title="Cancel edit" variant="secondary" onPress={() => { setEditingId(null); setForm(EMPTY); }} />
            </View>
          )}
        </View>

        <Text style={styles.section}>Upcoming</Text>
        {events.map((e) => (
          <View key={e.id} style={styles.card}>
            <Text style={styles.h}>{e.title}</Text>
            <Text style={styles.meta}>📅 {e.date} · 📍 {e.location || "—"}</Text>
            {e.description ? <Text style={styles.desc}>{e.description}</Text> : null}
            {(e.targetProgrammes || []).length > 0 && (
              <Text style={styles.metaItalic}>Programmes: {e.targetProgrammes.join(", ")}</Text>
            )}
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => startEdit(e)} style={styles.actionBtn}><Text style={styles.actionSecondaryText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => remove(e.id)} style={[styles.actionBtn, styles.actionDanger]}><Text style={styles.actionText}>Delete</Text></TouchableOpacity>
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
  multi: { minHeight: 60, textAlignVertical: "top" },
  section: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.lg },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  metaItalic: { color: colors.textDim, fontSize: 11, fontStyle: "italic", marginTop: 4 },
  desc: { color: colors.text, fontSize: 13, marginTop: 6, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 6, marginTop: spacing.sm },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border },
  actionDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  actionSecondaryText: { color: colors.textDim, fontWeight: "600", fontSize: 12 },
});
