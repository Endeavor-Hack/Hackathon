// The brand mark. By default it's the flame + "Endeavour." wordmark
// side by side. Pass variant="mark" to drop the wordmark and render
// only the flame — used in tight spots like the tab-bar top right or
// the top of an auth screen where the wordmark would be redundant.
import { View, Text, Image, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

const LOGO_SRC = require("../assets/images/logo.png");

export default function Logo({ size = 32, variant = "full", color, style }) {
  const wordSize = Math.round(size * 0.85);
  const textColor = color || colors.text;

  if (variant === "mark") {
    return (
      <Image
        source={LOGO_SRC}
        style={[{ width: size, height: size, resizeMode: "contain" }, style]}
        accessibilityLabel="Endeavour logo"
      />
    );
  }

  return (
    <View style={[styles.row, style]}>
      <Image
        source={LOGO_SRC}
        style={{ width: size, height: size, resizeMode: "contain" }}
        accessibilityLabel="Endeavour logo"
      />
      <Text style={[styles.word, { fontSize: wordSize, color: textColor }]}>
        Endeavour<Text style={{ color: colors.accent }}>.</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  word: { fontWeight: "800", letterSpacing: -0.5 },
});
