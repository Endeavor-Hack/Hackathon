// src/app/(business)/company.js
import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography } from "../../../theme/colors";
import ProfileField from "../../../components/ProfileField";
import ThemedButton from "../../../components/ThemedButton";
import PhotoPicker from "../../../components/PhotoPicker";
import FireLoader from "../../../components/FireLoader";

export default function CompanyProfile() {
  const router = useRouter();
  const { firebaseUser, userDoc } = useAuth();
  const uid = firebaseUser?.uid;

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (userDoc && form === null) {
      setForm({
        logoUrl: userDoc.logoUrl || "",
        companyName: userDoc.companyName || userDoc.fullName || "",
        industry: userDoc.industry || "",
        description: userDoc.description || "",
        location: userDoc.location || "",
        website: userDoc.website || "",
        contactEmail: userDoc.contactEmail || userDoc.email || "",
        contactPhone: userDoc.contactPhone || "",
        talentSought: userDoc.talentSought || "",
      });
    }
  }, [userDoc]);

  function update(k, v) { setForm((prev) => ({ ...prev, [k]: v })); }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      await updateDoc(doc(db, "users", uid), {
        logoUrl: form.logoUrl || null,
        companyName: form.companyName.trim(),
        fullName: form.companyName.trim(), // used as display name
        industry: form.industry.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        website: form.website.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        talentSought: form.talentSought.trim(),
        profileUpdatedAt: serverTimestamp(),
      });
      setMsg("Company profile saved.");
      setTimeout(() => setMsg(""), 2500);
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try { await signOut(auth); router.replace("/login"); } catch (err) { console.error(err); }
  }

  if (!form) {
    return <View style={styles.centered}><FireLoader /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 240 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <Text style={[typography.h1, { marginBottom: spacing.md }]}>Company profile</Text>

      <PhotoPicker
        uid={uid}
        currentUrl={form.logoUrl}
        onUploaded={async (url) => {
          update("logoUrl", url);
          try {
            await updateDoc(doc(db, "users", uid), { logoUrl: url });
          } catch (err) {
            console.error("Failed to persist logo:", err);
          }
        }}
        storagePath={`company-logos/${uid}/logo.jpg`}
        label="Company logo"
      />

      <ProfileField label="Company / organisation name" value={form.companyName} onChangeText={(v) => update("companyName", v)} />
      <ProfileField label="Industry" value={form.industry} onChangeText={(v) => update("industry", v)} placeholder="e.g. Financial services" />
      <ProfileField label="About the company" value={form.description} onChangeText={(v) => update("description", v)} multiline />
      <ProfileField label="Location" value={form.location} onChangeText={(v) => update("location", v)} placeholder="e.g. Sandton, Johannesburg" />
      <ProfileField label="Website" value={form.website} onChangeText={(v) => update("website", v)} placeholder="https://..." />
      <ProfileField label="Contact email" value={form.contactEmail} onChangeText={(v) => update("contactEmail", v)} keyboardType="email-address" autoCapitalize="none" />
      <ProfileField label="Contact phone" value={form.contactPhone} onChangeText={(v) => update("contactPhone", v)} keyboardType="phone-pad" />
      <ProfileField label="Types of graduates / skills / talent you're seeking" value={form.talentSought} onChangeText={(v) => update("talentSought", v)} multiline placeholder="e.g. Software engineering graduates with Python or Java, keen on fintech" />

      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <View style={{ marginTop: spacing.md }}>
        <ThemedButton title="Save profile" onPress={save} loading={saving} />
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <ThemedButton title="Sign out" variant="secondary" onPress={handleSignOut} />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  msg: { color: colors.good, fontSize: 13, marginTop: spacing.sm },
});
