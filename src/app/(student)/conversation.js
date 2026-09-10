// src/app/(student)/conversation.js
import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
  FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc, setDoc, updateDoc, serverTimestamp, collection, query, orderBy,
  onSnapshot, addDoc, getDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import { getDisplayName } from "../../../lib/displayName";
import { createNotification } from "../../../lib/notify";
import { conversationIdFor } from "../../../lib/conversationId";
import { logSnapshotError } from "../../../lib/handleSnapshotError";

export default function Conversation() {
  const { uid: otherUid } = useLocalSearchParams();
  const router = useRouter();
  const { firebaseUser, userDoc: me } = useAuth();
  const listRef = useRef();

  const convId = firebaseUser && otherUid ? conversationIdFor(firebaseUser.uid, otherUid) : null;
  const [messages, setMessages] = useState([]);
  const [other, setOther] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!otherUid) return;
    getDoc(doc(db, "users", otherUid)).then((s) => setOther(s.exists() ? s.data() : null));
  }, [otherUid]);

  useEffect(() => {
    if (!convId) return;
    const q = query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }, (err) => logSnapshotError("Messages error", err));
  }, [convId]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      // Ensure conversation doc exists first (with participants array),
      // otherwise the message write will fail the security rules check
      // that reads participants.
      await setDoc(doc(db, "conversations", convId), {
        participants: [firebaseUser.uid, otherUid].sort(),
        lastMessage: text,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await addDoc(collection(db, "conversations", convId, "messages"), {
        fromUserId: firebaseUser.uid,
        text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "conversations", convId), {
        lastMessage: text,
        updatedAt: serverTimestamp(),
      });
      await createNotification(otherUid, "message", `${getDisplayName(me)}: ${text.slice(0, 60)}`, convId);
      setDraft("");
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  }

  if (!firebaseUser || !otherUid) {
    return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={typography.h2}>{other ? getDisplayName(other) : "…"}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => {
          const mine = item.fromUserId === firebaseUser.uid;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={{ color: mine ? "#fff" : colors.text }}>{item.text}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor={colors.textDim}
          multiline
        />
        <TouchableOpacity onPress={send} disabled={sending || !draft.trim()} style={styles.sendBtn}>
          <Text style={styles.sendBtnText}>{sending ? "…" : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.textDim, fontSize: 24 },
  bubble: { padding: spacing.sm, borderRadius: radius.md, marginBottom: 6, maxWidth: "80%" },
  mine: { alignSelf: "flex-end", backgroundColor: colors.accent },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  inputRow: {
    flexDirection: "row", padding: spacing.sm, gap: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.panel,
  },
  input: {
    flex: 1, backgroundColor: colors.panelLight,
    borderRadius: radius.sm, padding: spacing.sm,
    color: colors.text, maxHeight: 100,
  },
  sendBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing.md, justifyContent: "center" },
  sendBtnText: { color: "#fff", fontWeight: "700" },
});
