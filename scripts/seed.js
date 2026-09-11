/*
 * Populate Firestore with a realistic starter cast — 5 students, 3
 * alumni, 3 businesses, a handful of opportunities, posts, comments,
 * connections, an event, an announcement, and a couple of
 * notifications. So the app doesn't look like a fresh empty install
 * during a demo.
 *
 *   node scripts/seed.js
 *
 * Safe to re-run — it looks up existing auth accounts by email
 * before creating them. But it WILL append fresh posts, opportunities,
 * etc. every time; if you want a clean slate, delete those collections
 * in the Firestore console first.
 *
 * Needs service-account.json at the repo root — same file the
 * make-admin script uses.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const svcPath = path.join(__dirname, "..", "service-account.json");
if (!fs.existsSync(svcPath)) {
  console.error("Missing service-account.json at repo root — see scripts/make-admin.js");
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(svcPath)) });

const auth = admin.auth();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const PASSWORD = "Endeavour1!";

const STUDENTS = [
  {
    email: "402504542@my.richfield.ac.za",
    fullName: "Mohammad Rahiman",
    headline: "Final-year Computer Science student",
    programme: "BSc Information Technology",
    campus: "Richfield Bryanston",
    graduationYear: "2026",
    skills: ["Python", "SQL", "React", "Git"],
    summary: "Backend engineering + data pipelines. Looking for a first grad role from Feb 2027.",
    linkedinUrl: "https://linkedin.com/in/mohammadrahiman",
    githubUrl: "https://github.com/mohammadrahiman",
  },
  {
    email: "402603751@my.richfield.ac.za",
    fullName: "Azraa Lambat",
    headline: "Aspiring Data Analyst",
    programme: "BSc Information Technology",
    campus: "Richfield Bryanston",
    graduationYear: "2026",
    skills: ["Excel", "Power BI", "SQL", "Storytelling"],
    summary: "Love turning messy data into clear stories the business can act on.",
  },
  {
    email: "402605699@my.richfield.ac.za",
    fullName: "Dishaan Chetty",
    headline: "Marketing graduate seeking rotational programme",
    programme: "BSc Information Technology",
    campus: "Richfield Bryanston",
    graduationYear: "2026",
    skills: ["Copywriting", "Social Media", "Google Analytics"],
    summary: "Brand and digital marketing — currently interning at a fintech.",
  },
  {
    email: "402422713@my.richfield.ac.za",
    fullName: "Ariyn Lutchman",
    headline: "UI/UX designer in training",
    programme: "BSc Information Technology",
    campus: "Richfield Bryanston",
    graduationYear: "2026",
    skills: ["Figma", "Illustrator", "Prototyping", "User Research"],
    summary: "Design-thinking student building portfolio-worthy case studies each semester.",
  },
  {
    email: "402605005@my.richfield.ac.za",
    fullName: "Vaishnavi Maharaj",
    headline: "DevOps enthusiast",
    programme: "BSc Information Technology",
    campus: "Richfield Bryanston",
    graduationYear: "2026",
    skills: ["Docker", "AWS", "Linux", "Bash"],
    summary: "Automation obsessive — Kubernetes for lab projects, homelab enthusiast at night.",
  },
];

const ALUMNI = [
  {
    email: "lerato.mokoena@gmail.com",
    fullName: "Lerato Mokoena",
    headline: "Software Engineer @ Discovery",
    programme: "BSc Information Technology",
    campus: "Richfield Bryanston",
    graduationYear: "2022",
    skills: ["Java", "Spring Boot", "AWS", "SQL"],
    summary: "Graduated 2022, joined Discovery via their grad programme.",
    workExperience: [
      { role: "Software Engineer", company: "Discovery", years: "2022 – Present", description: "Backend services on the healthcare platform." },
      { role: "Intern", company: "Standard Bank", years: "Nov 2021 – Feb 2022", description: "Data ingestion prototypes." },
    ],
  },
  {
    email: "sanele.khumalo@gmail.com",
    fullName: "Sanele Khumalo",
    headline: "Associate Product Manager @ Yoco",
    programme: "BCom Information Systems",
    campus: "Richfield Cape Town",
    graduationYear: "2021",
    skills: ["Product Strategy", "Analytics", "SQL"],
    summary: "Joined Yoco in 2022 after a year in banking analytics.",
    workExperience: [
      { role: "Associate PM", company: "Yoco", years: "2022 – Present", description: "Merchant onboarding + activation." },
      { role: "Business Analyst", company: "Absa", years: "2021 – 2022", description: "Retail insights dashboards." },
    ],
  },
  {
    email: "mpho.tshabalala@gmail.com",
    fullName: "Mpho Tshabalala",
    headline: "UX Designer @ Takealot",
    programme: "BSc Multimedia",
    campus: "AAA Sandton",
    graduationYear: "2020",
    skills: ["Figma", "User Research", "Design Systems", "Accessibility"],
    summary: "Grew from junior designer to lead the search discovery pod.",
    workExperience: [
      { role: "Senior UX Designer", company: "Takealot", years: "2023 – Present", description: "Search + discovery." },
      { role: "UX Designer", company: "Takealot", years: "2021 – 2023", description: "Category browse and PDP." },
    ],
  },
];

const BUSINESSES = [
  {
    email: "recruiter@yoco.com",
    companyName: "Yoco",
    industry: "Fintech",
    description: "Payments and business tools for African small businesses.",
    location: "Cape Town",
    website: "https://yoco.com",
    talentSought: "Backend engineers, product managers, data scientists",
  },
  {
    email: "hiring@iemas.co.za",
    companyName: "Iemas",
    industry: "Financial Services",
    description: "Financial services co-operative serving South African employers.",
    location: "Pretoria",
    website: "https://iemas.co.za",
    talentSought: "Actuarial trainees, data, finance grads",
  },
  {
    email: "talent@stackworx.io",
    companyName: "Stackworx",
    industry: "Software Consulting",
    description: "Full-stack product studio building for regulated industries.",
    location: "Johannesburg",
    website: "https://stackworx.io",
    talentSought: "React, Node, DevOps, senior engineers",
  },
];

// businessEmail maps to the seeded business — used at write time to
// resolve the businessId + companyName.
const OPPORTUNITIES = [
  { title: "Junior Backend Developer Internship", type: "internship", status: "approved", location: "Cape Town", description: "6-month paid internship on the payments team.", skillsRequired: ["Java", "SQL", "Git"], programme: "BSc Computer Science", businessEmail: "recruiter@yoco.com" },
  { title: "Data Analytics Learnership", type: "learnership", status: "approved", location: "Pretoria", description: "12-month structured learnership with mentorship and monthly stipend.", skillsRequired: ["SQL", "Excel", "Power BI"], programme: "BCom Information Systems", businessEmail: "hiring@iemas.co.za" },
  { title: "UI/UX Designer — Graduate Role", type: "graduate", status: "approved", location: "Johannesburg", description: "Design consumer web products alongside a small product team.", skillsRequired: ["Figma", "Prototyping", "User Research"], programme: "BSc Multimedia", businessEmail: "talent@stackworx.io" },
  { title: "Part-time Front-end Developer", type: "part-time", status: "approved", location: "Remote", description: "Contribute to our open-source React library, 20 hours/week.", skillsRequired: ["React", "TypeScript", "CSS"], programme: "BSc Software Development", businessEmail: "talent@stackworx.io" },
  { title: "Marketing Graduate Programme", type: "graduate", status: "approved", location: "Sandton", description: "24-month rotational programme across brand, digital, and analytics.", skillsRequired: ["Copywriting", "Social Media", "Analytics"], programme: "BCom Marketing", businessEmail: "recruiter@yoco.com" },
  { title: "Junior DevOps Engineer", type: "graduate", status: "pending", location: "Johannesburg", description: "Grow with our cloud team — AWS + Kubernetes exposure day one.", skillsRequired: ["Docker", "AWS", "Linux"], programme: "BSc Software Development", businessEmail: "talent@stackworx.io" },
];

const POSTS = [
  { authorEmail: "lerato.mokoena@gmail.com", text: "Just merged a big migration — took two weeks but the ingest pipeline is 3× faster now. 🚀 Happy Friday." },
  { authorEmail: "sanele.khumalo@gmail.com", text: "PSA to CS students: don't sleep on writing docs. My PM life is 10× harder without solid handovers from engineers." },
  { authorEmail: "mpho.tshabalala@gmail.com", text: "Design portfolio tip: fewer projects, deeper case studies. Show the thinking, not just Dribbble screens." },
  { authorEmail: "402504542@my.richfield.ac.za", text: "Anyone else finding the third-year databases module lectures a bit fast? Study group forming — DM me." },
  { authorEmail: "402603751@my.richfield.ac.za", text: "Rebuilt my portfolio this weekend with a proper stat-viz section. Feedback very welcome!" },
  { authorEmail: "402422713@my.richfield.ac.za", text: "Small win: got shortlisted for the Nedbank UX bursary. Thanks to Mpho for the reference letter 🙏" },
  { authorEmail: "402605005@my.richfield.ac.za", text: "Spent the weekend containerising my final-year project. It runs on my homelab now — feels great to move past 'works on my machine'." },
];

const EVENTS = [
  { title: "Autumn Career Fair 2026", date: "2026-04-15", location: "Richfield Johannesburg", description: "20+ employers on campus — bring your CV and a portfolio." },
  { title: "AI in FinTech — Alumni Panel", date: "2026-05-02", location: "AAA Sandton", description: "Alumni panel discussion followed by networking drinks.", targetProgrammes: ["BSc Computer Science", "BCom Information Systems"] },
];

const ANNOUNCEMENTS = [
  { title: "Welcome to Endeavour!", body: "Thanks for joining. Complete your profile so employers can discover you.", target: "all" },
];

// -------- helpers --------

async function getOrCreateAuth(email) {
  try {
    const rec = await auth.getUserByEmail(email);
    return rec.uid;
  } catch (e) {
    const rec = await auth.createUser({ email, password: PASSWORD, emailVerified: true });
    return rec.uid;
  }
}

async function upsertUser(email, extras) {
  const uid = await getOrCreateAuth(email);
  await db.doc(`users/${uid}`).set({
    email,
    emailVerified: true,
    createdAt: FieldValue.serverTimestamp(),
    ...extras,
  }, { merge: true });
  console.log(`   ✓ ${extras.role || "user"} ${email}`);
  return uid;
}

// -------- main --------

(async () => {
  const uidByEmail = {};

  console.log("Seeding students…");
  for (const s of STUDENTS) {
    uidByEmail[s.email] = await upsertUser(s.email, {
      ...s,
      role: "student",
      status: "active",
      visibility: { summary: "public", contact: "public", skills: "public", experience: "public", portfolio: "public" },
    });
  }

  console.log("Seeding alumni…");
  for (const a of ALUMNI) {
    uidByEmail[a.email] = await upsertUser(a.email, {
      ...a,
      role: "alumni",
      status: "active",
      visibility: { summary: "public", contact: "public", skills: "public", experience: "public", portfolio: "public" },
    });
  }

  console.log("Seeding businesses…");
  for (const b of BUSINESSES) {
    uidByEmail[b.email] = await upsertUser(b.email, {
      ...b,
      role: "business",
      status: "active",
      fullName: b.companyName, // used as display name
    });
  }

  console.log("Seeding opportunities…");
  for (const o of OPPORTUNITIES) {
    const businessId = uidByEmail[o.businessEmail];
    const business = BUSINESSES.find((b) => b.email === o.businessEmail);
    if (!businessId || !business) continue;
    await db.collection("opportunities").add({
      title: o.title,
      type: o.type,
      status: o.status,
      location: o.location,
      description: o.description,
      skillsRequired: o.skillsRequired,
      programme: o.programme,
      businessId,
      companyName: business.companyName,
      createdAt: FieldValue.serverTimestamp(),
      ...(o.status === "approved" ? { approvedAt: FieldValue.serverTimestamp() } : {}),
    });
    console.log(`   ✓ ${o.status}  ${o.title}`);
  }

  console.log("Seeding posts…");
  const postIds = [];
  for (const p of POSTS) {
    const authorId = uidByEmail[p.authorEmail];
    const authorSeed = [...STUDENTS, ...ALUMNI].find((u) => u.email === p.authorEmail);
    if (!authorId || !authorSeed) continue;
    const authorRole = STUDENTS.some((s) => s.email === p.authorEmail) ? "student" : "alumni";
    const doc = await db.collection("posts").add({
      authorId,
      authorName: authorSeed.fullName,
      authorRole,
      authorPhotoUrl: null,
      text: p.text,
      likedBy: [],
      reactions: {},
      createdAt: FieldValue.serverTimestamp(),
    });
    postIds.push({ id: doc.id, authorId });
    console.log(`   ✓ post by ${authorSeed.fullName}`);
  }

  console.log("Seeding a comment + reaction on the first two posts…");
  if (postIds[0]) {
    const commenter = uidByEmail["402504542@my.richfield.ac.za"];
    const commenterSeed = STUDENTS.find((s) => s.email === "402504542@my.richfield.ac.za");
    await db.collection(`posts/${postIds[0].id}/comments`).add({
      authorId: commenter,
      authorName: commenterSeed.fullName,
      authorPhotoUrl: null,
      text: "Congrats! What DB were you migrating from?",
      createdAt: FieldValue.serverTimestamp(),
    });
    await db.doc(`posts/${postIds[0].id}`).update({
      likedBy: [commenter],
      "reactions.like": [commenter],
    });
  }
  if (postIds[1]) {
    const reactor = uidByEmail["402603751@my.richfield.ac.za"];
    await db.doc(`posts/${postIds[1].id}`).update({
      likedBy: [reactor],
      "reactions.celebrate": [reactor],
    });
  }

  console.log("Seeding connections (some accepted, one pending)…");
  const conn = (fromEmail, toEmail, status) =>
    db.collection("connections").add({
      fromUserId: uidByEmail[fromEmail],
      toUserId: uidByEmail[toEmail],
      status,
      createdAt: FieldValue.serverTimestamp(),
    });
  await conn("402504542@my.richfield.ac.za", "lerato.mokoena@gmail.com", "accepted");
  await conn("402603751@my.richfield.ac.za", "sanele.khumalo@gmail.com", "accepted");
  await conn("402422713@my.richfield.ac.za", "mpho.tshabalala@gmail.com", "accepted");
  await conn("402605699@my.richfield.ac.za", "lerato.mokoena@gmail.com", "pending");

  console.log("Seeding events…");
  for (const e of EVENTS) {
    await db.collection("events").add({
      title: e.title,
      date: e.date,
      location: e.location,
      description: e.description,
      targetProgrammes: e.targetProgrammes || [],
      createdBy: "seed-script",
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ ${e.title}`);
  }

  console.log("Seeding announcement…");
  for (const a of ANNOUNCEMENTS) {
    await db.collection("announcements").add({
      title: a.title,
      body: a.body,
      target: a.target,
      createdBy: "seed-script",
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  console.log("Seeding a few notifications for the demo students…");
  const notify = (email, type, message) =>
    db.collection("notifications").add({
      userId: uidByEmail[email],
      type,
      message,
      relatedId: null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  await notify("402504542@my.richfield.ac.za", "opportunity_match", "New opportunity that matches your profile: \"Junior Backend Developer Internship\" at Yoco");
  await notify("402504542@my.richfield.ac.za", "connection_accepted", "Lerato Mokoena accepted your connection request.");
  await notify("402603751@my.richfield.ac.za", "post_like", "Sanele Khumalo liked your post.");
  await notify("402422713@my.richfield.ac.za", "announcement", "Welcome to Endeavour!");

  console.log("\nDone! Demo login for any account:");
  console.log(`  password: ${PASSWORD}`);
  console.log("  example: 402504542@my.richfield.ac.za / Endeavour1!");
  process.exit(0);
})().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
