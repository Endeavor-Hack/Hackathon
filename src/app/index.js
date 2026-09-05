// src/app/index.js
// This is the file that currently shows "Welcome to Expo" — this version
// replaces that entirely. It renders nothing itself; its only job is to
// look at auth state and redirect to the right place.
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme/colors";

export default function Index() {
  const { firebaseUser, userDoc, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!firebaseUser) {
    return <Redirect href="/login" />;
  }

  if (userDoc?.status === "pending") {
    return <Redirect href="/pending" />;
  }

  if (userDoc?.role === "business") {
    return <Redirect href="/(business)" />;
  }

  return <Redirect href="/(student)" />;
}
