// Type an email, get an OTP mailed to it. We always route forward to
// /reset-password on success, even if the account didn't exist — that
// way you can't use this screen to probe which emails are registered.
import { useState } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase/config";
import { colors, spacing, typography } from "../../theme/colors";
import ThemedInput from "../../components/ThemedInput";
import ThemedButton from "../../components/ThemedButton";
import Logo from "../../components/Logo";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) { setError("Enter a valid email address."); return; }
    setBusy(true);
    try {
      await httpsCallable(functions, "sendPasswordResetOtp")({ email: trimmed });
      router.replace(`/reset-password?email=${encodeURIComponent(trimmed)}`);
    } catch (err) {
      setError(err.message || "Could not send a reset code.");
    } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: spacing.xl }}>
          <Logo size={44} />
        </View>
        <Text style={typography.h1}>Reset your password</Text>
        <Text style={typography.bodyDim}>
          Enter the email on your account. If it exists, we'll send a 6-digit code you can use to set a new password.
        </Text>

        <ThemedInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <View style={{ marginTop: spacing.lg }}>
          <ThemedButton title="Send code" onPress={submit} loading={busy} />
        </View>

        <TouchableOpacity onPress={() => router.replace("/login")} style={{ marginTop: spacing.lg }}>
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg, justifyContent: "center",
  },
  logo: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: spacing.xl },
  err: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  link: { color: colors.textDim, textAlign: "center" },
});
