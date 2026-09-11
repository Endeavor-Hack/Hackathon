// The Feed — the first thing a student sees. Renders (in this order):
//   • Header with brand mark
//   • The latest active announcement (pinned banner)
//   • A horizontal quick-links row (Interview prep, CV checker,
//     Events, Career pathways, DMs, AI assistant, My analytics)
//   • Compose box for text + video posts
//   • The ranked post list (see lib/feedRanking.js)
import { View, FlatList, StyleSheet, Text, ActivityIndicator, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { collection, query, orderBy, onSnapshot, where, limit } from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { getDisplayName } from "../../../lib/displayName";
import { logSnapshotError } from "../../../lib/handleSnapshotError";
import { rankFeed } from "../../../lib/feedRanking";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import CreatePostBox from "../../../components/CreatePostBox";
import PostCard from "../../../components/PostCard";
import Logo from "../../../components/Logo";
import { featureFlags } from "../../../lib/featureFlags";

const ALL_QUICK_LINKS = [
  { icon: "🎤", label: "Interview prep", href: "/interview", requires: "aiFeatures" },
  { icon: "📄", label: "CV checker", href: "/cv-checker", requires: "aiFeatures" },
  { icon: "🤖", label: "AI assistant", href: "/chatbot", requires: "aiFeatures" },
  { icon: "📅", label: "Events", href: "/events" },
  { icon: "🛤️", label: "Career pathways", href: "/pathways" },
  { icon: "💬", label: "Messages", href: "/messages" },
  { icon: "📊", label: "My analytics", href: "/analytics" },
];
const QUICK_LINKS = ALL_QUICK_LINKS.filter(
  (l) => !l.requires || featureFlags[l.requires],
);

export default function Feed() {
  const router = useRouter();
  const { firebaseUser, userDoc } = useAuth();
  const [posts, setPosts] = useState([]);
  const [connectionIds, setConnectionIds] = useState(new Set());
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => { logSnapshotError("Feed listener error", error); setLoading(false); });
  }, []);

  // Build the connection set so the feed ranker can weight posts from
  // people the user is actually connected to.
  useEffect(() => {
    if (!firebaseUser) return;
    const q1 = query(collection(db, "connections"), where("fromUserId", "==", firebaseUser.uid));
    const q2 = query(collection(db, "connections"), where("toUserId", "==", firebaseUser.uid));
    const acc = { out: [], in: [] };
    const commit = () => {
      const ids = new Set();
      acc.out.filter((c) => c.status === "accepted").forEach((c) => ids.add(c.toUserId));
      acc.in.filter((c) => c.status === "accepted").forEach((c) => ids.add(c.fromUserId));
      setConnectionIds(ids);
    };
    const u1 = onSnapshot(q1, (s) => { acc.out = s.docs.map((d) => d.data()); commit(); });
    const u2 = onSnapshot(q2, (s) => { acc.in = s.docs.map((d) => d.data()); commit(); });
    return () => { u1(); u2(); };
  }, [firebaseUser]);

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(1));
    return onSnapshot(q, (snap) => {
      const [top] = snap.docs;
      if (top) setAnnouncement({ id: top.id, ...top.data() });
    });
  }, []);

  const ranked = useMemo(() => rankFeed(posts, {
    myUid: firebaseUser?.uid,
    role: userDoc?.role,
    connectionIds,
  }), [posts, firebaseUser, userDoc, connectionIds]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        data={ranked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
              <Text style={typography.h1}>Home Feed</Text>
              <Logo size={32} variant="mark" />
            </View>

            {announcement && (
              <View style={styles.announcement}>
                <Text style={styles.annTitle}>📣 {announcement.title}</Text>
                <Text style={styles.annBody}>{announcement.body}</Text>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {QUICK_LINKS.map((l) => (
                <TouchableOpacity key={l.href} onPress={() => router.push(l.href)} style={styles.quickLink}>
                  <Text style={{ fontSize: 20 }}>{l.icon}</Text>
                  <Text style={styles.quickLinkText}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <CreatePostBox firebaseUser={firebaseUser} userDoc={userDoc} />
          </>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={firebaseUser?.uid}
            currentUserName={getDisplayName(userDoc)}
            currentUserPhotoUrl={userDoc?.photoUrl}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text style={[typography.bodyDim, { textAlign: "center", marginTop: spacing.xl }]}>
              No posts yet — be the first to share something.
            </Text>
          )
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: spacing.lg, flexGrow: 1 },
  announcement: {
    backgroundColor: colors.panel, borderLeftWidth: 3, borderLeftColor: colors.accent,
    borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md,
  },
  annTitle: { color: colors.text, fontWeight: "700", fontSize: 14 },
  annBody: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  quickLink: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.sm, marginRight: spacing.sm,
    alignItems: "center", minWidth: 84,
  },
  quickLinkText: { color: colors.textDim, fontSize: 11, marginTop: 4, fontWeight: "600" },
});
