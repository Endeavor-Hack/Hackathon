// The gatekeeper. This screen renders nothing itself — it looks at
// who's signed in (and what their user doc says) and redirects to the
// right place. Every non-auth screen in the app lives inside one of
// the four groups this file routes into: (student), (business),
// (admin), or the standalone /pending screen.
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme/colors";
import FireLoader from "../../components/FireLoader";
import { featureFlags } from "../../lib/featureFlags";

export default function Index() {
  const { firebaseUser, userDoc, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <FireLoader />
      </View>
    );
  }

  if (!firebaseUser) {
    return <Redirect href="/login" />;
  }

  // Auth account exists but the Firestore doc hasn't landed yet (fresh
  // signup, or the claimAdmin function is mid-write). Show the loader
  // rather than guessing at a role and flashing the wrong tab bar.
  if (firebaseUser && userDoc === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <FireLoader />
      </View>
    );
  }

  // Unverified email → force through OTP verification. We read the
  // users/{uid}.emailVerified flag (flipped server-side by the
  // verifySignupOtp Cloud Function) instead of firebaseUser.emailVerified
  // so the state survives a page reload without needing user.reload().
  //
  // Only enforced when the OTP flag is on — otherwise the verification
  // function isn't there to complete the flow and we'd strand the user.
  const emailIsVerified = userDoc?.emailVerified === true || firebaseUser.emailVerified;
  if (featureFlags.otpVerification && userDoc && !emailIsVerified) {
    return <Redirect href={`/verify-otp?email=${encodeURIComponent(firebaseUser.email || "")}`} />;
  }

  if (userDoc?.status === "pending") {
    return <Redirect href="/pending" />;
  }

  if (userDoc?.role === "admin") {
    return <Redirect href="/(admin)" />;
  }

  if (userDoc?.role === "business") {
    return <Redirect href="/(business)" />;
  }

  return <Redirect href="/(student)" />;
}
