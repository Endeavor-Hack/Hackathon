// Interview Prep. A three-stage flow — setup → per-question with
// per-answer AI feedback → session summary — collapsed into one
// route with a `stage` state machine. Feels like three screens
// without polluting the navigation stack with three separate URLs.
import { useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../firebase/config";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import ThemedButton from "../../../components/ThemedButton";

const ROLES = [
  "Software Engineer", "Data Analyst", "Marketing Graduate",
  "Finance Graduate", "UX/UI Designer",
];
const TYPES = [
  { key: "behavioral", label: "Behavioral" },
  { key: "technical", label: "Technical" },
  { key: "mixed", label: "Mixed" },
];
const COUNTS = [3, 5, 8];

export default function InterviewPrep() {
  const router = useRouter();

  const [stage, setStage] = useState("home"); // home | interview | summary
  const [role, setRole] = useState("Software Engineer");
  const [customRole, setCustomRole] = useState("");
  const [type, setType] = useState("behavioral");
  const [count, setCount] = useState(5);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState([]); // {question, answer, clarity, relevance, feedback}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startInterview() {
    setError("");
    const finalRole = role === "Custom role..." ? customRole.trim() : role;
    if (!finalRole) { setError("Please pick or enter a target role."); return; }

    setBusy(true);
    try {
      const call = httpsCallable(functions, "generateInterviewQuestions");
      const res = await call({ role: finalRole, type, count });
      const qs = res.data.questions || [];
      if (qs.length === 0) throw new Error("The AI returned no questions.");
      setQuestions(qs);
      setCurrentIndex(0);
      setAnswer("");
      setHistory([]);
      setStage("interview");
    } catch (err) {
      setError(err.message || "Could not start the mock interview.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) { setError("Type an answer before submitting."); return; }
    setError("");
    setBusy(true);
    try {
      const call = httpsCallable(functions, "getInterviewFeedback");
      const res = await call({ question: questions[currentIndex], answer });
      const entry = {
        question: questions[currentIndex],
        answer,
        clarity: res.data.clarity,
        relevance: res.data.relevance,
        feedback: res.data.feedback,
      };
      const nextHistory = [...history, entry];
      setHistory(nextHistory);

      if (currentIndex + 1 >= questions.length) {
        setStage("summary");
      } else {
        setCurrentIndex(currentIndex + 1);
        setAnswer("");
      }
    } catch (err) {
      setError(err.message || "Could not get feedback.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStage("home");
    setQuestions([]);
    setHistory([]);
    setAnswer("");
    setError("");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={typography.h2}>🎤 Interview Prep</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
        {stage === "home" && (
          <HomeStage
            role={role} setRole={setRole}
            customRole={customRole} setCustomRole={setCustomRole}
            type={type} setType={setType}
            count={count} setCount={setCount}
            busy={busy} error={error}
            onStart={startInterview}
          />
        )}

        {stage === "interview" && (
          <InterviewStage
            questions={questions}
            currentIndex={currentIndex}
            answer={answer} setAnswer={setAnswer}
            latestFeedback={history[history.length - 1]}
            busy={busy} error={error}
            onSubmit={submitAnswer}
            onCancel={reset}
          />
        )}

        {stage === "summary" && (
          <SummaryStage history={history} onReset={reset} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HomeStage({ role, setRole, customRole, setCustomRole, type, setType, count, setCount, busy, error, onStart }) {
  return (
    <>
      <Text style={typography.h1}>Mock Interview Setup</Text>
      <Text style={[typography.bodyDim, { marginBottom: spacing.md }]}>
        Choose a role and style — Claude will generate a practice session.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Target role</Text>
        <View style={styles.chipRow}>
          {[...ROLES, "Custom role..."].map((r) => (
            <TouchableOpacity key={r} onPress={() => setRole(r)}
              style={[styles.chip, role === r && styles.chipActive]}>
              <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {role === "Custom role..." && (
          <>
            <Text style={styles.label}>Custom role title</Text>
            <TextInput
              value={customRole} onChangeText={setCustomRole}
              style={styles.input} placeholder="e.g. Junior DevOps Engineer"
              placeholderTextColor={colors.textDim}
            />
          </>
        )}

        <Text style={styles.label}>Interview type</Text>
        <View style={styles.chipRow}>
          {TYPES.map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setType(t.key)}
              style={[styles.chip, type === t.key && styles.chipActive]}>
              <Text style={[styles.chipText, type === t.key && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Number of questions</Text>
        <View style={styles.chipRow}>
          {COUNTS.map((c) => (
            <TouchableOpacity key={c} onPress={() => setCount(c)}
              style={[styles.chip, count === c && styles.chipActive]}>
              <Text style={[styles.chipText, count === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <View style={{ marginTop: spacing.md }}>
          <ThemedButton title="Start Mock Interview" onPress={onStart} loading={busy} />
        </View>
      </View>
    </>
  );
}

function InterviewStage({ questions, currentIndex, answer, setAnswer, latestFeedback, busy, error, onSubmit, onCancel }) {
  const progress = ((currentIndex) / questions.length) * 100;
  const showingFeedback = latestFeedback && latestFeedback.question === questions[currentIndex] && !busy;

  return (
    <>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.qCount}>Question {currentIndex + 1} of {questions.length}</Text>

      <View style={styles.card}>
        <Text style={styles.questionText}>{questions[currentIndex]}</Text>

        <Text style={styles.label}>Your answer</Text>
        <TextInput
          value={answer} onChangeText={setAnswer}
          style={[styles.input, styles.multi]} multiline
          placeholder="Type or paste your response here..."
          placeholderTextColor={colors.textDim}
          editable={!showingFeedback}
        />

        {busy && <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.sm }} />}
        {error ? <Text style={styles.err}>{error}</Text> : null}

        {showingFeedback && (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackLabel}>AI feedback</Text>
            <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm }}>
              <MiniScore label="Clarity" value={latestFeedback.clarity} />
              <MiniScore label="Relevance" value={latestFeedback.relevance} />
            </View>
            <Text style={styles.feedbackText}>{latestFeedback.feedback}</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
          <View style={{ flex: 1 }}>
            <ThemedButton title="Cancel" variant="secondary" onPress={onCancel} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedButton title="Submit Answer" onPress={onSubmit} loading={busy} />
          </View>
        </View>
      </View>
    </>
  );
}

function SummaryStage({ history, onReset }) {
  const avg = (key) => history.length ? Math.round(history.reduce((s, h) => s + (h[key] || 0), 0) / history.length) : 0;
  const overall = Math.round((avg("clarity") + avg("relevance")) / 2);
  return (
    <>
      <Text style={typography.h1}>Session Summary</Text>
      <Text style={[typography.bodyDim, { marginBottom: spacing.md }]}>Here's how the mock interview went.</Text>

      <View style={styles.scoreRow}>
        <BigScore label="Overall" value={overall} />
        <BigScore label="Clarity" value={avg("clarity")} />
        <BigScore label="Relevance" value={avg("relevance")} />
      </View>

      <View style={styles.card}>
        <Text style={styles.h}>Question review</Text>
        {history.map((h, i) => (
          <View key={i} style={styles.historyItem}>
            <Text style={styles.qTitle}>Q{i + 1}. {h.question}</Text>
            <Text style={styles.qAnswer}>You: {h.answer}</Text>
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: 6 }}>
              <MiniScore label="Clarity" value={h.clarity} />
              <MiniScore label="Relevance" value={h.relevance} />
            </View>
            <Text style={styles.qFeedback}>{h.feedback}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: spacing.md }}>
        <ThemedButton title="Start a new session" onPress={onReset} />
      </View>
    </>
  );
}

function MiniScore({ label, value }) {
  return (
    <View style={styles.miniScore}>
      <Text style={styles.miniScoreLabel}>{label}</Text>
      <Text style={styles.miniScoreValue}>{value ?? "-"}<Text style={styles.miniScoreOf}>/10</Text></Text>
    </View>
  );
}
function BigScore({ label, value }) {
  return (
    <View style={styles.bigScore}>
      <Text style={styles.bigScoreValue}>{value || "-"}</Text>
      <Text style={styles.bigScoreLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.textDim, fontSize: 24 },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  label: { color: colors.textDim, fontSize: 12, marginTop: spacing.sm, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 10,
    color: colors.text, fontSize: 14,
  },
  multi: { minHeight: 120, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: colors.panelLight, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  err: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  progressBar: { height: 6, backgroundColor: colors.panel, borderRadius: 3, overflow: "hidden", marginBottom: spacing.sm },
  progressFill: { height: 6, backgroundColor: colors.accent },
  qCount: { color: colors.textDim, fontSize: 12, marginBottom: spacing.sm },
  questionText: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: "600", marginBottom: spacing.sm },
  feedbackBox: {
    backgroundColor: colors.panelLight, borderRadius: radius.sm,
    padding: spacing.sm, marginTop: spacing.md,
    borderLeftWidth: 3, borderLeftColor: colors.accent,
  },
  feedbackLabel: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  feedbackText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  miniScore: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  miniScoreLabel: { color: colors.textDim, fontSize: 11 },
  miniScoreValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  miniScoreOf: { color: colors.textDim, fontSize: 11, fontWeight: "400" },
  scoreRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  bigScore: {
    flex: 1, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, alignItems: "center",
  },
  bigScoreValue: { color: colors.accent, fontSize: 32, fontWeight: "800" },
  bigScoreLabel: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 },
  h: { color: colors.text, fontWeight: "700", fontSize: 15, marginBottom: spacing.sm },
  historyItem: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  qTitle: { color: colors.text, fontWeight: "700", fontSize: 13 },
  qAnswer: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  qFeedback: { color: colors.text, fontSize: 12, marginTop: 6, fontStyle: "italic" },
});
