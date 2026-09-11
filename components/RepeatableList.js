// A reusable "add more of these" list of structured items. Used
// everywhere the profile screen needs a list you can add rows to —
// work experience, entrepreneurial ventures, GitHub projects, live
// project URLs, digital badges, certifications, awards, leadership
// roles, clubs and activities.
//
// Callers give it a `fields` array describing each item's shape and
// what to render for it; this file doesn't know or care what the
// items represent.
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/colors";

export default function RepeatableList({ label, items, fields, onChange, addLabel = "Add" }) {
  function updateItem(index, key, value) {
    const next = items.slice();
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  }
  function removeItem(index) {
    const next = items.slice();
    next.splice(index, 1);
    onChange(next);
  }
  function addItem() {
    const blank = {};
    fields.forEach((f) => { blank[f.key] = ""; });
    onChange([...(items || []), blank]);
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.groupLabel}>{label}</Text>

      {(items || []).length === 0 && (
        <Text style={styles.emptyText}>None added yet.</Text>
      )}

      {(items || []).map((item, i) => (
        <View key={i} style={styles.itemCard}>
          {fields.map((f) => (
            <View key={f.key} style={{ marginBottom: 8 }}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                value={item[f.key] || ""}
                onChangeText={(v) => updateItem(i, f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={colors.textDim}
                multiline={f.multiline}
                keyboardType={f.keyboardType}
                style={[styles.input, f.multiline && styles.multiline]}
              />
            </View>
          ))}
          <TouchableOpacity onPress={() => removeItem(i)} style={styles.removeBtn}>
            <Text style={styles.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity onPress={addItem} style={styles.addBtn}>
        <Text style={styles.addBtnText}>+ {addLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  groupLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 },
  emptyText: { color: colors.textDim, fontSize: 12, marginBottom: 8 },
  itemCard: {
    backgroundColor: colors.panel,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  fieldLabel: { fontSize: 12, color: colors.textDim, marginBottom: 4 },
  input: {
    backgroundColor: colors.panelLight,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 8,
    color: colors.text, fontSize: 14,
  },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  removeBtn: { alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 8 },
  removeBtnText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  addBtn: {
    backgroundColor: "transparent",
    borderWidth: 1, borderColor: colors.border, borderStyle: "dashed",
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: "center",
  },
  addBtnText: { color: colors.accent, fontWeight: "600", fontSize: 13 },
});
