// A tappable circular photo. On tap it opens the OS photo picker,
// uploads what you pick to Firebase Storage, and hands the URL back
// via the onUploaded callback. Used for both profile photos
// (profile-photos/{uid}/photo.jpg) and business logos
// (company-logos/{uid}/logo.jpg) — the caller decides the path.
import { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";
import { colors, spacing, radius } from "../theme/colors";
import { uriToBlob } from "../lib/uriToBlob";

// Uploads to /profile-photos/{uid}/photo.jpg — storage.rules permits
// signed-in read (so other users' profiles can render the image) and
// owner-only write.
export default function PhotoPicker({ uid, currentUrl, onUploaded, storagePath, label = "Profile photo" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function pick() {
    setError("");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError("Photo library permission is required."); return; }

    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });
    } catch (err) {
      setError("Could not open picker: " + err.message);
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const path = storagePath || `profile-photos/${uid}/photo.jpg`;
      const blob = await uriToBlob(asset.uri);
      await uploadBytes(ref(storage, path), blob, {
        contentType: asset.mimeType || "image/jpeg",
      });
      const url = await getDownloadURL(ref(storage, path));
      onUploaded(url, path);
    } catch (err) {
      const msg = friendlyStorageError(err);
      setError(msg);
      Alert.alert("Upload failed", msg);
      console.error("PhotoPicker upload error:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={pick} disabled={uploading} style={styles.circle}>
        {uploading ? (
          <ActivityIndicator color={colors.accent} />
        ) : currentUrl ? (
          <Image source={{ uri: currentUrl }} style={styles.image} />
        ) : (
          <Text style={{ color: colors.textDim, fontSize: 12 }}>Tap to upload</Text>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

function friendlyStorageError(err) {
  const code = err?.code || "";
  if (code.includes("unauthorized") || code.includes("permission")) {
    return "Storage rules blocked the upload — sign out and back in.";
  }
  if (code.includes("canceled")) return "Upload cancelled.";
  if (code.includes("quota")) return "Storage quota exceeded.";
  if (code.includes("unknown")) return "Network error — check your connection.";
  return err?.message || "Upload failed.";
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.textDim, marginBottom: 6 },
  circle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.panelLight,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: "center", alignItems: "center",
    overflow: "hidden",
  },
  image: { width: 96, height: 96 },
  err: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
