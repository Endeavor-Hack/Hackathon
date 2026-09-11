// Institutional events feed. Only admins can create events (see the
// admin panel); students read them here. Events with `targetProgrammes`
// matching the current user's programme get an accent border and
// float to the top. The notification fan-out happens at publish
// time in the admin screen, not here.
import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import { logSnapshotError } from "../../../lib/handleSnapshotError";

export default function Events() {
  const { userDoc } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    return onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { logSnapshotError("Events error", err); setLoading(false); });
  }, []);

  // Highlight events targeted to this user's programme (or that target
  // everyone). Older past events fall to the bottom.
  const sorted = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return events
      .map((e) => {
        const targeted = !e.targetProgrammes?.length
          || e.targetProgrammes.includes(userDoc?.programme);
        const isFuture = (e.date || "9999") >= today;
        return { ...e, targeted, isFuture };
      })
      .sort((a, b) => (a.isFuture !== b.isFuture) ? (a.isFuture ? -1 : 1) : (a.date > b.date ? 1 : -1));
  }, [events, userDoc]);

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={
          <Text style={[typography.h1, { marginBottom: spacing.md }]}>Events</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.targeted && styles.cardTargeted, !item.isFuture && styles.cardPast]}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{item.title}</Text>
              {item.targeted && <View style={styles.badge}><Text style={styles.badgeText}>For you</Text></View>}
            </View>
            <Text style={styles.meta}>📅 {item.date}{item.location ? `  ·  📍 ${item.location}` : ""}</Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            {item.targetProgrammes?.length > 0 && (
              <Text style={styles.programmes}>
                Programmes: {item.targetProgrammes.join(", ")}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} /> :
          <Text style={[typography.bodyDim, { textAlign: "center", marginTop: spacing.xl }]}>
            No events posted yet — check back soon.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  cardTargeted: { borderColor: colors.accent },
  cardPast: { opacity: 0.55 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontWeight: "700", fontSize: 15, flex: 1 },
  badge: { backgroundColor: colors.accent, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.full },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  desc: { color: colors.text, fontSize: 13, marginTop: spacing.sm, lineHeight: 18 },
  programmes: { color: colors.textDim, fontSize: 11, marginTop: spacing.sm, fontStyle: "italic" },
});
