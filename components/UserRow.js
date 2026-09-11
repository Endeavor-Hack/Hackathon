// components/UserRow.js
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing, radius } from "../theme/colors";
import Avatar from "./Avatar";

const ROLE_LABELS = {
  student: "Student",
  alumni: "Alumni",
  business: "Business",
};

export default function UserRow({
  uid,
  name,
  role,
  photoUrl,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  onPress,
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={styles.row}>
      <Avatar uid={uid} name={name} photoUrl={photoUrl} size={40} style={{ marginRight: spacing.sm }} />

      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>{ROLE_LABELS[role] || role}</Text>
      </View>

      <View style={styles.actions}>
        {secondaryLabel && (
          <TouchableOpacity onPress={onSecondary} style={[styles.btn, styles.btnSecondary]}>
            <Text style={styles.btnSecondaryText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        )}
        {primaryLabel && (
          <TouchableOpacity
            onPress={onPrimary}
            disabled={primaryDisabled}
            style={[styles.btn, styles.btnPrimary, primaryDisabled && styles.btnDisabled]}
          >
            <Text style={styles.btnPrimaryText}>{primaryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { color: colors.text, fontWeight: "700", fontSize: 14 },
  role: { color: colors.textDim, fontSize: 12, marginTop: 1 },
  actions: { flexDirection: "row", gap: 8 },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  btnSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { color: colors.textDim, fontWeight: "600", fontSize: 12 },
  btnDisabled: { opacity: 0.5 },
});
