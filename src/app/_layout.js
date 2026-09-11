// Root layout. Wraps the whole app in the AuthProvider so every
// screen can call useAuth(), and hides the default navigation header
// because we render our own where we need one.
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
