// The "waiting on an admin to approve your account" screen. Alumni
// and business accounts land here after signup until an admin flips
// their user doc from status: "pending" to "active" (either from the
// mobile admin panel or the web one).
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import { colors, spacing, typography } from "../../theme/colors";
import ThemedButton from "../../components/ThemedButton";
import Logo from "../../components/Logo";

export default function PendingApprovalScreen() {
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
      <View style={{ marginBottom: spacing.lg }}>
        <Logo size={40} variant="mark" />
      </View>
      <Text style={styles.icon}>⏳</Text>
      <Text style={typography.h1}>Your account is pending approval</Text>
      <Text style={[typography.bodyDim, { textAlign: "center", marginTop: spacing.sm }]}>
        An administrator needs to verify your account before you can access
        the platform. This usually doesn't take long — check back soon.
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
