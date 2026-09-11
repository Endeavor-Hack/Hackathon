/*
 * Extra seed: give each alumni a fleshed-out timeline. Each post has
 * realistic engagement (reactions from students and other alumni,
 * short comment threads) and is spread out over the last two weeks so
 * the feed ranking + timeAgo formatter both feel alive.
 *
 *   node scripts/seed-alumni-posts.js
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
const HR = 60 * 60 * 1000;

const ALUMNI = {
  "Lerato Mokoena":   { email: "lerato.mokoena@gmail.com" },
  "Sanele Khumalo":   { email: "sanele.khumalo@gmail.com" },
  "Mpho Tshabalala":  { email: "mpho.tshabalala@gmail.com" },
};

const OTHERS = {
  "Mohammad Rahiman":  "402504542@my.richfield.ac.za",
  "Azraa Lambat":      "402603751@my.richfield.ac.za",
  "Dishaan Chetty":    "402605699@my.richfield.ac.za",
  "Ariyn Lutchman":    "402422713@my.richfield.ac.za",
  "Vaishnavi Maharaj": "402605005@my.richfield.ac.za",
  "Lerato Mokoena":    "lerato.mokoena@gmail.com",
  "Sanele Khumalo":    "sanele.khumalo@gmail.com",
  "Mpho Tshabalala":   "mpho.tshabalala@gmail.com",
};

const POSTS = [
  // ---------------- Lerato Mokoena (Software Eng @ Discovery) ---------------
  {
    author: "Lerato Mokoena",
    hoursAgo: 6,
    text: "3-year work anniversary at Discovery today 🎉 The person I was as a Richfield grad wouldn't recognise the engineer I've become. If you're a student wondering if the grad grind is worth it — it absolutely is.",
    reactions: { celebrate: ["Mohammad Rahiman", "Ariyn Lutchman", "Vaishnavi Maharaj", "Sanele Khumalo"], support: ["Azraa Lambat"] },
    comments: [
      { name: "Mohammad Rahiman", text: "Congrats Lerato! Inspiring 🙌", relHours: 5 },
      { name: "Sanele Khumalo",   text: "Time flies! Coffee soon?",        relHours: 4 },
    ],
  },
  {
    author: "Lerato Mokoena",
    hoursAgo: 48,
    text: "Interviewing candidates this week and I keep seeing the same mistake: CVs full of skills but no evidence of using them. \n\n👉 One bullet with a real outcome > five vague buzzwords. \n👉 Link a repo, a demo, a PR — anything that lets me verify.",
    reactions: { insightful: ["Mohammad Rahiman", "Vaishnavi Maharaj", "Dishaan Chetty", "Azraa Lambat"], like: ["Ariyn Lutchman"] },
    comments: [
      { name: "Dishaan Chetty", text: "Saving this for my next revision.", relHours: 46 },
    ],
  },
  {
    author: "Lerato Mokoena",
    hoursAgo: 120,
    text: "Rebuilt our payment reconciliation service this quarter — took a 4-hour nightly batch down to a 6-minute stream. Two lessons: (1) idempotent handlers are non-negotiable, (2) observability first, optimisation second.",
    reactions: { insightful: ["Sanele Khumalo", "Vaishnavi Maharaj"], celebrate: ["Mohammad Rahiman"] },
    comments: [
      { name: "Vaishnavi Maharaj", text: "Kafka or something lighter?", relHours: 118 },
      { name: "Lerato Mokoena",    text: "Actually GCP Pub/Sub — plays really nicely with our stack.", relHours: 117 },
    ],
  },
  {
    author: "Lerato Mokoena",
    hoursAgo: 240,
    text: "Mentoring two Richfield third-years this semester through the alumni programme. If you're a final-year IT student and want a mentor for prep — Yoco, Discovery, and Stackworx all have alumni here. DM me.",
    reactions: { support: ["Azraa Lambat", "Ariyn Lutchman", "Dishaan Chetty"], like: ["Mohammad Rahiman"] },
    comments: [
      { name: "Ariyn Lutchman", text: "This platform is really coming together 🔥", relHours: 235 },
    ],
  },

  // ---------------- Sanele Khumalo (APM @ Yoco) ---------------
  {
    author: "Sanele Khumalo",
    hoursAgo: 12,
    text: "Just shipped merchant self-serve onboarding — new signups drop from 18 min to under 4 min. The lesson wasn't a design one, it was a scope one: cut everything a merchant doesn't need on day one.",
    reactions: { celebrate: ["Mpho Tshabalala", "Lerato Mokoena"], insightful: ["Mohammad Rahiman", "Azraa Lambat", "Dishaan Chetty"] },
    comments: [
      { name: "Mpho Tshabalala", text: "Curious what dropped off the day-one flow?", relHours: 11 },
      { name: "Sanele Khumalo",  text: "Bank account verification — moved it to post-first-payment. Trust the merchant a bit.", relHours: 10 },
    ],
  },
  {
    author: "Sanele Khumalo",
    hoursAgo: 60,
    text: "PM friends — my hot take of the week: your roadmap is not a plan, it's a bet. Frame it that way and stakeholders stop treating slipped dates as failures and start treating them as new information.",
    reactions: { insightful: ["Lerato Mokoena", "Mpho Tshabalala"], like: ["Dishaan Chetty", "Ariyn Lutchman"] },
    comments: [],
  },
  {
    author: "Sanele Khumalo",
    hoursAgo: 144,
    text: "For any BCom or Info Systems students who want to explore product management — Yoco is running an APM info evening next month. Casual, no CV required. Reply here if you want details.",
    reactions: { support: ["Dishaan Chetty", "Azraa Lambat"], like: ["Mohammad Rahiman"] },
    comments: [
      { name: "Dishaan Chetty", text: "Very interested — please send info!", relHours: 140 },
    ],
  },

  // ---------------- Mpho Tshabalala (UX Designer @ Takealot) ---------------
  {
    author: "Mpho Tshabalala",
    hoursAgo: 18,
    text: "Redesigned the search results page this quarter. Two rounds of unmoderated testing showed a 22% increase in click-through on the top 3 results. Sometimes the best design is just fewer things fighting for attention.",
    reactions: { celebrate: ["Ariyn Lutchman", "Lerato Mokoena"], insightful: ["Sanele Khumalo", "Mohammad Rahiman"] },
    comments: [
      { name: "Ariyn Lutchman", text: "The new layout is so much cleaner — I noticed it as a shopper before I saw this post 😅", relHours: 15 },
    ],
  },
  {
    author: "Mpho Tshabalala",
    hoursAgo: 72,
    text: "Design portfolio review: I'm opening 5 slots this weekend for Richfield/AAA students who want feedback on their case studies. Comment with your portfolio link + I'll pick and reply Saturday.",
    reactions: { support: ["Ariyn Lutchman", "Dishaan Chetty", "Vaishnavi Maharaj", "Azraa Lambat", "Mohammad Rahiman"], celebrate: ["Sanele Khumalo"] },
    comments: [
      { name: "Ariyn Lutchman", text: "https://ariyn.design — would love feedback 🙏", relHours: 70 },
      { name: "Mpho Tshabalala", text: "Ariyn added to the list ✅", relHours: 68 },
    ],
  },
  {
    author: "Mpho Tshabalala",
    hoursAgo: 192,
    text: "PSA to UX students building portfolios: 3 deep case studies beat 12 shallow ones every single time. Show your thinking, your dead-ends, your final trade-offs — not just the pretty final frame.",
    reactions: { insightful: ["Ariyn Lutchman", "Dishaan Chetty", "Lerato Mokoena"], like: ["Azraa Lambat"] },
    comments: [],
  },
];

async function uidOf(email) {
  return (await auth.getUserByEmail(email)).uid;
}

(async () => {
  const uidByName = {};
  for (const name of Object.keys(OTHERS)) {
    uidByName[name] = await uidOf(OTHERS[name]);
  }

  for (const p of POSTS) {
    const authorUid = uidByName[p.author];
    if (!authorUid) { console.warn(`skip: unknown author ${p.author}`); continue; }
    const postedAt = Timestamp.fromMillis(Date.now() - p.hoursAgo * HR);

    const reactions = {};
    const likedBy = [];
    for (const [type, names] of Object.entries(p.reactions || {})) {
      const uids = names.map((n) => uidByName[n]).filter(Boolean);
      reactions[type] = uids;
      if (type === "like") likedBy.push(...uids);
    }

    const postRef = await db.collection("posts").add({
      authorId: authorUid,
      authorName: p.author,
      authorRole: "alumni",
      authorPhotoUrl: null,
      text: p.text,
      likedBy,
      reactions,
      createdAt: postedAt,
    });

    for (const c of p.comments || []) {
      const commenterUid = uidByName[c.name];
      if (!commenterUid) continue;
      const commentAt = Timestamp.fromMillis(Date.now() - (p.hoursAgo - c.relHours) * HR);
      await db.collection(`posts/${postRef.id}/comments`).add({
        authorId: commenterUid,
        authorName: c.name,
        authorPhotoUrl: null,
        text: c.text,
        createdAt: commentAt,
      });
    }

    const totalR = Object.values(reactions).reduce((n, l) => n + l.length, 0);
    console.log(`   ✓ ${p.author.padEnd(20)} (${p.hoursAgo}h)  ${totalR}r, ${(p.comments || []).length}c — "${p.text.slice(0, 55)}…"`);
  }

  console.log(`\nDone. ${POSTS.length} alumni posts seeded across ${Object.keys(ALUMNI).length} authors.`);
  process.exit(0);
})().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
