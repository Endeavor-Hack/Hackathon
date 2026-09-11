/*
 * Extra seed: give Mohammad (402504542) accepted connections to every
 * other seeded user, plus a short message thread with each. Idempotent
 * for messages/conversations (deterministic conv IDs), but connections
 * will create duplicates if run twice — safe for demos, delete from
 * the Firestore console if you rerun.
 *
 *   node scripts/seed-mohammad-network.js
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
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const MOHAMMAD_EMAIL = "402504542@my.richfield.ac.za";

// Everyone Mohammad should be connected to + a canned opening message
// thread. Each thread has 2-3 short messages so the "Seen ✓✓"
// indicator has something to show for.
const NETWORK = [
  { email: "402603751@my.richfield.ac.za", name: "Azraa Lambat",       thread: [
    { from: "them", text: "Hey Mohammad, great to connect! Are you going to the AI panel next month?" },
    { from: "me",   text: "Definitely — I'm actually helping run one of the demo tables." },
    { from: "them", text: "Amazing, let's find each other there." },
  ]},
  { email: "402605699@my.richfield.ac.za", name: "Dishaan Chetty",     thread: [
    { from: "me",   text: "Yo, saw your marketing post — solid stuff. Want to team up on the hackathon?" },
    { from: "them", text: "Absolutely, been looking for a technical partner." },
  ]},
  { email: "402422713@my.richfield.ac.za", name: "Ariyn Lutchman",     thread: [
    { from: "them", text: "Your GitHub is fire 🔥 what stack for your final year project?" },
    { from: "me",   text: "Thanks! Node + Postgres for the backend, React Native for mobile." },
    { from: "them", text: "Would love to design a landing page for it if you're open." },
  ]},
  { email: "402605005@my.richfield.ac.za", name: "Vaishnavi Maharaj",  thread: [
    { from: "me",   text: "Vaish, how do you handle secrets in your CI? Trying to stop hardcoding envs." },
    { from: "them", text: "GitHub Actions Secrets + a bit of AWS SSM. Happy to walk you through it." },
  ]},
  { email: "lerato.mokoena@gmail.com",     name: "Lerato Mokoena",     thread: [
    { from: "them", text: "Hey Mohammad, saw your CS profile — welcome to Endeavour!" },
    { from: "me",   text: "Thanks Lerato! Would love to hear how you landed the Discovery grad role." },
    { from: "them", text: "Happy to chat any evening this week — DM me a time." },
  ]},
  { email: "sanele.khumalo@gmail.com",     name: "Sanele Khumalo",     thread: [
    { from: "me",   text: "Sanele — considering a PM path eventually. What did you wish you knew earlier?" },
    { from: "them", text: "Write more, code less. Docs > code samples for grad interviews." },
  ]},
  { email: "mpho.tshabalala@gmail.com",    name: "Mpho Tshabalala",    thread: [
    { from: "them", text: "Ariyn mentioned your final-year project. I'd love a preview when it's ready." },
    { from: "me",   text: "Will send screenshots this weekend, thanks Mpho!" },
  ]},
  { email: "recruiter@yoco.com",           name: "Yoco",               thread: [
    { from: "them", text: "Hi Mohammad — we noticed your application. Are you free for a 20-min chat?" },
    { from: "me",   text: "Absolutely, any time next Tuesday works." },
  ]},
  { email: "hiring@iemas.co.za",           name: "Iemas",              thread: [
    { from: "them", text: "Applications for the Data Learnership close 30 Sept — please submit soon!" },
  ]},
  { email: "talent@stackworx.io",          name: "Stackworx",          thread: [
    { from: "them", text: "Hey Mohammad! Would you be open to a technical screen for our part-time role?" },
    { from: "me",   text: "Definitely. Send through details when convenient." },
    { from: "them", text: "Great — I'll book something in for next week." },
  ]},
];

function convIdFor(a, b) {
  return [a, b].sort().join("_");
}

(async () => {
  const mohammadUid = (await auth.getUserByEmail(MOHAMMAD_EMAIL)).uid;
  console.log(`Mohammad UID: ${mohammadUid}\n`);

  for (const contact of NETWORK) {
    const otherUid = (await auth.getUserByEmail(contact.email)).uid;

    // 1. Accepted connection (Mohammad initiates)
    await db.collection("connections").add({
      fromUserId: mohammadUid,
      toUserId: otherUid,
      status: "accepted",
      createdAt: FieldValue.serverTimestamp(),
    });

    // 2. Conversation doc (deterministic id so re-running merges)
    const convId = convIdFor(mohammadUid, otherUid);
    const lastMessage = contact.thread[contact.thread.length - 1].text;
    await db.doc(`conversations/${convId}`).set({
      participants: [mohammadUid, otherUid].sort(),
      lastMessage,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 3. Seed messages — space them ~2 min apart so the timeline reads
    // naturally. Mark them all as read by both sides so the "Seen ✓✓"
    // indicator shows on the last outgoing one.
    let ts = Date.now() - contact.thread.length * 2 * 60 * 1000;
    for (const m of contact.thread) {
      const fromUid = m.from === "me" ? mohammadUid : otherUid;
      await db.collection(`conversations/${convId}/messages`).add({
        fromUserId: fromUid,
        text: m.text,
        readBy: [mohammadUid, otherUid], // both parties have read
        createdAt: Timestamp.fromMillis(ts),
      });
      ts += 2 * 60 * 1000;
    }

    console.log(`   ✓ Mohammad ↔ ${contact.name} (${contact.thread.length} msgs)`);
  }

  console.log("\nDone. Sign in as 402504542@my.richfield.ac.za / Endeavour1!");
  console.log("Connections tab should show 10 accepted; Messages tab should list all 10 threads.");
  process.exit(0);
})().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
