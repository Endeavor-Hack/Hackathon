/*
 * Extra seed: fill Mohammad's notifications tab so it looks lived-in.
 * Mixes read + unread, spread over the last few days, and covers every
 * notification type the app produces.
 *
 *   node scripts/seed-mohammad-notifications.js
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const svcPath = path.join(__dirname, "..", "service-account.json");
if (!fs.existsSync(svcPath)) {
  console.error("Missing service-account.json at repo root.");
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(svcPath)) });

const auth = admin.auth();
const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

const MOHAMMAD_EMAIL = "402504542@my.richfield.ac.za";

// hours-ago → milliseconds
const HR = 60 * 60 * 1000;

const NOTIFICATIONS = [
  // Unread, freshest first
  { type: "opportunity_match", read: false, hoursAgo: 1,   message: "New opportunity that matches your profile: \"Junior Backend Developer Internship\" at Yoco" },
  { type: "message",           read: false, hoursAgo: 2,   message: "Lerato Mokoena: Happy to chat any evening this week — DM me a time." },
  { type: "connection_request", read: false, hoursAgo: 4,  message: "Kabelo Sithole sent you a connection request." },
  { type: "post_reaction",     read: false, hoursAgo: 6,   message: "Ariyn Lutchman reacted to your post." },
  { type: "endorsement",       read: false, hoursAgo: 9,   message: "Sanele Khumalo endorsed you for \"SQL\"." },

  // Read, older
  { type: "post_comment",      read: true,  hoursAgo: 22,  message: "Vaishnavi Maharaj commented on your post." },
  { type: "connection_accepted", read: true, hoursAgo: 27, message: "Lerato Mokoena accepted your connection request." },
  { type: "event",             read: true,  hoursAgo: 30,  message: "New event: Autumn Career Fair 2026" },
  { type: "opportunity_match", read: true,  hoursAgo: 46,  message: "New opportunity that matches your profile: \"Part-time Front-end Developer\" at Stackworx" },
  { type: "application_status", read: true, hoursAgo: 52,  message: "Your application was marked \"shortlisted\"." },
  { type: "recommendation",    read: true,  hoursAgo: 73,  message: "Mpho Tshabalala wrote you a recommendation." },
  { type: "announcement",      read: true,  hoursAgo: 96,  message: "Welcome to Endeavour!" },
];

(async () => {
  const mohammadUid = (await auth.getUserByEmail(MOHAMMAD_EMAIL)).uid;
  console.log(`Mohammad UID: ${mohammadUid}\n`);

  for (const n of NOTIFICATIONS) {
    const when = Timestamp.fromMillis(Date.now() - n.hoursAgo * HR);
    await db.collection("notifications").add({
      userId: mohammadUid,
      type: n.type,
      message: n.message,
      relatedId: null,
      read: n.read,
      createdAt: when,
    });
    console.log(`   ✓ [${n.read ? "read" : "NEW "}] ${n.type.padEnd(20)} ${n.message.slice(0, 60)}`);
  }

  console.log(`\nDone. ${NOTIFICATIONS.filter((n) => !n.read).length} unread, ${NOTIFICATIONS.filter((n) => n.read).length} read.`);
  process.exit(0);
})().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
