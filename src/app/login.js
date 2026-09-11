// Sign-in screen. Straight-up Firebase email/password. The gatekeeper
// (src/app/index.js) handles what to do with the user after they're
// signed in, so this screen just navigates to "/" on success and lets
// the gatekeeper route them.
import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/config";
import { colors, spacing, typography } from "../../theme/colors";
import ThemedInput from "../../components/ThemedInput";
import ThemedButton from "../../components/ThemedButton";
import Logo from "../../components/Logo";
import { mapFirebaseError } from "../../lib/firebaseErrors";
import { featureFlags } from "../../lib/featureFlags";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      router.replace("/");
      // No manual navigation needed — src/app/index.js re-evaluates auth
      // state and redirects automatically once Firebase confirms sign-in.
    } catch (err) {
      setError(mapFirebaseError(err.code) || "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: spacing.xl }}>
          <Logo size={44} />
        </View>

        <Text style={typography.h1}>Welcome back</Text>
        <Text style={typography.bodyDim}>Sign in to continue.</Text>

        <ThemedInput
          label="Email address"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <ThemedInput
          label="Password"
          placeholder="Your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={{ marginTop: spacing.lg }}>
          <ThemedButton title="Sign in" onPress={handleLogin} loading={loading} />
        </View>

        {featureFlags.otpVerification && (
          <TouchableOpacity onPress={() => router.push("/forgot-password")} style={{ marginTop: spacing.md }}>
            <Text style={[styles.linkText, { color: colors.accent }]}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.push("/signup")} style={{ marginTop: spacing.lg }}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={{ color: colors.accent }}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  logo: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: spacing.xl },
  errorText: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  linkText: { color: colors.textDim, textAlign: "center" },
});
