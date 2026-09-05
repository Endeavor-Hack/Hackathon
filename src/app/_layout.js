// src/app/_layout.js
import { Stack } from "expo-router";
import { AuthProvider } from "../../context/AuthContext";
import { colors } from "../../theme/colors";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </AuthProvider>
  );
}
