/*
 * Every server-side thing the app relies on lives in this file:
 *   • Admin bootstrap (claimAdmin)
 *   • Email OTP for signup + password reset
 *   • The AI features (chatbot, CV parsing, CV scoring, interview prep)
 *   • Video transcoding
 *   • Push notification fan-out
 *
 * The mobile app talks to these via httpsCallable(); it never sees an
 * API key because the keys live on Firebase's secret manager and are
 * only injected into the runtime here.
 *
 * First-time deploy:
 *   cd functions && npm install
 *   firebase functions:secrets:set GROQ_API_KEY
 *   firebase functions:secrets:set EMAIL_USER
 *   firebase functions:secrets:set EMAIL_PASSWORD
 *   firebase deploy --only functions
 *
 * We picked Groq for the AI calls because it's OpenAI-compatible, free
 * tier is generous, and it's what the team's other project (Graduate
 * Workfinder) was already using — one key across both apps.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Expo } = require("expo-server-sdk");
const os = require("os");
const path = require("path");
const fs = require("fs");

admin.initializeApp();

const GROQ_API_KEY = defineSecret("GROQ_API_KEY");
const EMAIL_USER = defineSecret("EMAIL_USER");
const EMAIL_PASSWORD = defineSecret("EMAIL_PASSWORD");

// The passcode you type on the Administrator signup screen. Lives
// only inside the function runtime — a curious user reading the app's
// JS bundle can't find it, because it's never bundled. To rotate it,
// change this string and redeploy functions.
const ADMIN_SIGNUP_PASSWORD = "Mzma@2204";

// Groq model to use across every AI call. Matches the model the
// workfinder website is on; swap in one place if you want to try a
// different one (e.g. "llama-3.3-70b-versatile").
const GROQ_MODEL = "openai/gpt-oss-120b";

// Thin wrapper around Groq's OpenAI-compatible chat completions
// endpoint. Returns just the assistant's text so callers don't need
// to know the response shape.
async function groqChat({ system, user, maxTokens = 800 }) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  if (Array.isArray(user)) {
    // Pass through a full conversation (used by the chatbot)
    messages.push(...user);
  } else {
    messages.push({ role: "user", content: user });
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY.value()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: GROQ_MODEL, max_tokens: maxTokens, messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new HttpsError("internal", `AI request failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";
  // Groq / gpt-oss sometimes wraps JSON in fences even when told not to.
  return raw.replace(/```json|```/g, "").trim();
}

function extractJson(text, opener = "{", closer = "}") {
  const start = text.indexOf(opener);
  const end = text.lastIndexOf(closer);
  if (start === -1 || end === -1) throw new HttpsError("internal", "AI response was not valid JSON.");
  return JSON.parse(text.slice(start, end + 1));
}

const OTP_MINUTES = 10;

// ============================================================
// ADMIN SELF-PROMOTION
// ============================================================
// Fires when someone picks the Administrator role during signup and
// types the passcode. We check it here so the value never leaves the
// server. If it matches, the caller gets the admin custom claim +
// their user doc is created with role: "admin". If it doesn't, we
// delete the fresh auth account so they can try again cleanly on the
// same email.
exports.claimAdmin = onCall({}, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const provided = String(req.data?.adminPassword || "");

  if (provided !== ADMIN_SIGNUP_PASSWORD) {
    // Wrong passcode → tear down the account we just created so the
    // user can retry cleanly on the same email.
    try { await admin.auth().deleteUser(req.auth.uid); } catch (_) {}
    throw new HttpsError("permission-denied", "Incorrect admin passcode.");
  }

  await admin.auth().setCustomUserClaims(req.auth.uid, { admin: true });
  await admin.firestore().doc(`users/${req.auth.uid}`).set({
    email: req.auth.token.email || null,
    role: "admin",
    status: "active",
    emailVerified: true,
    promotedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true };
});

// ============================================================
// EMAIL + OTP
// ============================================================
// Firebase Auth ships link-based email verification out of the box,
// but we wanted the friendlier "type this 6-digit code" flow instead.
// The code hash + expiry live in Firestore under otpCodes/{uid} (for
// signup verification) or otpCodes/{uid}_reset (for password reset);
// we only ever store the hash, never the plaintext.
//
// One-time setup:
//   firebase functions:secrets:set EMAIL_USER      # e.g. hello@gmail.com
//   firebase functions:secrets:set EMAIL_PASSWORD  # Gmail app password
// ============================================================

function otpTransporter() {
  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: EMAIL_USER.value(), pass: EMAIL_PASSWORD.value() },
  });
}

function generateOtp() {
  const crypto = require("crypto");
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(otp) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

async function sendOtpEmail(email, otp, purpose) {
  const subject = purpose === "reset"
    ? "Endeavour password reset code"
    : "Your Endeavour verification code";
  const heading = purpose === "reset" ? "Password Reset" : "Verify your email";

  await otpTransporter().sendMail({
    from: `"Endeavour" <${EMAIL_USER.value()}>`,
    to: email,
    subject,
    text: `Your Endeavour ${purpose === "reset" ? "password reset" : "verification"} code is: ${otp}\n\nThis code expires in ${OTP_MINUTES} minutes.`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:auto;padding:24px;background:#0A0E1A;color:#F5EDE4;">
        <h1 style="margin:0 0 6px;font-size:22px;">Endeavour<span style="color:#F2560A">.</span></h1>
        <h2 style="font-size:16px;color:#9AA3BD;margin:0 0 20px;">${heading}</h2>
        <p>Your code is:</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:10px;text-align:center;padding:20px;background:#12182B;border-radius:10px;color:#F2560A;margin:20px 0;">${otp}</div>
        <p style="color:#9AA3BD;font-size:13px;">This code expires in <strong>${OTP_MINUTES} minutes</strong>.</p>
        <p style="color:#9AA3BD;font-size:13px;">If you didn't request this, you can ignore this email.</p>
      </div>`,
  });
}

async function getUidByEmail(email) {
  const rec = await admin.auth().getUserByEmail(email);
  return rec.uid;
}

// -------- Signup OTP --------
exports.sendSignupOtp = onCall(
  { secrets: [EMAIL_USER, EMAIL_PASSWORD] },
  async (req) => {
    const email = String(req.data?.email || "").trim().toLowerCase();
    if (!email) throw new HttpsError("invalid-argument", "Email required.");

    let uid;
    try { uid = await getUidByEmail(email); }
    catch { throw new HttpsError("not-found", "No account with that email."); }

    const rec = await admin.auth().getUser(uid);
    if (rec.emailVerified) throw new HttpsError("failed-precondition", "Email already verified.");

    const otp = generateOtp();
    await admin.firestore().doc(`otpCodes/${uid}`).set({
      hash: hashOtp(otp),
      expiresAt: Date.now() + OTP_MINUTES * 60 * 1000,
      purpose: "signup",
    });
    await sendOtpEmail(email, otp, "signup");
    return { ok: true };
  }
);

exports.verifySignupOtp = onCall(
  {},
  async (req) => {
    const email = String(req.data?.email || "").trim().toLowerCase();
    const otp = String(req.data?.otp || "").trim();
    if (!/^\d{6}$/.test(otp)) throw new HttpsError("invalid-argument", "OTP must be 6 digits.");
    if (!email) throw new HttpsError("invalid-argument", "Email required.");

    let uid;
    try { uid = await getUidByEmail(email); }
    catch { throw new HttpsError("not-found", "No account with that email."); }

    const snap = await admin.firestore().doc(`otpCodes/${uid}`).get();
    if (!snap.exists) throw new HttpsError("failed-precondition", "No pending verification. Request a new code.");
    const data = snap.data();
    if (data.purpose !== "signup") throw new HttpsError("failed-precondition", "That code isn't for signup.");
    if (Date.now() > data.expiresAt) throw new HttpsError("deadline-exceeded", "That code has expired.");
    if (hashOtp(otp) !== data.hash) throw new HttpsError("permission-denied", "Incorrect code.");

    await admin.auth().updateUser(uid, { emailVerified: true });
    await admin.firestore().doc(`users/${uid}`).set({ emailVerified: true }, { merge: true });
    await snap.ref.delete();
    return { ok: true };
  }
);

// -------- Password reset OTP --------
exports.sendPasswordResetOtp = onCall(
  { secrets: [EMAIL_USER, EMAIL_PASSWORD] },
  async (req) => {
    const email = String(req.data?.email || "").trim().toLowerCase();
    if (!email) throw new HttpsError("invalid-argument", "Email required.");

    // Never leak whether an account exists — mirror the workfinder.
    let uid;
    try { uid = await getUidByEmail(email); }
    catch { return { ok: true }; }

    const otp = generateOtp();
    await admin.firestore().doc(`otpCodes/${uid}_reset`).set({
      hash: hashOtp(otp),
      expiresAt: Date.now() + OTP_MINUTES * 60 * 1000,
      purpose: "reset",
    });
    try { await sendOtpEmail(email, otp, "reset"); } catch (err) { console.error("Reset email failed", err); }
    return { ok: true };
  }
);

exports.resetPasswordWithOtp = onCall(
  {},
  async (req) => {
    const email = String(req.data?.email || "").trim().toLowerCase();
    const otp = String(req.data?.otp || "").trim();
    const newPassword = String(req.data?.newPassword || "");
    if (!/^\d{6}$/.test(otp)) throw new HttpsError("invalid-argument", "OTP must be 6 digits.");
    if (newPassword.length < 8) throw new HttpsError("invalid-argument", "Password must be at least 8 characters.");

    let uid;
    try { uid = await getUidByEmail(email); }
    catch { throw new HttpsError("permission-denied", "Incorrect code."); } // uniform error

    const snap = await admin.firestore().doc(`otpCodes/${uid}_reset`).get();
    if (!snap.exists) throw new HttpsError("failed-precondition", "No pending reset. Request a new code.");
    const data = snap.data();
    if (Date.now() > data.expiresAt) throw new HttpsError("deadline-exceeded", "That code has expired.");
    if (hashOtp(otp) !== data.hash) throw new HttpsError("permission-denied", "Incorrect code.");

    await admin.auth().updateUser(uid, { password: newPassword });
    await snap.ref.delete();
    return { ok: true };
  }
);

const SYSTEM_PROMPT = `You are the Endeavour profile assistant — an AI coach helping students, alumni, and professionals of Richfield/AAA build a strong professional presence on the Endeavour platform.

You help users:
• Improve their profile (photo, headline, summary, skills, experience, projects)
• Write compelling posts and content that engages employers and peers
• Approach making meaningful professional connections
• Prepare for opportunities (internships, learnerships, graduate roles)
• Understand how the platform's features work

Be concise, warm, and specific — cite what's missing from the user's profile when giving advice. Never invent facts about the user; if the profile is empty on some field, say so.

IMPORTANT FORMATTING RULES — your reply is rendered as plain text in a
chat bubble, not as Markdown:
• Do NOT use asterisks for emphasis (no **bold** or *italic*).
• Do NOT use hashes for headings (no # or ## lines).
• Do NOT use backticks around code snippets.
• For bullets use the character "•" followed by a space, one item per line.
• Numbered lists are fine (use "1.", "2." etc.).
• Line breaks are respected.`;

exports.chatWithAssistant = onCall(
  { secrets: [GROQ_API_KEY] },
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

    const reply = await groqChat({
      system: SYSTEM_PROMPT + "\n\nUser's current profile:\n" + profileSummary,
      user: messages,
      maxTokens: 800,
    });
    return { reply };
  }
);

// Accepts either { cvText } (client did the extraction) or
// { cvPath } (Storage path — server downloads the PDF and parses).
// Storage path form is used from the mobile app since pdf-parse ships
// awkwardly to React Native.
exports.parseCvText = onCall(
  { secrets: [GROQ_API_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    let cvText = req.data?.cvText;
    const cvPath = req.data?.cvPath;

    if (!cvText && cvPath) {
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

    const raw = await groqChat({
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
      user: cvText.slice(0, 20000),
      maxTokens: 1500,
    });
    return { parsed: extractJson(raw) };
  }
);

// Whenever any notification doc is written, look up the recipient's
// Expo push token and send them the OS-level banner. Runs server-side
// so the mobile client never needs to know anyone else's push token.
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

// ============================================================
// INTERVIEW PREP
// ============================================================
// Two calls — one generates the question list, the other scores each
// answer + gives written feedback. Both nudge the model into strict
// JSON so the client can render the results without doing any
// natural-language parsing of its own.

exports.generateInterviewQuestions = onCall(
  { secrets: [GROQ_API_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    const role = String(req.data?.role || "").trim();
    const type = String(req.data?.type || "").trim();
    const count = Math.min(10, Math.max(1, Number(req.data?.count) || 5));
    if (!role || !type) throw new HttpsError("invalid-argument", "role and type are required.");

    const raw = await groqChat({
      user: `Generate exactly ${count} ${type} interview questions for a graduate applying for a "${role}" role. Return ONLY a JSON array of strings, no preamble, no markdown, no code fences.
Example: ["Question 1?", "Question 2?"]`,
      maxTokens: 700,
    });
    return { questions: extractJson(raw, "[", "]") };
  }
);

exports.getInterviewFeedback = onCall(
  { secrets: [GROQ_API_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    const question = String(req.data?.question || "").trim();
    const answer = String(req.data?.answer || "").trim();
    if (!question || !answer) throw new HttpsError("invalid-argument", "question and answer are required.");

    const raw = await groqChat({
      user: `You are an interview coach. A candidate was asked:
"${question}"

They answered:
"${answer}"

Give feedback in ONLY this JSON format, no markdown, no code fences:
{"clarity": <1-10>, "relevance": <1-10>, "feedback": "<2-3 sentences of constructive feedback>"}`,
      maxTokens: 500,
    });
    return extractJson(raw);
  }
);

// ============================================================
// CV CHECKER
// ============================================================
// The client uploads the PDF to Firebase Storage first (same path
// the profile-screen CV upload uses) and passes the path here. The
// function downloads it, extracts text with pdf-parse, and asks the
// model for a score + strengths + specific recommendations.

exports.analyzeCv = onCall(
  { secrets: [GROQ_API_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    const cvPath = req.data?.cvPath;
    if (!cvPath) throw new HttpsError("invalid-argument", "cvPath is required.");
    if (!cvPath.startsWith(`cvs/${req.auth.uid}/`)) {
      throw new HttpsError("permission-denied", "You can only analyse your own CV.");
    }

    const bucket = admin.storage().bucket();
    const [buf] = await bucket.file(cvPath).download();
    const pdfParse = require("pdf-parse");
    const parsedPdf = await pdfParse(buf);
    const cvText = (parsedPdf.text || "").trim();
    if (cvText.length < 50) throw new HttpsError("invalid-argument", "Couldn't read enough text from that CV.");

    const raw = await groqChat({
      user: `You are a CV/resume reviewer helping a graduate improve their CV for the job market.

Read the following CV text and respond in ONLY this JSON format, no markdown, no code fences:
{
  "score": <integer 1-100, how strong and complete this CV is>,
  "strengths": ["<short strength 1>", "<short strength 2>", ...],
  "recommendations": ["<specific missing/improvable item 1>", "<specific missing/improvable item 2>", ...]
}

Rules:
- Do NOT invent or fill in information the candidate didn't provide.
- Only RECOMMEND what could be added or improved (e.g. "Add quantifiable results to your internship bullet points", "No contact email found — add one near the top").
- Keep each recommendation to one specific, actionable sentence.
- Give 3-6 recommendations and 2-4 strengths.

CV text:
"""
${cvText.slice(0, 8000)}
"""`,
      maxTokens: 900,
    });
    const result = extractJson(raw);
    return {
      score: result.score,
      strengths: result.strengths || [],
      recommendations: result.recommendations || [],
    };
  }
);

// Whenever a raw video upload appears at videos/{uid}/raw/*, transcode
// it to a normal H.264 720p mp4, grab a thumbnail at the first frame,
// upload both to videos/{uid}/processed/*, and patch the post that
// referenced the raw upload with the finished URLs. The brief
// explicitly bans dumping raw uploads straight into the feed.
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
