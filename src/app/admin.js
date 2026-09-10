// src/app/admin.js
// Admins primarily use the separate web panel (see admin-web/). If they
// happen to sign in on the mobile app, show them a friendly redirect
// message + sign out button — we don't rebuild the whole admin surface
// on mobile, per the brief's allowance for a separate web/desktop panel.
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import { colors, spacing, typography } from "../../theme/colors";
import ThemedButton from "../../components/ThemedButton";

export default function AdminHome() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (err) {
      console.error("Sign out error:", err.code, err.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🛠️</Text>
      <Text style={typography.h1}>Administrator</Text>
      <Text style={[typography.bodyDim, { textAlign: "center", marginTop: spacing.sm }]}>
        The admin panel is a separate web app for larger screens. Open{" "}
        <Text style={{ color: colors.accent }}>admin-web/</Text> in a browser to
        approve users, review opportunities, moderate content, create events,
        broadcast announcements, and view platform analytics.
      </Text>

      <View style={{ marginTop: spacing.xl, width: "100%" }}>
        <ThemedButton title="Sign out" variant="secondary" onPress={handleSignOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  icon: { fontSize: 48, marginBottom: spacing.lg },
});
