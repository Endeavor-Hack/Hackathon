// components/ThemedButton.js
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { colors, radius, spacing } from "../theme/colors";

export default function ThemedButton({ title, onPress, variant = "primary", loading = false, disabled = false }) {
  const isSecondary = variant === "secondary";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isSecondary ? styles.secondary : styles.primary,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.text : "#fff"} />
      ) : (
        <Text style={isSecondary ? styles.secondaryText : styles.primaryText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  disabled: { opacity: 0.5 },
});
