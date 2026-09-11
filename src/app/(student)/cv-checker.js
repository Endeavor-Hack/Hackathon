// CV Checker. Two paths to the same result:
//   1) Reuse the CV that's already on your profile (fast, one tap).
//   2) Upload a fresh PDF just for the check — goes to
//      cvs/{uid}/adhoc/{ts}.pdf so it doesn't overwrite the
//      profile CV.
// Either way, the analyzeCv Cloud Function returns a score + strengths
// + specific recommendations, which we render as-is.
import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import * as DocumentPicker from "expo-document-picker";
import { functions, storage } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import ThemedButton from "../../../components/ThemedButton";
import { uriToBlob } from "../../../lib/uriToBlob";

export default function CVChecker() {
  const router = useRouter();
  const { firebaseUser, userDoc } = useAuth();
  const uid = firebaseUser?.uid;
  const profileCvPath = userDoc?.cvPath || null;
  const profileCvName = userDoc?.cvName || null;

  const [selected, setSelected] = useState(null); // {name, path}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // {score, strengths, recommendations}

  async function pickFile() {
    setError("");
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const path = `cvs/${uid}/adhoc/${Date.now()}.pdf`;
    try {
      setBusy(true);
      const blob = await uriToBlob(asset.uri);
      await uploadBytes(ref(storage, path), blob, { contentType: "application/pdf" });
      setSelected({ name: asset.name || "cv.pdf", path });
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  function useProfileCv() {
    if (!profileCvPath) return;
    setSelected({ name: profileCvName || "cv.pdf", path: profileCvPath });
  }

  async function analyze() {
    if (!selected) return;
    setError("");
    setBusy(true);
    setResult(null);
    try {
      const call = httpsCallable(functions, "analyzeCv");
      const res = await call({ cvPath: selected.path });
      setResult(res.data);
    } catch (err) {
      setError(err.message || "Could not analyse the CV.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={typography.h2}>📄 CV Checker</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
        {!result && (
          <>
            <Text style={typography.h1}>Get feedback on your CV</Text>
            <Text style={[typography.bodyDim, { marginBottom: spacing.md }]}>
              Upload a PDF or reuse the one on your profile. Claude scores it and lists strengths and specific things to improve. Nothing is written to your profile automatically.
            </Text>

            {profileCvPath && (
              <TouchableOpacity onPress={useProfileCv}
                style={[styles.card, selected?.path === profileCvPath && styles.cardActive]}>
                <Text style={styles.cardH}>Use my profile CV</Text>
                <Text style={styles.cardMeta}>📎 {profileCvName || "cv.pdf"}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={pickFile}
              style={[styles.card, styles.dashed, selected && selected.path !== profileCvPath && styles.cardActive]}>
              <Text style={styles.cardH}>{selected && selected.path !== profileCvPath ? `📎 ${selected.name}` : "Upload a different PDF"}</Text>
              <Text style={styles.cardMeta}>PDF only · max 5 MB</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Your CV is analysed in memory only; the file lives in your own Storage folder (owner + admin read).
            </Text>

            {error ? <Text style={styles.err}>{error}</Text> : null}

            <View style={{ marginTop: spacing.md }}>
              <ThemedButton title="Analyse my CV" onPress={analyze} loading={busy} disabled={!selected} />
            </View>
          </>
        )}

        {busy && result === null && (
          <View style={{ alignItems: "center", marginTop: spacing.xl }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.textDim, marginTop: spacing.sm }}>Reading your CV and generating feedback…</Text>
          </View>
        )}

        {result && (
          <>
            <Text style={typography.h1}>Your CV results</Text>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>CV Score</Text>
              <Text style={styles.scoreValue}>{result.score}<Text style={styles.scoreOf}>/100</Text></Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardH}>Strengths</Text>
              {(result.strengths || []).map((s, i) => (
                <Text key={i} style={styles.line}>✓ {s}</Text>
              ))}
              {(result.strengths || []).length === 0 && <Text style={styles.meta}>No specific strengths detected.</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardH}>Recommendations</Text>
              {(result.recommendations || []).map((r, i) => (
                <Text key={i} style={styles.line}>→ {r}</Text>
              ))}
              <Text style={styles.note}>These are suggestions only — nothing is added to your CV or profile automatically.</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <ThemedButton title="Check another CV" variant="secondary" onPress={() => { setResult(null); setSelected(null); }} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedButton title="Back to feed" onPress={() => router.push("/(student)")} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.textDim, fontSize: 24 },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  cardActive: { borderColor: colors.accent },
  dashed: { borderStyle: "dashed" },
  cardH: { color: colors.text, fontWeight: "700", fontSize: 15 },
  cardMeta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  meta: { color: colors.textDim, fontSize: 12 },
  note: { color: colors.textDim, fontSize: 11, marginTop: spacing.sm, fontStyle: "italic" },
  err: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  scoreBox: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.lg, alignItems: "center", marginVertical: spacing.md,
  },
  scoreLabel: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  scoreValue: { color: colors.accent, fontSize: 48, fontWeight: "800", marginTop: 4 },
  scoreOf: { color: colors.textDim, fontSize: 18, fontWeight: "400" },
  line: { color: colors.text, fontSize: 13, lineHeight: 20, marginTop: 4 },
});
