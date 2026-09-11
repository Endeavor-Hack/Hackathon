// components/ThemedInput.js
import { useState } from "react";
import { TextInput, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "../theme/colors";

export default function ThemedInput({ label, error, style, secureTextEntry, ...props }) {
  // When secureTextEntry is on, show a Show/Hide toggle. Keeps the
  // rest of the component's API unchanged so callers don't have to
  // change anything.
  const [revealed, setRevealed] = useState(false);
  const isPassword = !!secureTextEntry;
  const effectivelySecure = isPassword && !revealed;

  return (
    <View style={{ marginTop: spacing.md }}>
      {label && <Text style={typography.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={colors.textDim}
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            error && styles.inputError,
            style,
          ]}
          secureTextEntry={effectivelySecure}
          autoCorrect={isPassword ? false : props.autoCorrect}
          autoCapitalize={isPassword ? "none" : props.autoCapitalize}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setRevealed((r) => !r)}
            style={styles.toggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
          >
            <Text style={styles.toggleIcon}>{revealed ? "🙈" : "👁"}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { position: "relative", justifyContent: "center" },
  input: {
    backgroundColor: colors.panelLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  inputWithToggle: {
    // Reserve room on the right so the eye button doesn't overlap typing.
    paddingRight: 48,
  },
  inputError: { borderColor: colors.danger },
  toggle: {
    position: "absolute",
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  toggleText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  toggleIcon: { fontSize: 20 },
  errorText: { color: colors.danger, fontSize: 13, marginTop: 4 },
});
