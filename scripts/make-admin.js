/*
 * Admin provisioning tool.
 *
 * The brief requires that admin accounts NEVER be self-registerable, and
 * that the provisioning + protection of admin credentials be demonstrated
 * and explained. This script is that mechanism:
 *
 *   1) Get a Firebase Admin service-account JSON from:
 *        Firebase console → Project settings → Service accounts
 *        → "Generate new private key"
 *      Save it as `service-account.json` at the repo root (already in
 *      .gitignore — never commit it).
 *
 *   2) Ask the person to sign up in the app normally (any role — you'll
 *      overwrite it). Grab their UID from Firebase Console → Auth → Users.
 *
 *   3) Run:
 *        node scripts/make-admin.js <uid>
 *
 * What it does:
 *   - Sets a custom auth claim { admin: true } on the user (this is what
 *     firestore.rules checks — request.auth.token.admin == true).
 *   - Updates their users/{uid} doc with role: "admin", status: "active".
 *
 * There is intentionally NO self-service admin flow in the mobile app.
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
