// src/app/(admin)/users.js
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking } from "react-native";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, storage } from "../../../firebase/config";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import { getDisplayName } from "../../../lib/displayName";

const FILTERS = ["pending", "active", "suspended", "all", "student", "alumni", "business", "admin"];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [verifyUrls, setVerifyUrls] = useState({});

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return users;
    if (["pending", "active", "suspended"].includes(filter)) return users.filter((u) => u.status === filter);
    return users.filter((u) => u.role === filter);
  }, [users, filter]);

  async function approve(uid) {
    await updateDoc(doc(db, "users", uid), { status: "active", approvedAt: serverTimestamp() });
  }
  function suspend(uid) {
    Alert.alert("Suspend user?", "They won't be able to use the platform until reinstated.", [
      { text: "Cancel", style: "cancel" },
      { text: "Suspend", style: "destructive", onPress: () => updateDoc(doc(db, "users", uid), { status: "suspended" }) },
    ]);
  }
  async function reinstate(uid) {
    await updateDoc(doc(db, "users", uid), { status: "active" });
  }
  function remove(uid) {
    Alert.alert("Remove profile?", "Firebase Auth account still exists until manually deleted.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteDoc(doc(db, "users", uid)) },
    ]);
  }
  async function openVerification(uid, path) {
    try {
      let url = verifyUrls[uid];
      if (!url) {
        url = await getDownloadURL(ref(storage, path));
        setVerifyUrls((prev) => ({ ...prev, [uid]: url }));
      }
      Linking.openURL(url);
    } catch (err) {
      Alert.alert("Couldn't open", err.message);
    }
  }

  const counts = useMemo(() => ({
    pending: users.filter((u) => u.status === "pending").length,
    active: users.filter((u) => u.status === "active").length,
    suspended: users.filter((u) => u.status === "suspended").length,
    all: users.length,
    student: users.filter((u) => u.role === "student").length,
    alumni: users.filter((u) => u.role === "alumni").length,
    business: users.filter((u) => u.role === "business").length,
    admin: users.filter((u) => u.role === "admin").length,
  }), [users]);

  return (
    <View style={styles.container}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Text style={typography.h1}>Users</Text>
        <Text style={typography.bodyDim}>Approve, suspend, remove. View alumni verification documents.</Text>
      </View>

      <View style={styles.chipStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: 4 }}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)}
              style={[styles.chip, filter === f && styles.chipActive]}>
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                {f} ({counts[f]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
        {filtered.length === 0 && <Text style={typography.bodyDim}>Nothing here right now.</Text>}
        {filtered.map((u) => (
          <View key={u.id} style={styles.card}>
            <Text style={styles.name}>{getDisplayName(u)}</Text>
            <View style={styles.badges}>
              <Badge label={u.status} tone={u.status === "active" ? "good" : u.status === "pending" ? "warn" : u.status === "suspended" ? "danger" : ""} />
              <Badge label={u.role} tone="accent" />
            </View>
            <Text style={styles.meta}>{u.email}</Text>
            {u.programme ? <Text style={styles.meta}>🎓 {u.programme}{u.graduationYear ? ` · grad ${u.graduationYear}` : ""}</Text> : null}

            {u.role === "alumni" && u.verificationDocPath && (
              <TouchableOpacity onPress={() => openVerification(u.id, u.verificationDocPath)} style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>📎 View verification document ↗</Text>
              </TouchableOpacity>
            )}

            <View style={styles.actions}>
              {u.status === "pending" && (
                <TouchableOpacity onPress={() => approve(u.id)} style={[styles.actionBtn, styles.actionPrimary]}>
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>
              )}
              {u.status === "active" && u.role !== "admin" && (
                <TouchableOpacity onPress={() => suspend(u.id)} style={styles.actionBtn}>
                  <Text style={styles.actionSecondaryText}>Suspend</Text>
                </TouchableOpacity>
              )}
              {u.status === "suspended" && (
                <TouchableOpacity onPress={() => reinstate(u.id)} style={[styles.actionBtn, styles.actionPrimary]}>
                  <Text style={styles.actionText}>Reinstate</Text>
                </TouchableOpacity>
              )}
              {u.role !== "admin" && (
                <TouchableOpacity onPress={() => remove(u.id)} style={[styles.actionBtn, styles.actionDanger]}>
                  <Text style={styles.actionText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Badge({ label, tone }) {
  const toneColor = tone === "good" ? colors.good : tone === "warn" ? colors.warn : tone === "danger" ? colors.danger : tone === "accent" ? colors.accent : colors.textDim;
  return (
    <View style={[styles.badge, { borderColor: toneColor }]}>
      <Text style={[styles.badgeText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  chipStrip: { marginTop: spacing.sm, marginBottom: spacing.xs },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, marginRight: spacing.sm, alignSelf: "flex-start",
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  name: { color: colors.text, fontWeight: "700", fontSize: 15 },
  badges: { flexDirection: "row", gap: 6, marginTop: 6 },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.full, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  linkBtn: { marginTop: spacing.sm, paddingVertical: 6 },
  linkBtnText: { color: colors.accent, fontWeight: "600", fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border },
  actionPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  actionSecondaryText: { color: colors.textDim, fontWeight: "600", fontSize: 12 },
});
