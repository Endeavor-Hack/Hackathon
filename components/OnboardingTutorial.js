// The first-time-you-open-the-app walkthrough. Renders on top of the
// tab bar the user landed on rather than replacing it, so they get a
// sense of where they'll end up when they dismiss it. We mark the
// tutorial as seen on the user's doc when they finish (or skip), so
// it never comes back a second time.
import { useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { colors, spacing, typography, radius } from "../theme/colors";
import ThemedButton from "./ThemedButton";
import Logo from "./Logo";

const STEPS = [
  {
    emoji: "🏠",
    title: "Your feed",
    body: "This is your home feed. Posts from people you connect with — students, alumni, and businesses — appear here, ranked by relevance to you.",
  },
  {
    emoji: "🤝",
    title: "Connections",
    body: "Discover people, send connection requests, and accept incoming ones. Only accepted connections can message you.",
  },
  {
    emoji: "💼",
    title: "Opportunities",
    body: "Browse internships, learnerships, part-time and graduate roles. We highlight the ones best matched to your profile.",
  },
  {
    emoji: "📊",
    title: "Your analytics",
    body: "See profile views, connection growth, and how your posts are performing versus your peers.",
  },
  {
    emoji: "🤖",
    title: "AI assistant",
    body: "Tap the AI assistant from the feed for help improving your profile, tips on what to post, and answers to platform questions.",
  },
  {
    emoji: "👤",
    title: "Complete your profile",
    body: "Your profile is your portfolio — add skills, projects, work history, and a photo. Complete profiles get many more views from businesses.",
  },
];

export default function OnboardingTutorial({ uid, visible, onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function finish() {
    try {
      await updateDoc(doc(db, "users", uid), { tutorialSeen: true });
    } catch (err) {
      console.error("Could not mark tutorial seen:", err);
    }
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={{ alignItems: "center", marginBottom: spacing.sm }}>
            <Logo size={36} variant="mark" />
          </View>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          <View style={styles.progressRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <ThemedButton title="Skip" variant="secondary" onPress={finish} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedButton
                title={isLast ? "Get started" : "Next"}
                onPress={() => (isLast ? finish() : setStep(step + 1))}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center", padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.lg, width: "100%", maxWidth: 360,
  },
  emoji: { fontSize: 48, textAlign: "center" },
  title: { ...typography.h2, textAlign: "center", marginTop: spacing.sm },
  body: { color: colors.textDim, textAlign: "center", fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  progressRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, width: 18 },
});
