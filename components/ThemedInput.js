// components/ThemedInput.js
import { TextInput, View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "../theme/colors";

export default function ThemedInput({ label, error, style, ...props }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      {label && <Text style={typography.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textDim}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 13, marginTop: 4 },
});
