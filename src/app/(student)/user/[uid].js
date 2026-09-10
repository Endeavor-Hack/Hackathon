// src/app/(student)/user/[uid].js
// Viewable profile for any other user, respecting per-section visibility.
// Also the surface for endorsing skills and writing recommendations.
import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc, onSnapshot, collection, query, where, addDoc, deleteDoc,
  serverTimestamp, getDocs,
} from "firebase/firestore";
import { db } from "../../../../firebase/config";
import { useAuth } from "../../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../../theme/colors";
import { canView } from "../../../../components/VisibilitySelector";
import { getDisplayName } from "../../../../lib/displayName";
import { createNotification } from "../../../../lib/notify";
import ThemedButton from "../../../../components/ThemedButton";

export default function UserProfileView() {
  const { uid } = useLocalSearchParams();
  const router = useRouter();
  const { firebaseUser, userDoc: me } = useAuth();

  const [profile, setProfile] = useState(null);
  const [endorsements, setEndorsements] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [connectionState, setConnectionState] = useState("none"); // none/pending/accepted
  const [recDraft, setRecDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, "users", uid), (snap) => setProfile(snap.exists() ? snap.data() : null));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "endorsements"), where("toUserId", "==", uid));
    return onSnapshot(q, (snap) => setEndorsements(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "recommendations"), where("toUserId", "==", uid));
    return onSnapshot(q, (snap) => setRecommendations(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [uid]);

  // Are we connected to this user?
  useEffect(() => {
    if (!firebaseUser || !uid || firebaseUser.uid === uid) { setConnectionState("self"); return; }
    (async () => {
      const q1 = query(collection(db, "connections"),
        where("fromUserId", "==", firebaseUser.uid), where("toUserId", "==", uid));
      const q2 = query(collection(db, "connections"),
        where("fromUserId", "==", uid), where("toUserId", "==", firebaseUser.uid));
      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const all = [...s1.docs, ...s2.docs];
      if (all.length === 0) setConnectionState("none");
      else {
        const anyAccepted = all.some((d) => d.data().status === "accepted");
        setConnectionState(anyAccepted ? "accepted" : "pending");
      }
    })();
  }, [firebaseUser, uid]);

  if (!profile) {
    return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>;
  }

  const viewer = {
    isSelf: firebaseUser?.uid === uid,
    isConnected: connectionState === "accepted",
    role: me?.role,
  };
  const vis = profile.visibility || {};

  const endorsementsBySkill = groupBySkill(endorsements);
  const myEndorsedSkills = new Set(
    endorsements.filter((e) => e.fromUserId === firebaseUser?.uid).map((e) => e.skill),
  );

  async function toggleEndorsement(skill) {
    if (viewer.isSelf) return;
    const existing = endorsements.find((e) => e.fromUserId === firebaseUser.uid && e.skill === skill);
    if (existing) {
      await deleteDoc(doc(db, "endorsements", existing.id));
    } else {
      await addDoc(collection(db, "endorsements"), {
        fromUserId: firebaseUser.uid,
        toUserId: uid,
        skill,
        createdAt: serverTimestamp(),
      });
      await createNotification(uid, "endorsement", `${getDisplayName(me)} endorsed you for "${skill}".`);
    }
  }

  async function submitRecommendation() {
    if (!recDraft.trim() || viewer.isSelf) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "recommendations"), {
        fromUserId: firebaseUser.uid,
        fromUserName: getDisplayName(me),
        fromUserRole: me?.role,
        toUserId: uid,
        text: recDraft.trim(),
        createdAt: serverTimestamp(),
      });
      await createNotification(uid, "recommendation", `${getDisplayName(me)} wrote you a recommendation.`);
      setRecDraft("");
    } finally { setBusy(false); }
  }

  async function connect() {
    if (connectionState !== "none") return;
    await addDoc(collection(db, "connections"), {
      fromUserId: firebaseUser.uid,
      toUserId: uid,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    await createNotification(uid, "connection_request",
      `${getDisplayName(me)} sent you a connection request.`);
    setConnectionState("pending");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textDim }}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        {profile.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{(profile.fullName || profile.email || "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={typography.h2}>{getDisplayName(profile)}</Text>
          {profile.headline ? <Text style={typography.bodyDim}>{profile.headline}</Text> : null}
          <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 4 }}>{profile.role}</Text>
        </View>
      </View>

      {!viewer.isSelf && connectionState === "none" && (
        <View style={{ marginTop: spacing.md }}>
          <ThemedButton title="Connect" onPress={connect} />
        </View>
      )}
      {!viewer.isSelf && connectionState === "pending" && (
        <Text style={{ color: colors.textDim, marginTop: spacing.md }}>Connection request pending.</Text>
      )}
      {!viewer.isSelf && connectionState === "accepted" && (
        <View style={{ marginTop: spacing.md }}>
          <ThemedButton title="Message" variant="secondary" onPress={() => router.push(`/conversation?uid=${uid}`)} />
        </View>
      )}

      {canView(vis.summary, viewer) && profile.summary ? (
        <Section title="About"><Text style={styles.body}>{profile.summary}</Text></Section>
      ) : null}

      {canView(vis.contact, viewer) && (
        <Section title="Programme">
          {profile.programme ? <Text style={styles.body}>🎓 {profile.programme}</Text> : null}
          {profile.campus ? <Text style={styles.body}>📍 {profile.campus}</Text> : null}
          {profile.graduationYear ? <Text style={styles.body}>Graduated {profile.graduationYear}</Text> : null}
        </Section>
      )}

      {canView(vis.skills, viewer) && (profile.skills || []).length > 0 && (
        <Section title="Skills">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {profile.skills.map((skill) => {
              const count = endorsementsBySkill[skill]?.length || 0;
              const mine = myEndorsedSkills.has(skill);
              return (
                <TouchableOpacity key={skill} onPress={() => toggleEndorsement(skill)} disabled={viewer.isSelf}
                  style={[styles.skillChip, mine && styles.skillChipEndorsed]}>
                  <Text style={styles.skillChipText}>{skill}</Text>
                  {count > 0 && <Text style={styles.endorseCount}>· {count} ✅</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
          {!viewer.isSelf && <Text style={styles.hint}>Tap a skill to endorse it.</Text>}
        </Section>
      )}

      {canView(vis.experience, viewer) && (profile.workExperience || []).length > 0 && (
        <Section title="Experience">
          {profile.workExperience.map((w, i) => (
            <View key={i} style={styles.line}>
              <Text style={styles.lineTitle}>{w.role || "Role"} · {w.company || "—"}</Text>
              <Text style={styles.lineMeta}>{w.years}</Text>
              {w.description ? <Text style={styles.body}>{w.description}</Text> : null}
            </View>
          ))}
        </Section>
      )}

      {canView(vis.entrepreneurial, viewer) && (profile.entrepreneurial || []).length > 0 && (
        <Section title="Entrepreneurial experience">
          {profile.entrepreneurial.map((e, i) => (
            <View key={i} style={styles.line}>
              <Text style={styles.lineTitle}>{e.name} — {e.role}</Text>
              <Text style={styles.lineMeta}>{e.years}</Text>
              {e.description ? <Text style={styles.body}>{e.description}</Text> : null}
            </View>
          ))}
        </Section>
      )}

      {canView(vis.portfolio, viewer) && (
        <Section title="Portfolio">
          {profile.linkedinUrl ? <Text style={styles.link}>LinkedIn: {profile.linkedinUrl}</Text> : null}
          {profile.githubUrl ? <Text style={styles.link}>GitHub: {profile.githubUrl}</Text> : null}
          {profile.credlyUrl ? <Text style={styles.link}>Credly: {profile.credlyUrl}</Text> : null}
          {(profile.githubProjects || []).map((p, i) => (
            <Text key={i} style={styles.link}>Repo: {p.name} — {p.url}</Text>
          ))}
          {(profile.liveProjects || []).map((p, i) => (
            <Text key={i} style={styles.link}>Live: {p.name} — {p.url}</Text>
          ))}
        </Section>
      )}

      {canView(vis.achievements, viewer) && (
        <>
          {(profile.awards || []).length > 0 && (
            <Section title="Awards">
              {profile.awards.map((a, i) => <Text key={i} style={styles.body}>· {a.name} ({a.year})</Text>)}
            </Section>
          )}
          {(profile.leadership || []).length > 0 && (
            <Section title="Leadership">
              {profile.leadership.map((l, i) => <Text key={i} style={styles.body}>· {l.role} at {l.organisation} ({l.years})</Text>)}
            </Section>
          )}
        </>
      )}

      {canView(vis.clubs, viewer) && (profile.clubs || []).length > 0 && (
        <Section title="Clubs & activities">
          {profile.clubs.map((c, i) => <Text key={i} style={styles.body}>· {c.name} — {c.role} ({c.years})</Text>)}
        </Section>
      )}

      <Section title="Recommendations">
        {recommendations.length === 0 ? (
          <Text style={typography.bodyDim}>No recommendations yet.</Text>
        ) : recommendations.map((r) => (
          <View key={r.id} style={styles.recCard}>
            <Text style={styles.body}>"{r.text}"</Text>
            <Text style={styles.recMeta}>— {r.fromUserName} · {r.fromUserRole}</Text>
          </View>
        ))}
        {!viewer.isSelf && (
          <>
            <TextInput
              value={recDraft}
              onChangeText={setRecDraft}
              placeholder="Write a short recommendation…"
              placeholderTextColor={colors.textDim}
              multiline
              style={styles.recInput}
            />
            <ThemedButton title="Post recommendation" onPress={submitRecommendation} loading={busy} />
          </>
        )}
      </Section>
    </ScrollView>
  );
}

function groupBySkill(endorsements) {
  return endorsements.reduce((acc, e) => {
    acc[e.skill] = acc[e.skill] || [];
    acc[e.skill].push(e);
    return acc;
  }, {});
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 28 },
  section: {
    marginTop: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  sectionTitle: { color: colors.textDim, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm },
  body: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 4 },
  link: { color: colors.accent, fontSize: 13, marginTop: 4 },
  line: { marginTop: spacing.sm },
  lineTitle: { color: colors.text, fontWeight: "700", fontSize: 14 },
  lineMeta: { color: colors.textDim, fontSize: 12 },
  skillChip: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, flexDirection: "row",
  },
  skillChipEndorsed: { borderColor: colors.accent },
  skillChipText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  endorseCount: { color: colors.textDim, fontSize: 12, marginLeft: 4 },
  hint: { color: colors.textDim, fontSize: 11, marginTop: 6 },
  recCard: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm,
  },
  recMeta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  recInput: {
    backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: spacing.sm, minHeight: 60,
    color: colors.text, marginBottom: spacing.sm, textAlignVertical: "top",
  },
});
