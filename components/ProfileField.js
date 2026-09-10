// components/ProfileField.js
import { View, Text, TextInput, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/colors";

export default function ProfileField({ label, value, onChangeText, placeholder, multiline, keyboardType }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.textDim, marginBottom: 6 },
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
  multiline: { minHeight: 80, textAlignVertical: "top" },
});
