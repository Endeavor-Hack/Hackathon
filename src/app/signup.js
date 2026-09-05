// src/app/signup.js
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { colors, spacing, typography, radius } from "../../theme/colors";
import ThemedInput from "../../components/ThemedInput";
import ThemedButton from "../../components/ThemedButton";

const STUDENT_DOMAINS = [
  "@my.richfield.ac.za",
  "@richfield.ac.za",
  "@my.aaa.ac.za",
  "@aaa.ac.za",
];

const ROLES = [
  { key: "student", label: "Student", desc: "Currently studying at Richfield/AAA" },
  { key: "alumni", label: "Alumni", desc: "Graduated — verification required" },
  { key: "business", label: "Business", desc: "Employer or recruiter — approval required" },
];

export default function SignupScreen() {
  const router = useRouter();
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function isStudentDomainValid(emailValue) {
    const lower = emailValue.trim().toLowerCase();
    return STUDENT_DOMAINS.some((domain) => lower.endsWith(domain));
  }

  async function handleSignup() {
    setError("");
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (role === "student" && !isStudentDomainValid(trimmedEmail)) {
      setError("Student accounts must use a Richfield/AAA institutional email address.");
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const status = role === "student" ? "active" : "pending";

      await setDoc(doc(db, "users", credential.user.uid), {
        email: trimmedEmail,
        role,
        status,
        createdAt: serverTimestamp(),
      });
      // No manual navigation — src/app/index.js redirects automatically
      // once this user's Firestore doc is created and read back.
    } catch (err) {
      console.error("Signup error:", err.code, err.message);
      setError(mapFirebaseError(err.code));
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
        <Text style={styles.logo}>
          Endeavour<Text style={{ color: colors.accent }}>.</Text>
        </Text>

        <Text style={typography.h1}>Create your account</Text>
        <Text style={typography.bodyDim}>Choose the account type that fits you.</Text>

        <View style={{ marginTop: spacing.lg }}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.key}
              onPress={() => setRole(r.key)}
              style={[styles.roleCard, role === r.key && styles.roleCardActive]}
            >
              <Text style={styles.roleTitle}>{r.label}</Text>
              <Text style={styles.roleDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedInput
          label={role === "student" ? "Institutional email" : "Email address"}
          placeholder={role === "student" ? "you@my.richfield.ac.za" : "you@example.com"}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <ThemedInput
          label="Password"
          placeholder="At least 8 characters"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <ThemedInput
          label="Confirm password"
          placeholder="Re-enter your password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={{ marginTop: spacing.lg }}>
          <ThemedButton title="Create account" onPress={handleSignup} loading={loading} />
        </View>

        <TouchableOpacity onPress={() => router.push("/login")} style={{ marginTop: spacing.lg }}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={{ color: colors.accent }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function mapFirebaseError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    default:
      return "Could not create the account. Please try again.";
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: 80,
    paddingBottom: 60,
  },
  logo: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: spacing.xl },
  roleCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  roleCardActive: { borderColor: colors.accent },
  roleTitle: { color: colors.text, fontWeight: "700", fontSize: 15 },
  roleDesc: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  errorText: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  linkText: { color: colors.textDim, textAlign: "center" },
});
