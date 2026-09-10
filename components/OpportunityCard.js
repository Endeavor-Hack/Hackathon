// components/OpportunityCard.js
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/colors";
import ThemedButton from "./ThemedButton";

const TYPE_LABELS = {
  internship: "Internship",
  learnership: "Learnership",
  "part-time": "Part-time",
  graduate: "Graduate Role",
};

export default function OpportunityCard({ opportunity, hasApplied, onApply, applying }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{opportunity.title}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{TYPE_LABELS[opportunity.type] || opportunity.type}</Text>
        </View>
      </View>

      <Text style={styles.company}>{opportunity.companyName}</Text>
      {opportunity.location ? <Text style={styles.meta}>📍 {opportunity.location}</Text> : null}

      {opportunity.description ? (
        <Text style={styles.description} numberOfLines={3}>{opportunity.description}</Text>
      ) : null}

      {(opportunity.skillsRequired || []).length > 0 && (
        <View style={styles.skillsRow}>
          {opportunity.skillsRequired.map((skill) => (
            <View key={skill} style={styles.skillChip}>
              <Text style={styles.skillChipText}>{skill}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: spacing.sm }}>
        <ThemedButton
          title={hasApplied ? "Applied ✓" : "Apply"}
          variant={hasApplied ? "secondary" : "primary"}
          disabled={hasApplied}
          loading={applying}
          onPress={onApply}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { color: colors.text, fontWeight: "700", fontSize: 15, flex: 1, marginRight: spacing.sm },
  typeBadge: {
    backgroundColor: colors.panelLight,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  typeBadgeText: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  company: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  description: { color: colors.text, fontSize: 13, lineHeight: 18, marginTop: spacing.sm },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  skillChip: {
    backgroundColor: colors.panelLight,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  skillChipText: { color: colors.textDim, fontSize: 11 },
});
