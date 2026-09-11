// The 6-digit code screen you land on right after signup. The code
// itself was emailed to you by the sendSignupOtp function on the
// server. Enter it here and verifySignupOtp flips both the Firebase
// Auth emailVerified flag and users/{uid}.emailVerified to true; the
// gatekeeper then lets you through to the app.
import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform,
  TextInput, TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { httpsCallable } from "firebase/functions";
import { signOut, reload } from "firebase/auth";
import { auth, functions } from "../../firebase/config";
import { colors, spacing, typography, radius } from "../../theme/colors";
import ThemedButton from "../../components/ThemedButton";
import Logo from "../../components/Logo";

export default function VerifyOtp() {
  const router = useRouter();
  const { email: paramEmail } = useLocalSearchParams();
  const email = String(paramEmail || auth.currentUser?.email || "").toLowerCase();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    timerRef.current = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [resendCooldown]);

  async function verify() {
    setError("");
    if (!/^\d{6}$/.test(otp)) { setError("Enter the 6-digit code."); return; }
    setBusy(true);
    try {
      await httpsCallable(functions, "verifySignupOtp")({ email, otp });
      // Refresh the local firebase user so emailVerified propagates.
      if (auth.currentUser) await reload(auth.currentUser);
      router.replace("/");
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    setBusy(true);
    try {
      await httpsCallable(functions, "sendSignupOtp")({ email });
      setResendCooldown(30);
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try { await signOut(auth); } catch {}
    router.replace("/login");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: spacing.xl }}>
          <Logo size={44} />
        </View>
        <Text style={typography.h1}>Verify your email</Text>
        <Text style={typography.bodyDim}>
          We sent a 6-digit code to <Text style={{ color: colors.text }}>{email || "your email"}</Text>. Enter it below to activate your account.
        </Text>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={typography.label}>Verification code</Text>
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

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <View style={{ marginTop: spacing.md }}>
          <ThemedButton title="Verify" onPress={verify} loading={busy} disabled={otp.length !== 6} />
        </View>

        <TouchableOpacity onPress={resend} disabled={busy || resendCooldown > 0} style={{ marginTop: spacing.md }}>
          <Text style={styles.link}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend the code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSignOut} style={{ marginTop: spacing.lg }}>
          <Text style={[styles.link, { color: colors.textDim }]}>Use a different account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function friendly(err) {
  const msg = err?.message || "";
  if (msg.includes("Incorrect code")) return "That code isn't right.";
  if (msg.includes("expired")) return "That code has expired — request a new one.";
  if (msg.includes("No pending")) return "No pending verification — tap Resend to get a new code.";
  return msg || "Something went wrong.";
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg, justifyContent: "center",
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
