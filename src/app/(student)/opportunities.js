// The Opportunities tab. Only approved listings are shown (the
// firestore rules block reads of pending listings from students, so
// this filter is defence in depth rather than the only barrier).
// Above the main list there's a "Recommended for you" strip populated
// by lib/feedRanking.scoreOpportunity — skills overlap + programme +
// campus match, threshold 20.
import { useEffect, useMemo, useState } from "react";
import { View, FlatList, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { getDisplayName } from "../../../lib/displayName";
import { createNotification } from "../../../lib/notify";
import { logSnapshotError } from "../../../lib/handleSnapshotError";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import OpportunityCard from "../../../components/OpportunityCard";
import { scoreOpportunity } from "../../../lib/feedRanking";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "internship", label: "Internships" },
  { key: "learnership", label: "Learnerships" },
  { key: "part-time", label: "Part-time" },
  { key: "graduate", label: "Graduate" },
];

export default function Opportunities() {
  const { firebaseUser, userDoc } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  // Only approved listings are ever shown to students — this is the
  // actual enforcement of "subject to administrator approval before
  // listings go live" from the brief, not just a UI label.
  useEffect(() => {
    const q = query(
      collection(db, "opportunities"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOpportunities(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      logSnapshotError("Opportunities listener error", err);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(collection(db, "applications"), where("studentId", "==", firebaseUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyApplications(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => logSnapshotError("Applications listener error", err));
    return unsubscribe;
  }, [firebaseUser]);

  const appliedOpportunityIds = useMemo(
    () => new Set(myApplications.map((a) => a.opportunityId)),
    [myApplications]
  );

  const scored = useMemo(() => {
    return opportunities.map((o) => ({ ...o, __score: scoreOpportunity(o, userDoc) }));
  }, [opportunities, userDoc]);

  const recommended = useMemo(() => {
    return scored.filter((o) => o.__score >= 20).sort((a, b) => b.__score - a.__score).slice(0, 3);
  }, [scored]);

  const filteredOpportunities = useMemo(() => {
    if (activeFilter === "all") return scored;
    return scored.filter((o) => o.type === activeFilter);
  }, [scored, activeFilter]);

  async function handleApply(opportunity) {
    if (appliedOpportunityIds.has(opportunity.id)) return;
    setApplyingId(opportunity.id);
    try {
      await addDoc(collection(db, "applications"), {
        opportunityId: opportunity.id,
        studentId: firebaseUser.uid,
        studentName: getDisplayName(userDoc),
        status: "applied",
        createdAt: serverTimestamp(),
      });
      // Notify the business that posted it — the "opportunity match /
      // application" side of the real-time notification requirement.
      await createNotification(
        opportunity.businessId,
        "opportunity_match",
        `${getDisplayName(userDoc)} applied to "${opportunity.title}".`,
        opportunity.id
      );
    } catch (err) {
      console.error("Failed to apply:", err.code, err.message);
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOpportunities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        ListHeaderComponent={
          <>
            <Text style={[typography.h1, { marginBottom: spacing.md }]}>Opportunities</Text>

            {recommended.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recommended for you</Text>
                {recommended.map((o) => (
                  <OpportunityCard
                    key={"rec-" + o.id}
                    opportunity={o}
                    hasApplied={appliedOpportunityIds.has(o.id)}
                    applying={applyingId === o.id}
                    onApply={() => handleApply(o)}
                  />
                ))}
                <Text style={styles.sectionTitle}>All opportunities</Text>
              </>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        }
        renderItem={({ item }) => (
          <OpportunityCard
            opportunity={item}
            hasApplied={appliedOpportunityIds.has(item.id)}
            applying={applyingId === item.id}
            onApply={() => handleApply(item)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text style={[typography.bodyDim, { textAlign: "center", marginTop: spacing.xl }]}>
              No opportunities posted yet — check back once employers start listing roles.
            </Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filterChip: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: spacing.sm,
  },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterChipText: { color: colors.textDim, fontSize: 13, fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  sectionTitle: { color: colors.textDim, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.md },
});

