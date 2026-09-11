// Circular avatar. Shows the person's uploaded photo when we have it,
// otherwise falls back to their first initial on the brand accent
// colour.
//
// Pass a `uid` and the component will pull the photo from the shared
// cache (see lib/userPhotoCache). If you already have the URL in hand
// — e.g. it was denormalised onto a post doc when it was written —
// pass it as `photoUrl` too, and we'll use that immediately instead
// of waiting on the cache to hydrate.
import { View, Text, Image, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { useUserPhoto } from "../lib/userPhotoCache";

export default function Avatar({ uid, name, photoUrl, size = 40, style }) {
  const cachedUrl = useUserPhoto(uid);
  const src = photoUrl || cachedUrl;
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const dim = { width: size, height: size, borderRadius: size / 2 };

  if (src) {
    return <Image source={{ uri: src }} style={[dim, style]} />;
  }

  return (
    <View style={[dim, styles.fallback, style]}>
      <Text style={[styles.text, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  text: { color: "#fff", fontWeight: "800" },
});
