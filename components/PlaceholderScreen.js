// components/PlaceholderScreen.js
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { colors, spacing, typography } from "../theme/colors";
import ThemedButton from "./ThemedButton";

export default function PlaceholderScreen({ title, showSignOut = false }) {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut(auth);
      // Explicit /login — from inside a tab group, "/" resolves to
      // the group's own index, not the top-level gatekeeper.
      router.replace("/login");
    } catch (err) {
      console.error("Sign out error:", err.code, err.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={typography.h1}>{title}</Text>
      <Text style={typography.bodyDim}>Screen coming soon.</Text>

      {showSignOut && (
        <View style={{ marginTop: spacing.xl, width: "100%" }}>
          <ThemedButton title="Sign out" variant="secondary" onPress={handleSignOut} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
});
