// components/CreatePostBox.js
import { useState } from "react";
import { View, TextInput, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { db, storage } from "../firebase/config";
import { colors, spacing, radius } from "../theme/colors";
import { getDisplayName } from "../lib/displayName";
import ThemedButton from "./ThemedButton";

export default function CreatePostBox({ firebaseUser, userDoc }) {
  const [text, setText] = useState("");
  const [video, setVideo] = useState(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function pickVideo() {
    setError("");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError("Media library permission is required."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 90,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setVideo(result.assets[0]);
  }

  async function handlePost() {
    const trimmed = text.trim();
    if (!trimmed && !video) return;

    setPosting(true);
    setError("");
    try {
      let videoRawPath = null;
      if (video) {
        const ext = (video.fileName?.split(".").pop() || video.uri.split(".").pop() || "mp4").toLowerCase();
        videoRawPath = `videos/${firebaseUser.uid}/raw/${Date.now()}.${ext}`;
        const blob = await (await fetch(video.uri)).blob();
        await uploadBytes(ref(storage, videoRawPath), blob, { contentType: video.mimeType || "video/mp4" });
      }

      await addDoc(collection(db, "posts"), {
        authorId: firebaseUser.uid,
        authorName: getDisplayName(userDoc),
        authorRole: userDoc?.role || "student",
        text: trimmed,
        likedBy: [],
        reactions: {},
        videoRawPath,
        videoStatus: videoRawPath ? "processing" : null,
        createdAt: serverTimestamp(),
      });
      setText("");
      setVideo(null);
    } catch (err) {
      console.error("Failed to create post:", err.code, err.message);
      setError(err.code === "permission-denied"
        ? "Couldn't post — check Firestore security rules."
        : `${err.code || "error"}: ${err.message}`);
    } finally {
      setPosting(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Share an update, achievement, or question…"
        placeholderTextColor={colors.textDim}
        multiline
        value={text}
        onChangeText={setText}
      />

      <View style={styles.toolbar}>
        <TouchableOpacity onPress={pickVideo} style={styles.toolBtn}>
          <Text style={styles.toolBtnText}>{video ? `🎬 ${video.fileName || "video"}` : "🎬 Add video"}</Text>
        </TouchableOpacity>
        {video && (
          <TouchableOpacity onPress={() => setVideo(null)}>
            <Text style={{ color: colors.danger, fontSize: 12 }}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={{ marginTop: spacing.sm }}>
        {posting ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <ThemedButton title="Post" onPress={handlePost} disabled={!text.trim() && !video} />
        )}
      </View>
      {video && (
        <Text style={styles.hint}>
          Your video will be transcoded and a thumbnail generated automatically. It may take a minute to appear on your post.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.panel, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  input: { color: colors.text, fontSize: 14, minHeight: 60, textAlignVertical: "top" },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm },
  toolBtn: {
    backgroundColor: colors.panelLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, paddingVertical: 4, paddingHorizontal: 10,
  },
  toolBtnText: { color: colors.text, fontSize: 12 },
  errorText: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  hint: { color: colors.textDim, fontSize: 11, marginTop: 6, fontStyle: "italic" },
});
