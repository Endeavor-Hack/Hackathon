// components/PlaceholderScreen.js
import { View, Text, StyleSheet } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { colors, spacing, typography } from "../theme/colors";
import ThemedButton from "./ThemedButton";

export default function PlaceholderScreen({ title, showSignOut = false }) {
  return (
    <View style={styles.container}>
      <Text style={typography.h1}>{title}</Text>
      <Text style={typography.bodyDim}>Screen coming soon.</Text>

      {showSignOut && (
        <View style={{ marginTop: spacing.xl, width: "100%" }}>
          <ThemedButton title="Sign out" variant="secondary" onPress={() => signOut(auth)} />
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
