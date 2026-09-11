// src/app/(business)/candidates.js
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import {
  collection, query, where, onSnapshot, doc, getDoc, updateDoc, serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import { logSnapshotError } from "../../../lib/handleSnapshotError";
import { getDisplayName } from "../../../lib/displayName";
import { createNotification } from "../../../lib/notify";
import UserRow from "../../../components/UserRow";
import { canView } from "../../../components/VisibilitySelector";

const APP_STATUSES = ["applied", "shortlisted", "rejected", "hired"];

export default function Candidates() {
  const { firebaseUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedListing, setSelectedListing] = useState("all");
  const [profileCache, setProfileCache] = useState({});
  const [previewUid, setPreviewUid] = useState(null);
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
    if (listings.length === 0) { setApplications([]); return; }
    const ids = listings.map((l) => l.id).slice(0, 10);
    const q = query(collection(db, "applications"), where("opportunityId", "in", ids));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setApplications(list);
    }, (err) => logSnapshotError("Applications error", err));
  }, [listings]);

  async function ensureProfile(uid) {
    if (profileCache[uid]) return;
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) setProfileCache((prev) => ({ ...prev, [uid]: snap.data() }));
    } catch (err) {
      console.error("Profile fetch failed", err);
    }
  }

  useEffect(() => {
    applications.forEach((a) => ensureProfile(a.studentId));
  }, [applications]);

  const filtered = useMemo(() => {
    if (selectedListing === "all") return applications;
    return applications.filter((a) => a.opportunityId === selectedListing);
  }, [applications, selectedListing]);

  async function setAppStatus(app, status) {
    await updateDoc(doc(db, "applications", app.id), { status, statusChangedAt: serverTimestamp() });
    await createNotification(
      app.studentId,
      "application_status",
      `Your application was marked "${status}".`,
      app.opportunityId,
    );
  }

  const previewProfile = previewUid ? profileCache[previewUid] : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
        <Text style={[typography.h1, { marginBottom: spacing.md }]}>Candidates</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <FilterChip label="All" active={selectedListing === "all"} onPress={() => setSelectedListing("all")} />
          {listings.map((l) => (
            <FilterChip key={l.id} label={l.title} active={selectedListing === l.id} onPress={() => setSelectedListing(l.id)} />
          ))}
        </ScrollView>

        {loading ? <ActivityIndicator color={colors.accent} /> : null}
        {!loading && filtered.length === 0 && <Text style={typography.bodyDim}>No applications yet for this filter.</Text>}

        {filtered.map((a) => {
          const profile = profileCache[a.studentId];
          return (
            <View key={a.id} style={styles.card}>
              <TouchableOpacity onPress={() => setPreviewUid(previewUid === a.studentId ? null : a.studentId)}>
                <UserRow
                  uid={a.studentId}
                  photoUrl={profile?.photoUrl}
                  name={profile ? getDisplayName(profile) : a.studentName}
                  role={profile?.role || "student"}
                />
              </TouchableOpacity>
              <View style={styles.appRow}>
                <View style={[styles.statusBadge, statusColor(a.status)]}>
                  <Text style={styles.statusText}>{a.status}</Text>
                </View>
                <View style={styles.actions}>
                  {APP_STATUSES.filter((s) => s !== a.status).map((s) => (
                    <TouchableOpacity key={s} onPress={() => setAppStatus(a, s)} style={styles.actionBtn}>
                      <Text style={styles.actionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {previewUid === a.studentId && previewProfile && (
                <ProfilePreview profile={previewProfile} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// A minimal profile view respecting the student's visibility settings.
// Businesses see anything marked public or businesses; connections-only
// sections are hidden from businesses.
function ProfilePreview({ profile }) {
  const viewer = { isSelf: false, isConnected: false, role: "business" };
  const vis = profile.visibility || {};
  return (
    <View style={styles.preview}>
      <Text style={styles.previewName}>{profile.fullName || profile.email}</Text>
      {profile.headline ? <Text style={styles.previewMeta}>{profile.headline}</Text> : null}
      {profile.programme ? <Text style={styles.previewMeta}>🎓 {profile.programme}{profile.campus ? ` · ${profile.campus}` : ""}</Text> : null}

      {canView(vis.summary, viewer) && profile.summary ? <Text style={styles.previewBody}>{profile.summary}</Text> : null}

      {canView(vis.skills, viewer) && (profile.skills || []).length > 0 && (
        <>
          <Text style={styles.sectionH}>Skills</Text>
          <Text style={styles.previewMeta}>{profile.skills.join(", ")}</Text>
        </>
      )}

      {canView(vis.experience, viewer) && (profile.workExperience || []).length > 0 && (
        <>
          <Text style={styles.sectionH}>Experience</Text>
          {profile.workExperience.map((w, i) => (
            <Text key={i} style={styles.previewMeta}>· {w.role || "Role"} @ {w.company || "—"} ({w.years || "—"})</Text>
          ))}
        </>
      )}

      {canView(vis.portfolio, viewer) && (profile.githubProjects || []).length > 0 && (
        <>
          <Text style={styles.sectionH}>Projects</Text>
          {profile.githubProjects.map((p, i) => (
            <Text key={i} style={styles.previewMeta}>· {p.name}: {p.url}</Text>
          ))}
        </>
      )}
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
function statusColor(status) {
  if (status === "shortlisted") return { borderColor: colors.accent };
  if (status === "hired") return { borderColor: colors.good };
  if (status === "rejected") return { borderColor: colors.danger };
  return { borderColor: colors.warn };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm,
  },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  appRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: spacing.sm, gap: 6 },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.full, borderWidth: 1 },
  statusText: { color: colors.text, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  actions: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  actionBtn: { backgroundColor: colors.panelLight, paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.sm },
  actionText: { color: colors.text, fontSize: 11 },
  preview: {
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  previewName: { color: colors.text, fontWeight: "700", fontSize: 15 },
  previewMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  previewBody: { color: colors.text, fontSize: 13, lineHeight: 18, marginTop: spacing.sm },
  sectionH: { color: colors.text, fontWeight: "700", fontSize: 13, marginTop: spacing.sm },
});
