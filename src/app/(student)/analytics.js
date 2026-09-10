// src/app/(student)/analytics.js
// Student dashboard: distinct from business + admin dashboards, per the
// brief's requirement that each user type gets its own analytics view.
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import SimpleBarChart from "../../../components/charts/SimpleBarChart";
import SimpleLineChart from "../../../components/charts/SimpleLineChart";
import { logSnapshotError } from "../../../lib/handleSnapshotError";

const REQUIRED_FIELDS = [
  "photoUrl", "fullName", "headline", "summary", "programme", "campus",
  "skills", "careerInterests", "linkedinUrl", "githubUrl",
];

export default function StudentAnalytics() {
  const router = useRouter();
  const { firebaseUser, userDoc } = useAuth();
  const [myPosts, setMyPosts] = useState([]);
  const [inboundConnections, setInboundConnections] = useState([]);
  const [outboundConnections, setOutboundConnections] = useState([]);
  const [profileViews, setProfileViews] = useState([]);
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const uPosts = onSnapshot(
      query(collection(db, "posts"), where("authorId", "==", firebaseUser.uid)),
      (s) => setMyPosts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => logSnapshotError("My posts error", e),
    );
    const uOut = onSnapshot(
      query(collection(db, "connections"), where("fromUserId", "==", firebaseUser.uid)),
      (s) => setOutboundConnections(s.docs.map((d) => d.data())),
    );
    const uIn = onSnapshot(
      query(collection(db, "connections"), where("toUserId", "==", firebaseUser.uid)),
      (s) => setInboundConnections(s.docs.map((d) => d.data())),
    );
    const uViews = onSnapshot(
      query(collection(db, "profileViews"), where("profileId", "==", firebaseUser.uid)),
      (s) => setProfileViews(s.docs.map((d) => d.data())),
      () => {}, // profileViews collection may not exist yet — silent
    );
    const uPeers = onSnapshot(
      query(collection(db, "users"),
        where("role", "==", "student"),
        where("status", "==", "active")),
      (s) => { setPeers(s.docs.map((d) => d.data())); setLoading(false); },
    );
    return () => { uPosts(); uOut(); uIn(); uViews(); uPeers(); };
  }, [firebaseUser]);

  const completeness = useMemo(() => {
    if (!userDoc) return 0;
    let filled = 0;
    REQUIRED_FIELDS.forEach((f) => {
      const v = userDoc[f];
      if (Array.isArray(v) ? v.length > 0 : (v && String(v).trim() !== "")) filled++;
    });
    return Math.round((filled / REQUIRED_FIELDS.length) * 100);
  }, [userDoc]);

  const peerAvgCompleteness = useMemo(() => {
    if (peers.length === 0) return 0;
    const scores = peers.map((p) => {
      let filled = 0;
      REQUIRED_FIELDS.forEach((f) => {
        const v = p[f];
        if (Array.isArray(v) ? v.length > 0 : (v && String(v).trim() !== "")) filled++;
      });
      return (filled / REQUIRED_FIELDS.length) * 100;
    });
    return Math.round(scores.reduce((s, x) => s + x, 0) / scores.length);
  }, [peers]);

  const acceptedConnections = useMemo(() => {
    const a = outboundConnections.filter((c) => c.status === "accepted").length;
    const b = inboundConnections.filter((c) => c.status === "accepted").length;
    return a + b;
  }, [inboundConnections, outboundConnections]);

  const postEngagement = useMemo(() => {
    return myPosts.slice(0, 8).map((p, i) => ({
      label: `#${i + 1}`,
      value: (p.likedBy?.length || 0) + Object.values(p.reactions || {}).reduce((s, l) => s + (l?.length || 0), 0),
    }));
  }, [myPosts]);

  const viewsSeries = useMemo(() => {
    // Bucket by day
    const buckets = {};
    profileViews.forEach((v) => {
      const d = v.createdAt?.toDate?.();
      if (!d) return;
      const key = d.toISOString().slice(5, 10);
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets).sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([label, value]) => ({ label, value }));
  }, [profileViews]);

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>;

  const chartWidth = Dimensions.get("window").width - spacing.lg * 2 - spacing.md * 2;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
      <Text style={typography.h1}>Your analytics</Text>
      <Text style={[typography.bodyDim, { marginBottom: spacing.lg }]}>
        See how your profile, connections, and posts are performing.
      </Text>

      <View style={styles.grid}>
        <StatCard label="Profile completeness" value={`${completeness}%`} sub={`Peer avg: ${peerAvgCompleteness}%`} />
        <StatCard label="Profile views" value={profileViews.length} />
        <StatCard label="Connections" value={acceptedConnections} />
        <StatCard label="Posts" value={myPosts.length} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Profile views over time</Text>
        <SimpleLineChart data={viewsSeries} width={chartWidth} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Engagement on your recent posts</Text>
        <SimpleBarChart data={postEngagement} width={chartWidth} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Your skills</Text>
        <Text style={{ color: colors.textDim, fontSize: 12 }}>
          {(userDoc?.skills || []).length === 0 ? "You haven't listed any skills yet." :
            `You've listed ${(userDoc.skills || []).length} skill(s). Skills searched by businesses will appear here once the search index is populated.`}
        </Text>
      </View>

      <Text style={styles.footnote}>
        Note: profile view counts require the "profileViews" collection to be populated as viewers open your profile (small write in user/[uid].js); currently disabled to avoid write cost on every view.
      </Text>
    </ScrollView>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
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
  statSub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  chartCard: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  chartTitle: { color: colors.text, fontWeight: "700", fontSize: 13, marginBottom: spacing.sm },
  footnote: { color: colors.textDim, fontSize: 11, marginTop: spacing.md, fontStyle: "italic" },
});
