// components/NotificationItem.js
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing, radius } from "../theme/colors";

const TYPE_ICONS = {
  connection_request: "🤝",
  connection_accepted: "✅",
  post_like: "❤️",
  announcement: "📢",
  opportunity_match: "💼",
};

function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationItem({ notification, onPress }) {
  const createdDate = notification.createdAt?.toDate ? notification.createdAt.toDate() : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, !notification.read && styles.unreadRow]}
    >
      <Text style={styles.icon}>{TYPE_ICONS[notification.type] || "🔔"}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.message}>{notification.message}</Text>
        <Text style={styles.time}>{timeAgo(createdDate)}</Text>
      </View>
      {!notification.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
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
  unreadRow: { borderColor: colors.accent },
  icon: { fontSize: 20, marginRight: spacing.sm },
  message: { color: colors.text, fontSize: 14, lineHeight: 19 },
  time: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: spacing.sm,
  },
});
