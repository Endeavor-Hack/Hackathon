// The Connections tab. Three sections stacked from top to bottom:
//   • Requests — pending inbound requests, with Accept / Decline
//   • Your Connections — everyone you're already connected to
//   • Discover — every other active student / alumni, minus anyone
//     you're already connected to or have a pending request with.
//     Business accounts don't appear here — this is a peer network,
//     not a directory.
import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { colors, spacing, typography } from "../../../theme/colors";
import { getDisplayName } from "../../../lib/displayName";
import { createNotification } from "../../../lib/notify";
import { logSnapshotError } from "../../../lib/handleSnapshotError";
import UserRow from "../../../components/UserRow";
import FireLoader from "../../../components/FireLoader";
import { useRouter } from "expo-router";

export default function Connections() {
  const router = useRouter();
  const { firebaseUser, userDoc: myUserDoc } = useAuth();
  const myUid = firebaseUser?.uid;

  const [allUsers, setAllUsers] = useState([]);
  const [outgoing, setOutgoing] = useState([]); // connection docs I sent
  const [incoming, setIncoming] = useState([]); // connection docs sent to me
  const [loading, setLoading] = useState(true);

  // All active students/alumni, for the discover list. (Business/admin
  // accounts are excluded — this is a peer-to-peer network, not a
  // business directory; that's a separate feature.)
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "in", ["student", "alumni"]),
      where("status", "==", "active")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      logSnapshotError("Users list error", err);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!myUid) return;
    const q = query(collection(db, "connections"), where("fromUserId", "==", myUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOutgoing(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => logSnapshotError("Outgoing connections error", err));
    return unsubscribe;
  }, [myUid]);

  useEffect(() => {
    if (!myUid) return;
    const q = query(collection(db, "connections"), where("toUserId", "==", myUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIncoming(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => logSnapshotError("Incoming connections error", err));
    return unsubscribe;
  }, [myUid]);

  // Derive the three lists the screen actually shows, from the raw data above.
  const { pendingIncoming, myConnections, discoverUsers } = useMemo(() => {
    const pendingIncoming = incoming.filter((c) => c.status === "pending");

    const acceptedOtherIds = new Set([
      ...outgoing.filter((c) => c.status === "accepted").map((c) => c.toUserId),
      ...incoming.filter((c) => c.status === "accepted").map((c) => c.fromUserId),
    ]);
    const outgoingPendingIds = new Set(
      outgoing.filter((c) => c.status === "pending").map((c) => c.toUserId)
    );
    const incomingPendingIds = new Set(pendingIncoming.map((c) => c.fromUserId));

    const myConnections = allUsers.filter((u) => acceptedOtherIds.has(u.id));

    const discoverUsers = allUsers.filter(
      (u) =>
        u.id !== myUid &&
        !acceptedOtherIds.has(u.id) &&
        !outgoingPendingIds.has(u.id) &&
        !incomingPendingIds.has(u.id)
    );

    return { pendingIncoming, myConnections, discoverUsers };
  }, [allUsers, outgoing, incoming, myUid]);

  function findUser(uid) {
    return allUsers.find((u) => u.id === uid);
  }

  async function sendRequest(toUserId) {
    await addDoc(collection(db, "connections"), {
      fromUserId: myUid,
      toUserId,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    await createNotification(
      toUserId,
      "connection_request",
      `${getDisplayName(myUserDoc)} sent you a connection request.`
    );
  }

  async function acceptRequest(connectionId) {
    const request = incoming.find((c) => c.id === connectionId);
    await updateDoc(doc(db, "connections", connectionId), { status: "accepted" });
    if (request) {
      await createNotification(
        request.fromUserId,
        "connection_accepted",
        `${getDisplayName(myUserDoc)} accepted your connection request.`
      );
    }
  }

  async function declineRequest(connectionId) {
    await deleteDoc(doc(db, "connections", connectionId));
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <FireLoader />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={[typography.h1, { marginBottom: spacing.lg }]}>Connections</Text>

      {pendingIncoming.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Requests</Text>
          {pendingIncoming.map((req) => {
            const fromUser = findUser(req.fromUserId);
            return (
              <UserRow
                key={req.id}
                uid={req.fromUserId}
                photoUrl={fromUser?.photoUrl}
                name={fromUser ? getDisplayName(fromUser) : "Unknown"}
                role={fromUser?.role}
                primaryLabel="Accept"
                onPrimary={() => acceptRequest(req.id)}
                secondaryLabel="Decline"
                onSecondary={() => declineRequest(req.id)}
              />
            );
          })}
        </>
      )}

      <Text style={styles.sectionTitle}>
        Your Connections {myConnections.length > 0 ? `(${myConnections.length})` : ""}
      </Text>
      {myConnections.length === 0 ? (
        <Text style={typography.bodyDim}>No connections yet — send a request below.</Text>
      ) : (
        myConnections.map((u) => (
          <UserRow
            key={u.id}
            uid={u.id}
            photoUrl={u.photoUrl}
            name={getDisplayName(u)}
            role={u.role}
            onPress={() => router.push(`/user/${u.id}`)}
          />
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Discover People</Text>
      {discoverUsers.length === 0 ? (
        <Text style={typography.bodyDim}>No one new to connect with right now.</Text>
      ) : (
        discoverUsers.map((u) => (
          <UserRow
            key={u.id}
            uid={u.id}
            photoUrl={u.photoUrl}
            name={getDisplayName(u)}
            role={u.role}
            primaryLabel="Connect"
            onPrimary={() => sendRequest(u.id)}
            onPress={() => router.push(`/user/${u.id}`)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
});
