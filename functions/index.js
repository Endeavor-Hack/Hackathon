/*
 * Cloud Functions backing Endeavour's AI features + push delivery.
 *
 * Deploy:
 *   cd functions && npm install
 *   firebase functions:secrets:set ANTHROPIC_API_KEY
 *   firebase deploy --only functions
 *
 * Callable functions require the caller to be signed in; the app calls
 * them via httpsCallable('chatWithAssistant') etc. through the same
 * Firebase project — no API key is ever shipped to the client.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");
const { Expo } = require("expo-server-sdk");
const os = require("os");
const path = require("path");
const fs = require("fs");

admin.initializeApp();

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

function anthropicClient() {
  return new Anthropic.default({ apiKey: ANTHROPIC_API_KEY.value() });
}

const SYSTEM_PROMPT = `You are the Endeavour profile assistant — an AI coach helping students, alumni, and professionals of Richfield/AAA build a strong professional presence on the Endeavour platform.

You help users:
- Improve their profile (photo, headline, summary, skills, experience, projects)
- Write compelling posts and content that engages employers and peers
- Approach making meaningful professional connections
- Prepare for opportunities (internships, learnerships, graduate roles)
- Understand how the platform's features work

Be concise, warm, and specific — cite what's missing from the user's profile when giving advice. Never invent facts about the user; if the profile is empty on some field, say so.`;

exports.chatWithAssistant = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");

    const { messages } = req.data || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "messages array is required.");
    }

    // Pull the caller's profile to feed the assistant context — this is
    // what makes it "context-aware" rather than a generic chatbot.
    const uid = req.auth.uid;
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    const profile = snap.exists ? snap.data() : {};
    const profileSummary = summarizeProfile(profile);

    const client = anthropicClient();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: SYSTEM_PROMPT + "\n\nUser's current profile:\n" + profileSummary,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return { reply: text };
  }
);

// Accepts either { cvText } (client did the extraction) or
// { cvPath } (Storage path — server downloads the PDF and parses).
// Storage path form is used from the mobile app since pdf-parse ships
// awkwardly to React Native.
exports.parseCvText = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    let cvText = req.data?.cvText;
    const cvPath = req.data?.cvPath;

    if (!cvText && cvPath) {
      // Only allow reading the caller's own CV
      if (!cvPath.startsWith(`cvs/${req.auth.uid}/`)) {
        throw new HttpsError("permission-denied", "You can only parse your own CV.");
      }
      const bucket = admin.storage().bucket();
      const [buf] = await bucket.file(cvPath).download();
      const pdfParse = require("pdf-parse");
      const parsed = await pdfParse(buf);
      cvText = parsed.text || "";
    }
    if (!cvText || cvText.length < 50) throw new HttpsError("invalid-argument", "cvText or cvPath is required.");

    const client = anthropicClient();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: `You extract structured resume data. Respond ONLY with valid JSON matching:
{
  "headline": string,
  "summary": string,
  "skills": string[],
  "workExperience": [{"role": string, "company": string, "years": string, "description": string}],
  "certifications": [{"name": string, "issuer": string, "year": string}],
  "awards": [{"name": string, "year": string, "description": string}]
}
If a field is not present in the CV, use empty string or empty array. Do not invent facts.`,
      messages: [{ role: "user", content: cvText.slice(0, 20000) }],
    });

    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      return { parsed };
    } catch (err) {
      throw new HttpsError("internal", "Could not parse AI response as JSON: " + err.message);
    }
  }
);

// Push notification fan-out: whenever a notification doc is written,
// look up the recipient's Expo push token and send it. Runs server-side
// so the mobile client doesn't need to know anyone else's tokens.
const expo = new Expo();
exports.deliverPush = onDocumentCreated("notifications/{notifId}", async (event) => {
  const notif = event.data.data();
  if (!notif?.userId) return;
  const userSnap = await admin.firestore().doc(`users/${notif.userId}`).get();
  const token = userSnap.data()?.expoPushToken;
  if (!token || !Expo.isExpoPushToken(token)) return;

  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      sound: "default",
      title: notifTitle(notif.type),
      body: notif.message,
      data: { relatedId: notif.relatedId, type: notif.type },
    }]);
  } catch (err) {
    console.error("Push send failed", err);
  }
});

// Video pipeline: whenever a raw upload appears at
// videos/{uid}/raw/*, transcode it to a normalized H.264 720p, generate
// a thumbnail, upload both to videos/{uid}/processed/, then patch any
// post that referenced videoRawPath with the final URLs. Raw uploads
// dumped directly into a post feed are explicitly banned by the brief.
exports.processVideo = onObjectFinalized(
  { memory: "1GiB", timeoutSeconds: 300, cpu: 2 },
  async (event) => {
    const filePath = event.data.name;
    if (!filePath?.includes("/raw/") || !filePath.startsWith("videos/")) return;

    const ffmpeg = require("fluent-ffmpeg");
    const ffmpegStatic = require("ffmpeg-static");
    ffmpeg.setFfmpegPath(ffmpegStatic);

    const parts = filePath.split("/"); // videos/{uid}/raw/{name}
    const uid = parts[1];
    const fileName = parts[3];
    const base = fileName.replace(/\.[^.]+$/, "");
    const processedPath = `videos/${uid}/processed/${base}.mp4`;
    const thumbPath = `videos/${uid}/processed/${base}.jpg`;

    const bucket = admin.storage().bucket();
    const tmpIn = path.join(os.tmpdir(), fileName);
    const tmpOut = path.join(os.tmpdir(), `out-${base}.mp4`);
    const tmpThumb = path.join(os.tmpdir(), `thumb-${base}.jpg`);

    await bucket.file(filePath).download({ destination: tmpIn });

    await new Promise((resolve, reject) => {
      ffmpeg(tmpIn)
        .outputOptions([
          "-c:v libx264", "-preset veryfast", "-crf 23",
          "-vf scale='min(1280,iw)':-2",
          "-c:a aac", "-b:a 128k",
          "-movflags +faststart",
        ])
        .save(tmpOut)
        .on("end", resolve).on("error", reject);
    });

    await new Promise((resolve, reject) => {
      ffmpeg(tmpIn)
        .screenshots({ count: 1, filename: path.basename(tmpThumb), folder: path.dirname(tmpThumb), size: "640x?" })
        .on("end", resolve).on("error", reject);
    });

    await bucket.upload(tmpOut, { destination: processedPath, metadata: { contentType: "video/mp4" } });
    await bucket.upload(tmpThumb, { destination: thumbPath, metadata: { contentType: "image/jpeg" } });

    const videoUrl = await signedUrl(bucket, processedPath);
    const thumbnailUrl = await signedUrl(bucket, thumbPath);

    // Update any post that references this raw upload
    const postsSnap = await admin.firestore()
      .collection("posts").where("videoRawPath", "==", filePath).get();
    for (const doc of postsSnap.docs) {
      await doc.ref.update({
        videoUrl, videoThumbnailUrl: thumbnailUrl, videoStatus: "ready",
      });
    }

    // Clean up
    for (const p of [tmpIn, tmpOut, tmpThumb]) { try { fs.unlinkSync(p); } catch {} }
  }
);

async function signedUrl(bucket, filePath) {
  const [url] = await bucket.file(filePath).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 5, // 5 years
  });
  return url;
}

function summarizeProfile(p) {
  const parts = [];
  if (p.fullName) parts.push(`Name: ${p.fullName}`);
  if (p.role) parts.push(`Role: ${p.role}`);
  if (p.programme) parts.push(`Programme: ${p.programme}`);
  if (p.headline) parts.push(`Headline: ${p.headline}`);
  if (p.summary) parts.push(`Summary: ${p.summary}`);
  if (p.skills?.length) parts.push(`Skills: ${p.skills.join(", ")}`);
  if (p.workExperience?.length) parts.push(`Experience: ${p.workExperience.length} entries`);
  if (p.githubProjects?.length) parts.push(`GitHub projects: ${p.githubProjects.length}`);
  if (!p.photoUrl) parts.push("No profile photo uploaded.");
  return parts.join("\n") || "(profile is empty)";
}

function notifTitle(type) {
  const map = {
    connection_request: "New connection request",
    connection_accepted: "Connection accepted",
    post_like: "Someone reacted to your post",
    post_reaction: "Someone reacted to your post",
    post_comment: "New comment on your post",
    opportunity_match: "New opportunity for you",
    announcement: "Platform announcement",
    event: "New event",
    endorsement: "You got a skill endorsement",
    recommendation: "New recommendation",
    message: "New message",
    application_status: "Application update",
  };
  return map[type] || "Endeavour";
}
