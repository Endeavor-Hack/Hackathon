// The AI profile assistant. Everything you type here goes through
// the chatWithAssistant Cloud Function, which loads your own user
// doc as context before asking the model — so its advice about
// improving your headline or filling in your work history is
// actually about you, not generic career-coach filler.
import { useRef, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
  FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../firebase/config";
import { colors, spacing, typography, radius } from "../../../theme/colors";

const STARTERS = [
  "How can I improve my profile?",
  "What should I post to attract employers?",
  "Suggest 3 skills I should add.",
  "How do I get more meaningful connections?",
];

export default function Chatbot() {
  const router = useRouter();
  const listRef = useRef();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(text) {
    const userMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const call = httpsCallable(functions, "chatWithAssistant");
      const res = await call({ messages: next.map(({ role, content }) => ({ role, content })) });
      setMessages([...next, { role: "assistant", content: res.data.reply }]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      setError(err.message || "AI is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={typography.h2}>🤖 AI assistant</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: spacing.md }}
        ListHeaderComponent={
          messages.length === 0 ? (
            <View>
              <Text style={styles.intro}>
                Hi 👋 I'm your Endeavour assistant. I can help you improve your profile,
                figure out what to post, or answer questions about the platform. Try one:
              </Text>
              {STARTERS.map((s) => (
                <TouchableOpacity key={s} style={styles.starter} onPress={() => send(s)}>
                  <Text style={styles.starterText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.mine : styles.theirs]}>
            <Text style={{ color: item.role === "user" ? "#fff" : colors.text }}>{item.content}</Text>
          </View>
        )}
        ListFooterComponent={
          <>
            {busy && <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.sm }} />}
            {error ? <Text style={styles.err}>{error}</Text> : null}
          </>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
          placeholder="Ask about your profile, opportunities, posting…"
          placeholderTextColor={colors.textDim}
          multiline
        />
        <TouchableOpacity onPress={() => send(draft.trim())} disabled={busy || !draft.trim()} style={styles.sendBtn}>
          <Text style={styles.sendBtnText}>{busy ? "…" : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.textDim, fontSize: 24 },
  intro: { color: colors.textDim, fontSize: 14, marginBottom: spacing.md, lineHeight: 20 },
  starter: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm,
  },
  starterText: { color: colors.accent, fontWeight: "600" },
  bubble: { padding: spacing.sm, borderRadius: radius.md, marginBottom: 8, maxWidth: "88%" },
  mine: { alignSelf: "flex-end", backgroundColor: colors.accent },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  err: { color: colors.danger, marginTop: spacing.sm },
  inputRow: {
    flexDirection: "row", padding: spacing.sm, gap: 8,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.panel,
  },
  input: {
    flex: 1, backgroundColor: colors.panelLight,
    borderRadius: radius.sm, padding: spacing.sm,
    color: colors.text, maxHeight: 120,
  },
  sendBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing.md, justifyContent: "center" },
  sendBtnText: { color: "#fff", fontWeight: "700" },
});
