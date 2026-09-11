/*
 * Bootstrap the very first admin account.
 *
 * The app has a self-serve admin signup path too (Administrator role
 * on the signup screen + passcode), but for the very first admin —
 * before there's anyone around to know the passcode — this script is
 * the escape hatch.
 *
 * Steps:
 *   1. Grab a Firebase service-account key:
 *        Firebase console → Project settings → Service accounts →
 *        "Generate new private key". Save it as service-account.json
 *        at the repo root. It's gitignored — never commit it.
 *
 *   2. Have the person sign up in the app as any role. Copy their UID
 *      from Firebase Console → Authentication → Users.
 *
 *   3. Run: node scripts/make-admin.js <uid>
 *
 * What it does:
 *   • Sets a custom auth claim { admin: true } on their auth account
 *     (this is what firestore.rules checks for privileged writes).
 *   • Flips their users/{uid} doc to role: "admin", status: "active".
 *
 * They need to sign out and back in for the fresh token to pick up
 * the new claim.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "..", "service-account.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    "Missing service-account.json at repo root.\n" +
    "Download one from Firebase console → Project settings → Service accounts."
  );
  process.exit(1);
}

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/make-admin.js <uid>");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

(async () => {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    await admin.firestore().doc(`users/${uid}`).set(
      { role: "admin", status: "active", promotedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    console.log(`✓ ${uid} is now an admin.`);
    console.log("They must sign out and back in for the custom claim to take effect.");
  } catch (err) {
    console.error("Failed to promote user:", err);
    process.exit(1);
  }
})();
