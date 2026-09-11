// Admin home. Live platform stats up top, three charts underneath
// (users by role, opportunity approval pipeline, registrations over
// time), then Moderation and Sign out. Uses the same little SVG
// chart components as the student and business dashboards — nothing
// bespoke here.
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth, db } from "../../../firebase/config";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import SimpleBarChart from "../../../components/charts/SimpleBarChart";
import SimplePieChart from "../../../components/charts/SimplePieChart";
import SimpleLineChart from "../../../components/charts/SimpleLineChart";
import Logo from "../../../components/Logo";
import ThemedButton from "../../../components/ThemedButton";
import FireLoader from "../../../components/FireLoader";

export default function AdminHome() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "users"), (s) => {
      setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, "posts"), (s) => setPosts(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, "opportunities"), (s) => setOpps(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); };
  }, []);

  const usersByRole = useMemo(() => {
    const counts = {};
    users.forEach((u) => { counts[u.role || "unknown"] = (counts[u.role || "unknown"] || 0) + 1; });
    return Object.entries(counts).map(([role, value]) => ({ label: role, value }));
  }, [users]);

  const oppsByStatus = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    opps.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [opps]);

  const registrations = useMemo(() => {
    const buckets = {};
    users.forEach((u) => {
      const d = u.createdAt?.toDate?.();
      if (!d) return;
      buckets[d.toISOString().slice(5, 10)] = (buckets[d.toISOString().slice(5, 10)] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([label, value]) => ({ label, value }));
  }, [users]);

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    pending: users.filter((u) => u.status === "pending").length,
    posts: posts.length,
    flagged: posts.filter((p) => p.flagged).length,
    videos: posts.filter((p) => p.videoUrl).length,
    opps: opps.length,
  };

  async function handleSignOut() {
    try { await signOut(auth); router.replace("/login"); }
    catch (err) { console.error(err); }
  }

  if (loading) return <View style={styles.centered}><FireLoader /></View>;

  const chartW = Dimensions.get("window").width - spacing.lg * 2 - spacing.md * 2;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
      <View style={styles.header}>
        <View>
          <Text style={typography.h1}>Admin console</Text>
          <Text style={typography.bodyDim}>Live snapshot of the platform.</Text>
        </View>
        <Logo size={36} variant="mark" />
      </View>

      <View style={styles.grid}>
        <Stat label="Users" value={stats.total} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Posts" value={stats.posts} />
        <Stat label="Videos" value={stats.videos} />
        <Stat label="Flagged" value={stats.flagged} />
      </View>

      <ChartCard title="Users by type"><SimplePieChart data={usersByRole} size={140} /></ChartCard>
      <ChartCard title="Opportunity approval pipeline"><SimpleBarChart data={oppsByStatus} width={chartW} /></ChartCard>
      <ChartCard title="Registrations (last 14 days)"><SimpleLineChart data={registrations} width={chartW} /></ChartCard>

      <View style={{ marginTop: spacing.md }}>
        <ThemedButton title="🛡️ Moderate content" variant="secondary" onPress={() => router.push("/moderation")} />
      </View>
      <View style={{ marginTop: spacing.md }}>
        <ThemedButton title="Sign out" variant="secondary" onPress={handleSignOut} />
      </View>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  stat: {
    flexGrow: 1, minWidth: "30%",
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  statLabel: { color: colors.textDim, fontSize: 11, textTransform: "uppercase" },
  statValue: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
  chartCard: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  chartTitle: { color: colors.text, fontWeight: "700", fontSize: 13, marginBottom: spacing.sm },
});
