// The second step of the forgot-password flow. Type the 6-digit code
// that was emailed to you plus a new password; the
// resetPasswordWithOtp function verifies the code server-side and
// swaps the password on the auth account. On success we bounce you
// to the login screen for a clean sign-in with the new password.
import { useState } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform,
  TextInput, TouchableOpacity, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase/config";
import { colors, spacing, typography, radius } from "../../theme/colors";
import ThemedInput from "../../components/ThemedInput";
import ThemedButton from "../../components/ThemedButton";
import Logo from "../../components/Logo";

export default function ResetPassword() {
  const router = useRouter();
  const { email: paramEmail } = useLocalSearchParams();
  const [email, setEmail] = useState(String(paramEmail || ""));
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!/^\d{6}$/.test(otp)) { setError("Enter the 6-digit code."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setBusy(true);
    try {
      await httpsCallable(functions, "resetPasswordWithOtp")({
        email: trimmed, otp, newPassword: password,
      });
      Alert.alert("Password reset", "Sign in with your new password.");
      router.replace("/login");
    } catch (err) {
      setError(friendly(err));
    } finally { setBusy(false); }
  }

  async function resend() {
    setError("");
    setBusy(true);
    try {
      await httpsCallable(functions, "sendPasswordResetOtp")({ email: email.trim().toLowerCase() });
      Alert.alert("Code sent", "Check your email for a new 6-digit code.");
    } catch (err) {
      setError(err.message || "Could not resend.");
    } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: spacing.xl }}>
          <Logo size={44} />
        </View>
        <Text style={typography.h1}>Set a new password</Text>
        <Text style={typography.bodyDim}>Enter the 6-digit code we emailed you plus a new password.</Text>

        <ThemedInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={{ marginTop: spacing.md }}>
          <Text style={typography.label}>6-digit code</Text>
          <TextInput
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.otpInput}
            placeholder="123456"
            placeholderTextColor={colors.textDim}
          />
        </View>

        <ThemedInput label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />
        <ThemedInput label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry />

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <View style={{ marginTop: spacing.lg }}>
          <ThemedButton title="Reset password" onPress={submit} loading={busy} />
        </View>

        <TouchableOpacity onPress={resend} style={{ marginTop: spacing.md }} disabled={busy}>
          <Text style={styles.link}>Resend code</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/login")} style={{ marginTop: spacing.md }}>
          <Text style={[styles.link, { color: colors.textDim }]}>Back to sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function friendly(err) {
  const msg = err?.message || "";
  if (msg.includes("Incorrect")) return "Wrong code or wrong email.";
  if (msg.includes("expired")) return "That code has expired — tap Resend.";
  if (msg.includes("No pending")) return "No pending reset — request a new code first.";
  return msg || "Could not reset the password.";
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg, paddingVertical: 40,
  },
  logo: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: spacing.xl },
  otpInput: {
    backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 14,
    color: colors.text, fontSize: 24, letterSpacing: 12, textAlign: "center",
  },
  err: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  link: { color: colors.accent, textAlign: "center", fontWeight: "600" },
});
