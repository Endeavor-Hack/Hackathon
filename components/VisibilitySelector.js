// The four-way chip row shown above each editable profile section:
// Public / Connections / Businesses / Private. The picker itself
// just changes state — the actual enforcement happens in the profile
// viewer (see canView below), which decides whether to render each
// section based on the current viewer's relationship to the profile
// owner.
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/colors";

export const VISIBILITY_OPTIONS = [
  { key: "public", label: "Public" },
  { key: "connections", label: "Connections" },
  { key: "businesses", label: "Businesses only" },
  { key: "private", label: "Private" },
];

export default function VisibilitySelector({ value, onChange }) {
  return (
    <View style={styles.wrap}>
      {VISIBILITY_OPTIONS.map((o) => (
        <TouchableOpacity
          key={o.key}
          onPress={() => onChange(o.key)}
          style={[styles.chip, value === o.key && styles.chipActive]}
        >
          <Text style={[styles.text, value === o.key && styles.textActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Rendering-side check: given a section's visibility and viewer context,
// should this section be shown?
export function canView(sectionVisibility, viewer) {
  const v = sectionVisibility || "public";
  if (viewer.isSelf) return true;
  if (v === "public") return true;
  if (v === "private") return false;
  if (v === "connections") return viewer.isConnected;
  if (v === "businesses") return viewer.role === "business";
  return false;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  chip: {
    paddingVertical: 4, paddingHorizontal: 8,
    backgroundColor: colors.panelLight,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  text: { color: colors.textDim, fontSize: 10, fontWeight: "600" },
  textActive: { color: "#fff" },
});
