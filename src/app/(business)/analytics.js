// src/app/(business)/analytics.js
// Business dashboard: applicant pipeline per listing, engagement, skill
// distribution across programmes, applicant demographics by programme
// and year of study, plus reach for the company profile.
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { collection, query, where, onSnapshot, documentId } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import SimpleBarChart from "../../../components/charts/SimpleBarChart";
import SimplePieChart from "../../../components/charts/SimplePieChart";

export default function BusinessAnalytics() {
  const { firebaseUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [apps, setApps] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    return onSnapshot(
      query(collection(db, "opportunities"), where("businessId", "==", firebaseUser.uid)),
      (s) => { setListings(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
    );
  }, [firebaseUser]);

  useEffect(() => {
    if (listings.length === 0) { setApps([]); return; }
    const ids = listings.map((l) => l.id).slice(0, 10);
    return onSnapshot(
      query(collection(db, "applications"), where("opportunityId", "in", ids)),
      (s) => setApps(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [listings]);

  useEffect(() => {
    const uids = Array.from(new Set(apps.map((a) => a.studentId))).slice(0, 10);
    if (uids.length === 0) { setApplicants([]); return; }
    return onSnapshot(
      query(collection(db, "users"), where(documentId(), "in", uids)),
      (s) => setApplicants(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [apps]);

  const perListing = useMemo(() =>
    listings.slice(0, 8).map((l) => ({
      label: (l.title || "").slice(0, 8),
      value: apps.filter((a) => a.opportunityId === l.id).length,
    })), [listings, apps]);

  const skillDist = useMemo(() => {
    const counts = {};
    applicants.forEach((p) => (p.skills || []).forEach((s) => {
      counts[s] = (counts[s] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value]) => ({ label, value }));
  }, [applicants]);

  const programmeDist = useMemo(() => {
    const counts = {};
    applicants.forEach((p) => {
      const k = (p.programme || "Unknown").split(" ").slice(0, 2).join(" ");
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [applicants]);

  const yearDist = useMemo(() => {
    const counts = {};
    applicants.forEach((p) => {
      const y = p.graduationYear || "Unspecified";
      counts[y] = (counts[y] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([label, value]) => ({ label: String(label), value }));
  }, [applicants]);

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>;

  const chartWidth = Dimensions.get("window").width - spacing.lg * 2 - spacing.md * 2;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
      <Text style={typography.h1}>Analytics</Text>
      <Text style={[typography.bodyDim, { marginBottom: spacing.lg }]}>How your listings and profile are performing.</Text>

      <View style={styles.grid}>
        <Stat label="Total listings" value={listings.length} />
        <Stat label="Approved" value={listings.filter((l) => l.status === "approved").length} />
        <Stat label="Applications" value={apps.length} />
        <Stat label="Unique applicants" value={new Set(apps.map((a) => a.studentId)).size} />
      </View>

      <ChartCard title="Applicants per listing">
        <SimpleBarChart data={perListing} width={chartWidth} />
      </ChartCard>

      <ChartCard title="Top applicant skills">
        <SimpleBarChart data={skillDist} width={chartWidth} />
      </ChartCard>

      <ChartCard title="Applicants by programme">
        <SimplePieChart data={programmeDist} />
      </ChartCard>

      <ChartCard title="Applicants by graduation year">
        <SimpleBarChart data={yearDist} width={chartWidth} />
      </ChartCard>
    </ScrollView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
function ChartCard({ title, children }) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  stat: {
    flex: 1, minWidth: 140,
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  statLabel: { color: colors.textDim, fontSize: 11, textTransform: "uppercase" },
  statValue: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 4 },
  chartCard: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  chartTitle: { color: colors.text, fontWeight: "700", fontSize: 13, marginBottom: spacing.sm },
});
