// src/app/(student)/profile.js
import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import * as DocumentPicker from "expo-document-picker";
import { auth, db, storage, functions } from "../../../firebase/config";
import { Alert } from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography, radius } from "../../../theme/colors";
import ProfileField from "../../../components/ProfileField";
import ThemedButton from "../../../components/ThemedButton";
import PhotoPicker from "../../../components/PhotoPicker";
import RepeatableList from "../../../components/RepeatableList";
import VisibilitySelector from "../../../components/VisibilitySelector";

// The brief requires a comprehensive digital portfolio (2.3) — this
// screen captures every mandated field, with per-section visibility
// controls. Complex nested state kept flat here rather than split into
// child components to keep the mental model simple: everything lives in
// `form`, one Save persists the whole thing.
export default function Profile() {
  const router = useRouter();
  const { firebaseUser, userDoc } = useAuth();
  const isAlumni = userDoc?.role === "alumni";
  const uid = firebaseUser?.uid;

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (userDoc && form === null) {
      setForm({
        // Basic
        photoUrl: userDoc.photoUrl || "",
        fullName: userDoc.fullName || "",
        headline: userDoc.headline || "",
        summary: userDoc.summary || "",

        // Education / role context
        programme: userDoc.programme || "",
        campus: userDoc.campus || "",
        enrolmentYear: userDoc.enrolmentYear || "",
        graduationYear: userDoc.graduationYear || "",

        // Skills + interests
        skills: (userDoc.skills || []).join(", "),
        careerInterests: userDoc.careerInterests || "",

        // Networking
        linkedinUrl: userDoc.linkedinUrl || "",
        githubUrl: userDoc.githubUrl || "",
        credlyUrl: userDoc.credlyUrl || "",

        // Rich lists
        workExperience: userDoc.workExperience || [],
        entrepreneurial: userDoc.entrepreneurial || [],
        githubProjects: userDoc.githubProjects || [],
        liveProjects: userDoc.liveProjects || [],
        digitalBadges: userDoc.digitalBadges || [],
        certifications: userDoc.certifications || [],
        awards: userDoc.awards || [],
        leadership: userDoc.leadership || [],
        clubs: userDoc.clubs || [],

        // CV
        cvPath: userDoc.cvPath || "",
        cvName: userDoc.cvName || "",

        // Per-section visibility (defaults to public)
        visibility: {
          summary: "public", contact: "public", experience: "public",
          entrepreneurial: "public", portfolio: "public", achievements: "public",
          skills: "public", clubs: "public",
          ...(userDoc.visibility || {}),
        },
      });
    }
  }, [userDoc]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }
  function updateVis(key, value) {
    setForm((prev) => ({ ...prev, visibility: { ...prev.visibility, [key]: value } }));
  }

  async function pickCv() {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const path = `cvs/${uid}/cv.pdf`;
    const blob = await (await fetch(asset.uri)).blob();
    await uploadBytes(ref(storage, path), blob, { contentType: "application/pdf" });
    update("cvPath", path);
    update("cvName", asset.name || "cv.pdf");
  }

  async function autofillFromCv() {
    if (!form.cvPath) { Alert.alert("No CV", "Upload a PDF CV first."); return; }
    try {
      const call = httpsCallable(functions, "parseCvText");
      const res = await call({ cvPath: form.cvPath });
      const parsed = res.data.parsed || {};
      // Merge only into empty fields — never clobber what the user typed.
      setForm((prev) => ({
        ...prev,
        headline: prev.headline || parsed.headline || "",
        summary: prev.summary || parsed.summary || "",
        skills: prev.skills || (parsed.skills || []).join(", "),
        workExperience: (prev.workExperience?.length ? prev.workExperience : parsed.workExperience) || [],
        certifications: (prev.certifications?.length ? prev.certifications : parsed.certifications) || [],
        awards: (prev.awards?.length ? prev.awards : parsed.awards) || [],
      }));
      Alert.alert("Autofill complete", "Review the suggestions and hit Save when you're happy.");
    } catch (err) {
      Alert.alert("Autofill failed", err.message || "The AI service was unavailable.");
    }
  }

  async function handleSave() {
    setSaving(true);
    setSavedMessage("");
    try {
      await updateDoc(doc(db, "users", uid), {
        photoUrl: form.photoUrl || null,
        fullName: form.fullName.trim(),
        headline: form.headline.trim(),
        summary: form.summary.trim(),
        programme: form.programme.trim(),
        campus: form.campus.trim(),
        enrolmentYear: form.enrolmentYear.trim(),
        graduationYear: form.graduationYear.trim(),
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        careerInterests: form.careerInterests.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        githubUrl: form.githubUrl.trim(),
        credlyUrl: form.credlyUrl.trim(),
        workExperience: form.workExperience,
        entrepreneurial: form.entrepreneurial,
        githubProjects: form.githubProjects,
        liveProjects: form.liveProjects,
        digitalBadges: form.digitalBadges,
        certifications: form.certifications,
        awards: form.awards,
        leadership: form.leadership,
        clubs: form.clubs,
        cvPath: form.cvPath || null,
        cvName: form.cvName || null,
        visibility: form.visibility,
        profileUpdatedAt: serverTimestamp(),
      });
      setSavedMessage("Profile saved.");
      setTimeout(() => setSavedMessage(""), 2500);
    } catch (err) {
      setSavedMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (err) {
      console.error("Sign out error:", err.code, err.message);
    }
  }

  if (form === null) {
    if (firebaseUser && userDoc === null) {
      return (
        <View style={[styles.centered, { paddingHorizontal: spacing.lg }]}>
          <Text style={[typography.h2, { textAlign: "center", marginBottom: spacing.sm }]}>
            We couldn't find your profile
          </Text>
          <Text style={[typography.bodyDim, { textAlign: "center", marginBottom: spacing.lg }]}>
            Your account exists, but no profile data is linked to it. Try signing out and signing up again.
          </Text>
          <ThemedButton title="Sign out" variant="secondary" onPress={handleSignOut} />
        </View>
      );
    }
    return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
      <Text style={[typography.h1, { marginBottom: spacing.xs }]}>Your Profile</Text>
      <Text style={[typography.bodyDim, { marginBottom: spacing.lg }]}>{userDoc?.email}</Text>

      <PhotoPicker
        uid={uid}
        currentUrl={form.photoUrl}
        onUploaded={(url) => update("photoUrl", url)}
      />

      <ProfileField label="Full name" value={form.fullName} onChangeText={(v) => update("fullName", v)} placeholder="e.g. Thabo Nkosi" />
      <ProfileField label="Professional headline" value={form.headline} onChangeText={(v) => update("headline", v)} placeholder="e.g. Final-year Computer Science student" />

      <SectionHeader
        title="Summary"
        visibility={form.visibility.summary}
        onVisibility={(v) => updateVis("summary", v)}
      />
      <ProfileField label="Short professional summary" value={form.summary} onChangeText={(v) => update("summary", v)} multiline />

      <SectionHeader
        title="Programme / role"
        visibility={form.visibility.contact}
        onVisibility={(v) => updateVis("contact", v)}
      />
      <ProfileField label={isAlumni ? "Current field of work" : "Programme of study"} value={form.programme} onChangeText={(v) => update("programme", v)} />
      <ProfileField label="Campus" value={form.campus} onChangeText={(v) => update("campus", v)} />
      <ProfileField label="Enrolment year" value={form.enrolmentYear} onChangeText={(v) => update("enrolmentYear", v)} keyboardType="numeric" />
      <ProfileField label="Graduation year" value={form.graduationYear} onChangeText={(v) => update("graduationYear", v)} keyboardType="numeric" />

      <SectionHeader
        title="Skills"
        visibility={form.visibility.skills}
        onVisibility={(v) => updateVis("skills", v)}
      />
      <ProfileField label="Skills (comma separated)" value={form.skills} onChangeText={(v) => update("skills", v)} placeholder="Python, SQL, Communication" />
      <ProfileField label="Career interests" value={form.careerInterests} onChangeText={(v) => update("careerInterests", v)} multiline />

      <SectionHeader
        title="Work experience"
        visibility={form.visibility.experience}
        onVisibility={(v) => updateVis("experience", v)}
      />
      <RepeatableList
        label="Roles, internships, industry placements"
        items={form.workExperience}
        onChange={(v) => update("workExperience", v)}
        addLabel="Add experience"
        fields={[
          { key: "role", label: "Role / title", placeholder: "e.g. Junior Developer" },
          { key: "company", label: "Organisation", placeholder: "e.g. Discovery" },
          { key: "years", label: "When", placeholder: "e.g. Jan 2024 – Present" },
          { key: "description", label: "What you did", multiline: true },
        ]}
      />

      <SectionHeader
        title="Entrepreneurial experience"
        visibility={form.visibility.entrepreneurial}
        onVisibility={(v) => updateVis("entrepreneurial", v)}
      />
      <RepeatableList
        label="Ventures founded, start-ups, freelance work"
        items={form.entrepreneurial}
        onChange={(v) => update("entrepreneurial", v)}
        addLabel="Add venture"
        fields={[
          { key: "name", label: "Venture name" },
          { key: "role", label: "Your role" },
          { key: "years", label: "When" },
          { key: "description", label: "Description", multiline: true },
        ]}
      />

      <SectionHeader
        title="Portfolio"
        visibility={form.visibility.portfolio}
        onVisibility={(v) => updateVis("portfolio", v)}
      />
      <ProfileField label="LinkedIn URL" value={form.linkedinUrl} onChangeText={(v) => update("linkedinUrl", v)} placeholder="https://linkedin.com/in/..." />
      <ProfileField label="GitHub profile URL" value={form.githubUrl} onChangeText={(v) => update("githubUrl", v)} placeholder="https://github.com/..." />
      <ProfileField label="Credly digital badge profile" value={form.credlyUrl} onChangeText={(v) => update("credlyUrl", v)} placeholder="https://credly.com/users/..." />

      <RepeatableList
        label="GitHub projects (repositories)"
        items={form.githubProjects}
        onChange={(v) => update("githubProjects", v)}
        addLabel="Add repository"
        fields={[
          { key: "name", label: "Repo name" },
          { key: "url", label: "URL", placeholder: "https://github.com/..." },
          { key: "description", label: "What it does", multiline: true },
        ]}
      />
      <RepeatableList
        label="Live sites / apps"
        items={form.liveProjects}
        onChange={(v) => update("liveProjects", v)}
        addLabel="Add project"
        fields={[
          { key: "name", label: "Project name" },
          { key: "url", label: "Live URL", placeholder: "https://..." },
          { key: "description", label: "Description", multiline: true },
        ]}
      />
      <RepeatableList
        label="Digital badges"
        items={form.digitalBadges}
        onChange={(v) => update("digitalBadges", v)}
        addLabel="Add badge"
        fields={[
          { key: "name", label: "Badge name" },
          { key: "issuer", label: "Issuer" },
          { key: "url", label: "URL (optional)" },
        ]}
      />
      <RepeatableList
        label="Professional certifications"
        items={form.certifications}
        onChange={(v) => update("certifications", v)}
        addLabel="Add certification"
        fields={[
          { key: "name", label: "Certification name" },
          { key: "issuer", label: "Issuer" },
          { key: "year", label: "Year", keyboardType: "numeric" },
        ]}
      />

      <SectionHeader
        title="Achievements"
        visibility={form.visibility.achievements}
        onVisibility={(v) => updateVis("achievements", v)}
      />
      <RepeatableList
        label="Academic awards, scholarships, recognitions"
        items={form.awards}
        onChange={(v) => update("awards", v)}
        addLabel="Add award"
        fields={[
          { key: "name", label: "Award / scholarship name" },
          { key: "year", label: "Year", keyboardType: "numeric" },
          { key: "description", label: "Description", multiline: true },
        ]}
      />
      <RepeatableList
        label="Leadership roles"
        items={form.leadership}
        onChange={(v) => update("leadership", v)}
        addLabel="Add role"
        fields={[
          { key: "role", label: "Role (e.g. SRC, class rep, mentor, ambassador)" },
          { key: "organisation", label: "Organisation" },
          { key: "years", label: "When" },
        ]}
      />

      <SectionHeader
        title="Clubs, hackathons, community"
        visibility={form.visibility.clubs}
        onVisibility={(v) => updateVis("clubs", v)}
      />
      <RepeatableList
        label="Clubs, societies, hackathons, competitions, volunteering"
        items={form.clubs}
        onChange={(v) => update("clubs", v)}
        addLabel="Add activity"
        fields={[
          { key: "name", label: "Activity / club" },
          { key: "role", label: "Your role" },
          { key: "years", label: "When" },
        ]}
      />

      <Text style={[styles.section, { marginTop: spacing.lg }]}>CV upload</Text>
      <TouchableOpacity onPress={pickCv} style={styles.cvBtn}>
        <Text style={styles.cvBtnText}>
          {form.cvName ? `📎 ${form.cvName} (replace)` : "Upload CV (PDF)"}
        </Text>
      </TouchableOpacity>
      {form.cvPath ? (
        <View style={{ marginTop: spacing.sm }}>
          <ThemedButton title="✨ Auto-fill profile from CV (AI)" variant="secondary" onPress={autofillFromCv} />
        </View>
      ) : null}

      {savedMessage ? <Text style={styles.savedText}>{savedMessage}</Text> : null}

      <View style={{ marginTop: spacing.md }}>
        <ThemedButton title="Save profile" onPress={handleSave} loading={saving} />
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <ThemedButton title="Sign out" variant="secondary" onPress={handleSignOut} />
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title, visibility, onVisibility }) {
  return (
    <View style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15, marginBottom: 4 }}>{title}</Text>
      <VisibilitySelector value={visibility} onChange={onVisibility} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  savedText: { color: colors.good, fontSize: 13, marginTop: spacing.sm },
  section: { color: colors.textDim, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  cvBtn: {
    backgroundColor: colors.panelLight,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: spacing.md, alignItems: "center",
  },
  cvBtnText: { color: colors.text, fontSize: 14 },
});
