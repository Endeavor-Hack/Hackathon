// src/app/(student)/notifications.js
import { View, FlatList, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography } from "../../../theme/colors";
import { logSnapshotError } from "../../../lib/handleSnapshotError";
import NotificationItem from "../../../components/NotificationItem";

export default function Notifications() {
  const { firebaseUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;

    // Live listener, not polling — satisfies the brief's real-time
    // requirement for in-app alerts. Device-level push notifications
    // (so this fires even when the app is closed) is a separate layer
    // built on top of this later, using Expo's push service.
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", firebaseUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setNotifications(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        logSnapshotError("Notifications listener error", error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [firebaseUser]);

  async function markAsRead(notificationId) {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        ListHeaderComponent={<Text style={[typography.h1, { marginBottom: spacing.md }]}>Notifications</Text>}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => !item.read && markAsRead(item.id)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text style={[typography.bodyDim, { textAlign: "center", marginTop: spacing.xl }]}>
              No notifications yet.
            </Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
