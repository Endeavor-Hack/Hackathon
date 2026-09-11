// One post on the feed — author strip, body, optional video, four
// reaction buttons, and a collapsible comment thread. Also handles
// deleting your own posts, deleting comments (author OR post owner),
// and creating the "post_reaction" / "post_comment" notifications.
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Image, Linking } from "react-native";
import {
  doc, updateDoc, deleteDoc, arrayUnion, arrayRemove,
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../firebase/config";
import { colors, spacing, radius } from "../theme/colors";
import { createNotification } from "../lib/notify";
import Avatar from "./Avatar";

const REACTIONS = [
  { key: "like", icon: "👍" },
  { key: "celebrate", icon: "🎉" },
  { key: "insightful", icon: "💡" },
  { key: "support", icon: "🤝" },
];

function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ROLE_LABELS = { student: "Student", alumni: "Alumni", business: "Business" };

export default function PostCard({ post, currentUserId, currentUserName, currentUserPhotoUrl }) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState("");

  // Load comments only when expanded — cheap for busy feeds
  useEffect(() => {
    if (!showComments) return;
    const q = query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [showComments, post.id]);

  const reactions = post.reactions || { like: post.likedBy || [] };

  async function react(key) {
    const list = reactions[key] || [];
    const nowReacting = !list.includes(currentUserId);
    const nextList = nowReacting ? [...list, currentUserId] : list.filter((u) => u !== currentUserId);
    const patch = { [`reactions.${key}`]: nextList };
    if (key === "like") patch.likedBy = nextList; // keep legacy field in sync
    await updateDoc(doc(db, "posts", post.id), patch);
    if (nowReacting && post.authorId !== currentUserId) {
      await createNotification(post.authorId, "post_reaction",
        `${currentUserName || "Someone"} reacted to your post.`, post.id);
    }
  }

  async function submitComment() {
    if (!draft.trim()) return;
    await addDoc(collection(db, "posts", post.id, "comments"), {
      authorId: currentUserId,
      authorName: currentUserName || "Anonymous",
      authorPhotoUrl: currentUserPhotoUrl || null,
      text: draft.trim(),
      createdAt: serverTimestamp(),
    });
    if (post.authorId !== currentUserId) {
      await createNotification(post.authorId, "post_comment",
        `${currentUserName || "Someone"} commented on your post.`, post.id);
    }
    setDraft("");
  }

  function confirmDeleteComment(commentId) {
    Alert.alert("Delete comment?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => deleteDoc(doc(db, "posts", post.id, "comments", commentId)),
      },
    ]);
  }

  const createdDate = post.createdAt?.toDate ? post.createdAt.toDate() : null;
  const isOwnPost = post.authorId === currentUserId;
  const totalReactions = Object.values(reactions).reduce((n, l) => n + (l?.length || 0), 0);

  function confirmDelete() {
    Alert.alert("Delete post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteDoc(doc(db, "posts", post.id)) },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push(`/user/${post.authorId}`)} style={{ marginRight: spacing.sm }}>
          <Avatar uid={post.authorId} name={post.authorName} photoUrl={post.authorPhotoUrl} size={40} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{post.authorName || "Unknown"}</Text>
          <Text style={styles.meta}>
            {ROLE_LABELS[post.authorRole] || post.authorRole} · {timeAgo(createdDate)}
          </Text>
        </View>
        {isOwnPost && (
          <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.postText}>{post.text}</Text>

      {post.videoStatus === "processing" && !post.videoUrl && (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderText}>🎬 Video is transcoding — will appear here shortly.</Text>
        </View>
      )}

      {post.videoThumbnailUrl && post.videoUrl && (
        <TouchableOpacity
          onPress={() => Linking.openURL(post.videoUrl).catch(() => Alert.alert("Couldn't open video"))}
          activeOpacity={0.85}
        >
          <View>
            <Image source={{ uri: post.videoThumbnailUrl }} style={styles.thumb} />
            <View style={styles.playOverlay}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Fallback: video is ready but no thumbnail generated. */}
      {post.videoUrl && !post.videoThumbnailUrl && (
        <TouchableOpacity
          onPress={() => Linking.openURL(post.videoUrl).catch(() => Alert.alert("Couldn't open video"))}
          style={styles.videoPlaceholder}
        >
          <Text style={styles.videoPlaceholderText}>🎬 Tap to play video</Text>
        </TouchableOpacity>
      )}

      <View style={styles.reactionsRow}>
        {REACTIONS.map((r) => {
          const list = reactions[r.key] || [];
          const active = list.includes(currentUserId);
          return (
            <TouchableOpacity key={r.key} onPress={() => react(r.key)} style={[styles.reactionBtn, active && styles.reactionBtnActive]}>
              <Text style={styles.reactionIcon}>{r.icon}</Text>
              {list.length > 0 && <Text style={styles.reactionCount}>{list.length}</Text>}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => setShowComments((v) => !v)} style={styles.commentToggle}>
          <Text style={styles.commentToggleText}>💬 {showComments ? "Hide" : "Comment"}</Text>
        </TouchableOpacity>
      </View>

      {totalReactions > 0 && (
        <Text style={styles.summary}>{totalReactions} reaction{totalReactions === 1 ? "" : "s"}</Text>
      )}

      {showComments && (
        <View style={styles.commentsSection}>
          {comments.map((c) => {
            const canDelete = c.authorId === currentUserId || isOwnPost;
            return (
              <View key={c.id} style={styles.comment}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <Avatar uid={c.authorId} name={c.authorName} photoUrl={c.authorPhotoUrl} size={28} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentAuthor}>{c.authorName}</Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                  {canDelete && (
                    <TouchableOpacity
                      onPress={() => confirmDeleteComment(c.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ paddingLeft: 8 }}
                    >
                      <Text style={styles.commentDelete}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          <View style={styles.commentComposer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textDim}
              style={styles.commentInput}
            />
            <TouchableOpacity onPress={submitComment} disabled={!draft.trim()}>
              <Text style={[styles.commentSend, !draft.trim() && { opacity: 0.4 }]}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent, justifyContent: "center", alignItems: "center", marginRight: spacing.sm,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  authorName: { color: colors.text, fontWeight: "700", fontSize: 14 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 1 },
  postText: { color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  thumb: { width: "100%", height: 200, borderRadius: radius.sm, marginBottom: spacing.sm, backgroundColor: colors.panelLight },
  playOverlay: {
    position: "absolute", inset: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: radius.sm,
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.sm,
  },
  playIcon: {
    color: "#fff", fontSize: 44, textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6,
  },
  videoPlaceholder: {
    backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm,
    alignItems: "center",
  },
  videoPlaceholderText: { color: colors.textDim, fontSize: 13, fontStyle: "italic" },
  reactionsRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  reactionBtn: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 4, paddingHorizontal: 8,
    backgroundColor: colors.panelLight, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  reactionBtnActive: { borderColor: colors.accent, backgroundColor: colors.panel },
  reactionIcon: { fontSize: 14 },
  reactionCount: { color: colors.textDim, fontSize: 12, marginLeft: 4 },
  commentToggle: { marginLeft: 4, paddingVertical: 4, paddingHorizontal: 8 },
  commentToggleText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  summary: { color: colors.textDim, fontSize: 11, marginTop: spacing.sm },
  commentsSection: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  comment: { marginBottom: 6 },
  commentAuthor: { color: colors.text, fontWeight: "700", fontSize: 12 },
  commentText: { color: colors.text, fontSize: 13 },
  commentDelete: { fontSize: 13, opacity: 0.6 },
  commentComposer: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm },
  commentInput: { flex: 1, backgroundColor: colors.panelLight, borderRadius: radius.sm, padding: 8, color: colors.text },
  commentSend: { color: colors.accent, fontWeight: "700", paddingHorizontal: 4 },
  deleteIcon: { fontSize: 16, opacity: 0.7 },
});
