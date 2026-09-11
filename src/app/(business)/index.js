// src/app/(business)/index.js
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import { logSnapshotError } from "../../../lib/handleSnapshotError";
import Logo from "../../../components/Logo";

export default function BusinessHome() {
  const { firebaseUser, userDoc } = useAuth();
  const [listings, setListings] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(collection(db, "opportunities"), where("businessId", "==", firebaseUser.uid));
    return onSnapshot(q, (snap) => {
      setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => logSnapshotError("Listings error", err));
  }, [firebaseUser]);

  useEffect(() => {
    if (listings.length === 0) { setApps([]); return; }
    const ids = listings.map((l) => l.id).slice(0, 10);
    const q = query(collection(db, "applications"), where("opportunityId", "in", ids));
    return onSnapshot(q, (snap) => setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => logSnapshotError("Applications error", err));
  }, [listings]);

  const stats = useMemo(() => ({
    total: listings.length,
    approved: listings.filter((l) => l.status === "approved").length,
    pending: listings.filter((l) => l.status === "pending").length,
    apps: apps.length,
    unreviewed: apps.filter((a) => a.status === "applied").length,
  }), [listings, apps]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
        <Text style={typography.h1}>Welcome{userDoc?.companyName ? `, ${userDoc.companyName}` : ""}</Text>
        <Logo size={32} variant="mark" />
      </View>
      <Text style={[typography.bodyDim, { marginBottom: spacing.lg }]}>Your activity at a glance.</Text>

      {loading && <ActivityIndicator color={colors.accent} />}

      <View style={styles.row}>
        <StatCard label="Live listings" value={stats.approved} />
        <StatCard label="Pending approval" value={stats.pending} />
      </View>
      <View style={styles.row}>
        <StatCard label="Total applicants" value={stats.apps} />
        <StatCard label="New applications" value={stats.unreviewed} />
      </View>

      <Text style={styles.sectionTitle}>Your listings</Text>
      {listings.length === 0 && <Text style={typography.bodyDim}>No listings yet — head to My Listings.</Text>}
      {listings.map((l) => (
        <View key={l.id} style={styles.card}>
          <Text style={styles.h}>{l.title}</Text>
          <Text style={styles.meta}>
            {l.type} · {l.status}
            {"  ·  "}
            {apps.filter((a) => a.opportunityId === l.id).length} applicant(s)
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  stat: {
    flex: 1, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  statLabel: { color: colors.textDim, fontSize: 12, textTransform: "uppercase" },
  statValue: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: 4 },
  sectionTitle: { color: colors.textDim, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  h: { color: colors.text, fontWeight: "700", fontSize: 15 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
});
