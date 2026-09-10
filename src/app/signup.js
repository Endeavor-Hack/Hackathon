// src/app/signup.js
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import * as DocumentPicker from "expo-document-picker";
import { auth, db, storage } from "../../firebase/config";
import { colors, spacing, typography, radius } from "../../theme/colors";
import ThemedInput from "../../components/ThemedInput";
import ThemedButton from "../../components/ThemedButton";
import { mapFirebaseError } from "../../lib/firebaseErrors";

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

  // Alumni-only fields
  const [fullName, setFullName] = useState("");
  const [programme, setProgramme] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [verificationDoc, setVerificationDoc] = useState(null); // { uri, name, mimeType }

  // Business-only fields
  const [companyName, setCompanyName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function isStudentDomainValid(emailValue) {
    const lower = emailValue.trim().toLowerCase();
    return STUDENT_DOMAINS.some((domain) => lower.endsWith(domain));
  }

  async function pickVerificationDoc() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        setVerificationDoc(result.assets[0]);
      }
    } catch (err) {
      setError("Could not open file picker: " + err.message);
    }
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
    if (role === "alumni") {
      if (!fullName.trim()) { setError("Full name is required for alumni verification."); return; }
      if (!programme.trim()) { setError("Programme graduated from is required."); return; }
      if (!graduationYear.trim()) { setError("Graduation year is required."); return; }
      if (!verificationDoc) { setError("A verification document (transcript, certificate, or ID) is required."); return; }
    }
    if (role === "business" && !companyName.trim()) {
      setError("Company name is required for business accounts.");
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const uid = credential.user.uid;

      let verificationDocPath = null;
      if (role === "alumni" && verificationDoc) {
        // Upload proof-of-qualification to a location that firestore.rules
        // restricts to (owner OR admin) reads. Admin panel Users page
        // exposes a "View verification document" button that reads this.
        const ext = verificationDoc.name?.split(".").pop() || "bin";
        const path = `alumni-verification/${uid}/proof.${ext}`;
        const response = await fetch(verificationDoc.uri);
        const blob = await response.blob();
        await uploadBytes(ref(storage, path), blob, {
          contentType: verificationDoc.mimeType || "application/octet-stream",
        });
        verificationDocPath = path;
      }

      const status = role === "student" ? "active" : "pending";
      const base = {
        email: trimmedEmail,
        role,
        status,
        createdAt: serverTimestamp(),
      };
      const roleFields = role === "alumni"
        ? {
            fullName: fullName.trim(),
            programme: programme.trim(),
            graduationYear: graduationYear.trim(),
            verificationDocPath,
          }
        : role === "business"
          ? { companyName: companyName.trim(), fullName: companyName.trim() }
          : {};

      await setDoc(doc(db, "users", uid), { ...base, ...roleFields });
      router.replace("/");
    } catch (err) {
      setError(mapFirebaseError(err.code) || `${err.code}: ${err.message}`);
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
        <ThemedInput label="Password" placeholder="At least 8 characters" secureTextEntry value={password} onChangeText={setPassword} />
        <ThemedInput label="Confirm password" placeholder="Re-enter your password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

        {role === "alumni" && (
          <>
            <Text style={styles.sectionNote}>
              Since alumni no longer have institutional email access, we verify identity via
              graduation records. Upload a scan/photo of your qualification or transcript — an
              administrator will review it before your account is activated.
            </Text>
            <ThemedInput label="Full legal name (as on qualification)" value={fullName} onChangeText={setFullName} />
            <ThemedInput label="Programme graduated from" value={programme} onChangeText={setProgramme} placeholder="e.g. BSc Computer Science" />
            <ThemedInput label="Graduation year" value={graduationYear} onChangeText={setGraduationYear} keyboardType="numeric" placeholder="e.g. 2022" />

            <View style={{ marginTop: spacing.md }}>
              <Text style={typography.label}>Verification document (PDF or image)</Text>
              <TouchableOpacity onPress={pickVerificationDoc} style={styles.pickerBtn}>
                <Text style={styles.pickerBtnText}>
                  {verificationDoc ? `📎 ${verificationDoc.name}` : "Choose a file"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {role === "business" && (
          <>
            <Text style={styles.sectionNote}>
              Business accounts require administrator approval before you can post opportunities.
            </Text>
            <ThemedInput label="Company / organisation name" value={companyName} onChangeText={setCompanyName} />
          </>
        )}

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
  sectionNote: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  pickerBtn: {
    backgroundColor: colors.panelLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
  },
  pickerBtnText: { color: colors.text, fontSize: 14 },
});
