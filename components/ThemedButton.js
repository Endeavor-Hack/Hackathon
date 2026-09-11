// components/ThemedButton.js
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { colors, radius } from "../theme/colors";

export default function ThemedButton({ title, onPress, variant = "primary", loading = false, disabled = false }) {
  const isSecondary = variant === "secondary";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        isSecondary ? styles.secondary : styles.primary,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {/* Fixed-height inner row so the label + spinner always occupy
          the same vertical space and never collapse to 0. */}
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={isSecondary ? colors.text : "#fff"} />
        ) : (
          <Text
            style={isSecondary ? styles.secondaryText : styles.primaryText}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // No flex:1 — buttons size to their content by default. Callers that
  // want side-by-side equal widths wrap the button in <View style={{flex:1}}>.
  base: {
    borderRadius: radius.sm,
    alignSelf: "stretch",
  },
  inner: {
    minHeight: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  disabled: { opacity: 0.5 },
});
