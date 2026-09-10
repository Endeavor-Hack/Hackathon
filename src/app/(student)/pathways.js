// src/app/(student)/pathways.js
// Career pathway explorer. Groups alumni by programme so students can
// see the trajectories of people who studied what they're studying.
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import { logSnapshotError } from "../../../lib/handleSnapshotError";
import { getDisplayName } from "../../../lib/displayName";

export default function CareerPathways() {
  const router = useRouter();
  const { userDoc } = useAuth();
  const myProgramme = userDoc?.programme || "";
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgramme, setSelectedProgramme] = useState(myProgramme);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "alumni"),
      where("status", "==", "active"),
    );
    return onSnapshot(q, (snap) => {
      setAlumni(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { logSnapshotError("Alumni pathways error", err); setLoading(false); });
  }, []);

  const grouped = useMemo(() => {
    const m = {};
    alumni.forEach((a) => {
      const key = (a.programme || "Unspecified programme").trim();
      m[key] = m[key] || [];
      m[key].push(a);
    });
    return m;
  }, [alumni]);

  const programmes = Object.keys(grouped).sort();
  const active = selectedProgramme && grouped[selectedProgramme] ? selectedProgramme : programmes[0];
  const list = active ? grouped[active] : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textDim }}>← Back</Text>
      </TouchableOpacity>

      <Text style={[typography.h1, { marginBottom: spacing.xs }]}>Career pathways</Text>
      <Text style={[typography.bodyDim, { marginBottom: spacing.md }]}>
        See what alumni from your programme have gone on to do.
      </Text>

      {loading ? <ActivityIndicator color={colors.accent} /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {programmes.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setSelectedProgramme(p)}
            style={[styles.chip, active === p && styles.chipActive]}
          >
            <Text style={[styles.chipText, active === p && styles.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {list.length === 0 && !loading && (
        <Text style={typography.bodyDim}>No alumni have added their programme yet.</Text>
      )}

      {list.map((a) => (
        <TouchableOpacity key={a.id} onPress={() => router.push(`/user/${a.id}`)} style={styles.alumniCard}>
          <Text style={styles.name}>{getDisplayName(a)}</Text>
          {a.headline ? <Text style={styles.meta}>{a.headline}</Text> : null}
          {a.graduationYear ? <Text style={styles.meta}>🎓 Graduated {a.graduationYear}</Text> : null}

          <View style={styles.timeline}>
            <Text style={styles.timelineTitle}>Journey</Text>
            {(a.workExperience || []).length === 0 && (
              <Text style={styles.meta}>Alumni hasn't added a work history yet.</Text>
            )}
            {(a.workExperience || []).map((w, i) => (
              <View key={i} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleTitle}>{w.role} · {w.company}</Text>
                  <Text style={styles.meta}>{w.years}</Text>
                </View>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  alumniCard: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  name: { color: colors.text, fontWeight: "700", fontSize: 16 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  timeline: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  timelineTitle: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  timelineRow: { flexDirection: "row", marginBottom: 6 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginRight: 10, marginTop: 6 },
  roleTitle: { color: colors.text, fontWeight: "600", fontSize: 13 },
});
