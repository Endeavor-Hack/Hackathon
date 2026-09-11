// Sign-up screen. One form that reshapes itself based on the picked
// role: students get the standard email/password; alumni add
// verification-doc upload; businesses add company name; admins get
// the passcode field (the passcode itself is checked server-side by
// the claimAdmin Cloud Function, so it never lives in this bundle).
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import * as DocumentPicker from "expo-document-picker";
import { auth, db, storage, functions } from "../../firebase/config";
import { uriToBlob } from "../../lib/uriToBlob";
import { colors, spacing, typography, radius } from "../../theme/colors";
import ThemedInput from "../../components/ThemedInput";
import ThemedButton from "../../components/ThemedButton";
import Logo from "../../components/Logo";
import { mapFirebaseError } from "../../lib/firebaseErrors";
import { featureFlags } from "../../lib/featureFlags";

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
  { key: "admin", label: "Administrator", desc: "Staff only — requires admin passcode" },
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

  // Admin-only field
  const [adminPassword, setAdminPassword] = useState("");

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
    if (role === "admin" && !adminPassword) {
      setError("Enter the admin passcode.");
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const uid = credential.user.uid;

      // Admin path: skip the normal user-doc write and hand off to the
      // Cloud Function, which verifies the passcode and creates the
      // admin doc + custom claim server-side. If the passcode is wrong
      // the function tears down the auth account and throws.
      if (role === "admin") {
        try {
          await httpsCallable(functions, "claimAdmin")({ adminPassword });
          // Force a token refresh so the fresh admin claim is present
          // before the gatekeeper redirects.
          await credential.user.getIdToken(true);
          router.replace("/");
          return;
        } catch (err) {
          // Auth user was auto-deleted server-side on wrong passcode.
          // Sign the client out too so subsequent Firebase calls don't
          // hit "user-not-found" against a phantom session.
          try { await auth.signOut(); } catch {}
          setError(err.message || "Admin passcode was incorrect.");
          setLoading(false);
          return;
        }
      }

      let verificationDocPath = null;
      if (role === "alumni" && verificationDoc) {
        // Upload proof-of-qualification to a location that firestore.rules
        // restricts to (owner OR admin) reads. Admin panel Users page
        // exposes a "View verification document" button that reads this.
        const ext = verificationDoc.name?.split(".").pop() || "bin";
        const path = `alumni-verification/${uid}/proof.${ext}`;
        const blob = await uriToBlob(verificationDoc.uri);
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
        // With OTP off, we mark the email verified at signup so the
        // gatekeeper doesn't strand the user on /verify-otp with no
        // way to complete verification. Turn the flag on in
        // lib/featureFlags.js once the Cloud Functions are deployed.
        emailVerified: !featureFlags.otpVerification,
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

      if (featureFlags.otpVerification) {
        // Trigger the 6-digit OTP email and route to the verification
        // screen. If sending fails (SMTP config missing, network), the
        // account still exists — the user can retry via the resend
        // button on the verify screen.
        try {
          await httpsCallable(functions, "sendSignupOtp")({ email: trimmedEmail });
        } catch (mailErr) {
          console.warn("Could not send OTP:", mailErr.message);
        }
        router.replace(`/verify-otp?email=${encodeURIComponent(trimmedEmail)}`);
      } else {
        // Skip verification — send them through the gatekeeper as normal.
        router.replace("/");
      }
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
        <View style={{ marginBottom: spacing.xl }}>
          <Logo size={44} />
        </View>

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

        {role === "admin" && (
          <>
            <Text style={styles.sectionNote}>
              Administrator accounts are for Richfield/AAA staff only. You must enter the
              admin passcode — the passcode is verified server-side and is never stored on
              your device.
            </Text>
            <ThemedInput
              label="Admin passcode"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              placeholder="Enter the admin passcode"
            />
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
