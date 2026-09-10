// src/app/pending.js
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import { colors, spacing, typography } from "../../theme/colors";
import ThemedButton from "../../components/ThemedButton";

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
