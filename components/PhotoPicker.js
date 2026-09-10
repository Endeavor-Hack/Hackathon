// components/PhotoPicker.js
import { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";
import { colors, spacing, radius } from "../theme/colors";

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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const path = storagePath || `profile-photos/${uid}/photo.jpg`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      const url = await getDownloadURL(ref(storage, path));
      onUploaded(url, path);
    } catch (err) {
      setError(err.message);
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
