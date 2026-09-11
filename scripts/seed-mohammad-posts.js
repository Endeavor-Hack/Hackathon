/*
 * Extra seed: give Mohammad a handful of posts, spaced out over the
 * past week, each with a bit of engagement (reactions + a comment or
 * two) so his profile feels lived-in rather than a fresh account.
 *
 *   node scripts/seed-mohammad-posts.js
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
const HR = 60 * 60 * 1000;

// Names of the other seeded folk so we can attribute reactions +
// comments to real UIDs.
const OTHERS = [
  { email: "402603751@my.richfield.ac.za", name: "Azraa Lambat"     },
  { email: "402605699@my.richfield.ac.za", name: "Dishaan Chetty"   },
  { email: "402422713@my.richfield.ac.za", name: "Ariyn Lutchman"   },
  { email: "402605005@my.richfield.ac.za", name: "Vaishnavi Maharaj" },
  { email: "lerato.mokoena@gmail.com",     name: "Lerato Mokoena"   },
  { email: "sanele.khumalo@gmail.com",     name: "Sanele Khumalo"   },
  { email: "mpho.tshabalala@gmail.com",    name: "Mpho Tshabalala"  },
];

// Each post specifies:
//   hoursAgo — when it was posted
//   text
//   reactions — { like: [names], celebrate: [names], insightful: [names], support: [names] }
//   comments — [{ name, text, hoursAgoRelative }]
const POSTS = [
  {
    hoursAgo: 2,
    text: "Deployed my first Cloud Function today! 🎉 The learning curve was steep but seeing that green ✓ in the console makes it all worth it. Big thanks to @Lerato Mokoena for the debugging session last week.",
    reactions: { celebrate: ["Lerato Mokoena", "Vaishnavi Maharaj", "Ariyn Lutchman"], like: ["Azraa Lambat", "Sanele Khumalo"] },
    comments: [
      { name: "Lerato Mokoena", text: "So proud of you! Next stop: production traffic 😅", hoursAgoRelative: 1 },
      { name: "Vaishnavi Maharaj", text: "Which runtime? Node 20 or Python?", hoursAgoRelative: 0.5 },
    ],
  },
  {
    hoursAgo: 26,
    text: "Currently reading \"Designing Data-Intensive Applications\" — halfway through and my brain has been permanently rewired around consistency models. Highly recommend for anyone in the backend space.",
    reactions: { insightful: ["Sanele Khumalo", "Lerato Mokoena"], like: ["Azraa Lambat"] },
    comments: [
      { name: "Sanele Khumalo", text: "The chapter on stream processing is worth reading twice.", hoursAgoRelative: 20 },
    ],
  },
  {
    hoursAgo: 50,
    text: "Study group tonight for third-year databases — 6pm at the library. We're covering indexing and query planning. Bring caffeine ☕",
    reactions: { like: ["Azraa Lambat", "Ariyn Lutchman", "Vaishnavi Maharaj"] },
    comments: [
      { name: "Ariyn Lutchman", text: "I'll be there!", hoursAgoRelative: 48 },
      { name: "Vaishnavi Maharaj", text: "Same, bringing snacks.", hoursAgoRelative: 47 },
    ],
  },
  {
    hoursAgo: 96,
    text: "Small project win: rewrote my portfolio site with proper server-side rendering. Lighthouse score went from 68 → 97. Screenshots in the replies 👇",
    reactions: { celebrate: ["Mpho Tshabalala", "Ariyn Lutchman"], support: ["Sanele Khumalo"], like: ["Azraa Lambat", "Dishaan Chetty", "Lerato Mokoena"] },
    comments: [
      { name: "Mpho Tshabalala", text: "Design-conscious backend dev? Rare combo 🙌", hoursAgoRelative: 90 },
    ],
  },
  {
    hoursAgo: 168,
    text: "Reminder to my fellow final-years: the Yoco internship deadline is closer than you think. If any of you want feedback on your CV before submitting, drop it in my DMs.",
    reactions: { support: ["Dishaan Chetty", "Vaishnavi Maharaj"], like: ["Ariyn Lutchman"] },
    comments: [
      { name: "Dishaan Chetty", text: "Sending mine over tonight — thank you!", hoursAgoRelative: 160 },
    ],
  },
];

async function uidOf(email) {
  return (await auth.getUserByEmail(email)).uid;
}

(async () => {
  const mohammadUid = await uidOf(MOHAMMAD_EMAIL);
  const uidByName = {};
  for (const p of OTHERS) uidByName[p.name] = await uidOf(p.email);
  console.log(`Mohammad UID: ${mohammadUid}\n`);

  for (const p of POSTS) {
    const postedAt = Timestamp.fromMillis(Date.now() - p.hoursAgo * HR);
    const reactions = {};
    const likedBy = [];
    for (const [type, names] of Object.entries(p.reactions || {})) {
      const uids = names.map((n) => uidByName[n]).filter(Boolean);
      reactions[type] = uids;
      if (type === "like") likedBy.push(...uids);
    }

    const postRef = await db.collection("posts").add({
      authorId: mohammadUid,
      authorName: "Mohammad Rahiman",
      authorRole: "student",
      authorPhotoUrl: null,
      text: p.text,
      likedBy,
      reactions,
      createdAt: postedAt,
    });

    for (const c of p.comments || []) {
      const authorUid = uidByName[c.name];
      if (!authorUid) continue;
      const commentAt = Timestamp.fromMillis(Date.now() - (p.hoursAgo - c.hoursAgoRelative) * HR);
      await db.collection(`posts/${postRef.id}/comments`).add({
        authorId: authorUid,
        authorName: c.name,
        authorPhotoUrl: null,
        text: c.text,
        createdAt: commentAt,
      });
    }

    const totalReactions = Object.values(reactions).reduce((n, list) => n + list.length, 0);
    console.log(`   ✓ (${p.hoursAgo}h ago)  ${totalReactions} reactions, ${(p.comments || []).length} comments — "${p.text.slice(0, 60)}…"`);
  }

  console.log("\nDone. 5 posts seeded on Mohammad's timeline.");
  process.exit(0);
})().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
