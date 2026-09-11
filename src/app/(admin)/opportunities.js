// src/app/(admin)/opportunities.js
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp,
  query, where, getDocs, addDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import { scoreOpportunity } from "../../../lib/feedRanking";

const FILTERS = ["pending", "approved", "rejected", "all"];

export default function AdminOpportunities() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    return onSnapshot(collection(db, "opportunities"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(list);
    });
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((o) => o.status === filter);
  }, [items, filter]);

  async function approve(opp) {
    await updateDoc(doc(db, "opportunities", opp.id), {
      status: "approved", approvedAt: serverTimestamp(),
    });
    // Fan out to students/alumni whose skills + programme match. Brief
    // requires smart matching, not a generic broadcast.
    const snap = await getDocs(query(
      collection(db, "users"),
      where("status", "==", "active"),
      where("role", "in", ["student", "alumni"]),
    ));
    for (const d of snap.docs) {
      const profile = { id: d.id, ...d.data() };
      const score = scoreOpportunity(opp, profile);
      if (score >= 20) {
        await addDoc(collection(db, "notifications"), {
          userId: profile.id,
          type: "opportunity_match",
          message: `New opportunity that matches your profile: "${opp.title}" at ${opp.companyName}`,
          relatedId: opp.id,
          matchScore: score,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    }
  }
  async function reject(id) {
    await updateDoc(doc(db, "opportunities", id), { status: "rejected" });
  }
  function remove(id) {
    Alert.alert("Delete listing?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteDoc(doc(db, "opportunities", id)) },
    ]);
  }

  const counts = { pending: 0, approved: 0, rejected: 0, all: items.length };
  items.forEach((o) => counts[o.status] = (counts[o.status] || 0) + 1);

  return (
    <View style={styles.container}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Text style={typography.h1}>Opportunity approval</Text>
        <Text style={typography.bodyDim}>Listings from businesses go live only after you approve them.</Text>
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
        {filtered.length === 0 && <Text style={typography.bodyDim}>Nothing to review right now.</Text>}
        {filtered.map((o) => (
          <View key={o.id} style={styles.card}>
            <Text style={styles.title}>{o.title}</Text>
            <View style={styles.badges}>
              <Text style={[styles.badge, { color: statusColor(o.status), borderColor: statusColor(o.status) }]}>{o.status}</Text>
              <Text style={[styles.badge, { color: colors.accent, borderColor: colors.accent }]}>{o.type}</Text>
            </View>
            <Text style={styles.meta}>{o.companyName} · {o.location || "—"}</Text>
            {o.description ? <Text style={styles.desc}>{o.description}</Text> : null}
            {(o.skillsRequired || []).length > 0 && (
              <Text style={styles.meta}>Skills: {o.skillsRequired.join(", ")}</Text>
            )}
            {o.programme ? <Text style={styles.meta}>Programme: {o.programme}</Text> : null}

            <View style={styles.actions}>
              {o.status === "pending" && (
                <TouchableOpacity onPress={() => approve(o)} style={[styles.actionBtn, styles.actionPrimary]}>
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>
              )}
              {o.status !== "rejected" && (
                <TouchableOpacity onPress={() => reject(o.id)} style={styles.actionBtn}>
                  <Text style={styles.actionSecondaryText}>Reject</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => remove(o.id)} style={[styles.actionBtn, styles.actionDanger]}>
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function statusColor(s) {
  if (s === "approved") return colors.good;
  if (s === "rejected") return colors.danger;
  return colors.warn;
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
  title: { color: colors.text, fontWeight: "700", fontSize: 15 },
  badges: { flexDirection: "row", gap: 6, marginTop: 6, marginBottom: 6 },
  badge: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.full, borderWidth: 1 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  desc: { color: colors.text, fontSize: 13, marginTop: spacing.sm, lineHeight: 18 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border },
  actionPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  actionSecondaryText: { color: colors.textDim, fontWeight: "600", fontSize: 12 },
});
