# Endeavour

Our submission for the 2026 Richfield Hackathon — a professional
networking app for Richfield / AAA students, alumni, and business
recruiters, built as a real end-to-end product rather than a mock-up.

Everything the brief calls "mandatory" is wired up and working against a
live Firebase project. The AI features, OTP email verification, video
uploads and push notifications are all backed by Cloud Functions we
deployed ourselves.

If you're evaluating this, jump to **"Try it in 60 seconds"** below.

---

## What's in the box

There are three things in this repo, each with its own README worth
skimming later:

| Folder | What it is | How to run |
|---|---|---|
| `.` (the mobile app itself) | Expo / React Native app that ships as the Android APK | `npx expo start` |
| `admin-web/` | Vite + React admin panel — bigger tables and charts than a phone can carry | `cd admin-web && npm run dev` |
| `functions/` | Firebase Cloud Functions — OTP emails, AI (Claude via Groq), video transcode, push fan-out | `cd functions && npm install && firebase deploy --only functions` |

Everything talks to the same Firebase project (`endeavourai-a8a27`).

## Try it in 60 seconds

The Firestore has been seeded with realistic data — 5 students, 3
alumni, 3 businesses, a handful of opportunities, posts, threads,
notifications. Log in as any of these and everything will look lived-in
rather than empty:

- **Student demo:** `402504542@my.richfield.ac.za` / `Endeavour1!`
- **Alumni demo:** `lerato.mokoena@gmail.com` / `Endeavour1!`
- **Business demo:** `recruiter@yoco.com` / `Endeavour1!`
- **Admin demo:** the account you promoted via `npm run make-admin`

The student demo (Mohammad) is connected to everyone, has 10 messaging
threads, 5 posts of his own, and a full notifications tab. That's the
one to show off first.

## What each part does

### Mobile app

- **Auth** — email + password + OTP verification via a code emailed to
  you. Students are restricted to Richfield/AAA institutional emails
  (enforced in Firestore rules, not just the UI). Alumni upload proof
  of qualification during signup, which an admin reviews before the
  account becomes active. Business accounts go through a similar
  admin-approval step. Admins can never be self-registered — you type
  a passcode during signup that a Cloud Function verifies server-side
  and then flips your custom auth claim.
- **Feed** — live posts, comments, four reaction types. Ranking gives
  weight to posts from your connections, per-role affinity (students
  see alumni content more prominently, businesses see student/alumni
  content, etc.) and recency. New posts can attach a short-form video
  that gets transcoded + thumbnailed server-side.
- **Connections** — send/accept/decline flow. Discover panel filters
  out anyone you're already connected to or have a pending request
  with, so nothing feels like duplicates.
- **Opportunities** — approved listings only, filtered by type
  (internship / learnership / part-time / graduate). We score each
  listing against your profile (skill overlap + programme + campus)
  and float the best matches into a "Recommended for you" strip up
  top.
- **Direct messages** — 1-to-1 threads between accepted connections,
  with proper read receipts (Delivered ✓ / Seen ✓✓ on your most recent
  message, matching what iMessage / WhatsApp show).
- **Profile as portfolio** — the brief asks for a lot: photo,
  headline, summary, programme, campus, years, skills, career
  interests, work experience, entrepreneurial ventures, GitHub repo
  portfolio, live-URL projects, digital badges, Credly link,
  certifications, awards, leadership roles, clubs/hackathons, CV
  upload. All of that fits on one screen, with per-section visibility
  controls (Public / Connections / Businesses / Private) enforced
  when other users view your profile.
- **AI profile assistant** — a Claude-style chat that can see your
  own profile as context, so its advice about improving your headline
  or filling in your work history is actually specific to you. You
  can also drop a PDF CV in and it'll fill in the profile fields it
  can extract.
- **Interview prep** — pick a role and interview type; the AI
  generates questions, scores your answers on clarity + relevance,
  and gives written feedback per answer plus a session summary.
- **CV checker** — upload a PDF and get back a score, strengths, and
  specific things you could improve.
- **Career pathway explorer** — for each programme, see the alumni
  who studied it and what jobs they've held since. Timeline view.
- **Events** — admin-created; students matching the target programmes
  get notified when a new one is published.
- **Analytics dashboards** — three separate dashboards (student /
  business / admin), each with charts drawn from live Firestore data.
- **Notifications** — real-time via a Firestore listener; the same
  events also fan out as real Expo push notifications on device
  builds. No polling anywhere.
- **First-run tutorial** — six-step overlay for new accounts,
  dismissable and remembered.
- **Fire-themed loader** — because a plain spinner is boring. Delayed
  fade-in so quick loads still feel instant.

### Admin web panel (`admin-web/`)

Runs in a browser, not on a phone — the brief explicitly allows this.
Same Firebase project, gated to accounts with the `admin` custom auth
claim.

- Live platform analytics with charts (users by type, opportunity
  approval pipeline, registration trends)
- User management — approve pending accounts, review alumni
  verification documents, suspend or remove any account
- Opportunity approval queue — approving a listing also fires
  targeted notifications to students whose profiles match it
- Content moderation — flag or delete posts
- Event management — create, edit, delete, publish
- Announcement broadcasting — to everyone or by role

There's an admin tab shell inside the mobile app too (5 tabs +
moderation sub-screen) so you can demo admin actions on the phone
without switching devices.

### Cloud Functions (`functions/`)

Twelve functions total, deployed to `us-central1` for the callable
ones, `us-east1` for the video pipeline, and `africa-south1` for the
Firestore-triggered push fan-out (closest to our users).

- `sendSignupOtp` / `verifySignupOtp` — 6-digit email verification
- `sendPasswordResetOtp` / `resetPasswordWithOtp` — password reset
- `claimAdmin` — verifies the admin passcode server-side and
  promotes the caller
- `chatWithAssistant` — the AI profile coach (Groq)
- `parseCvText` — pulls structured data out of a PDF CV
- `analyzeCv` — scores a CV and returns strengths + recommendations
- `generateInterviewQuestions` / `getInterviewFeedback` — interview
  prep pair
- `processVideo` — Storage-triggered; downloads the raw upload,
  transcodes with ffmpeg, generates a thumbnail, patches the post
  with the finished URLs
- `deliverPush` — Firestore-triggered on any new notification doc;
  looks up the recipient's Expo push token and sends the banner

## Coverage vs the brief

Every mandatory item in Section 2 of the brief is implemented; the
table below is the map from spec to source file.

| Spec section | Status | Where |
|---|---|---|
| 2.1 Student email-domain enforcement | ✅ backend + client | `firestore.rules`, `src/app/signup.js` |
| 2.1 Alumni verification flow | ✅ document upload → admin review | `src/app/signup.js`, `admin-web/src/pages/Users.jsx` |
| 2.1 Business approval | ✅ pending until admin approves | `admin-web/src/pages/Users.jsx` |
| 2.1 Admin provisioning (never self-serve) | ✅ custom claim via passcode-verifying Cloud Function | `functions/index.js:claimAdmin`, `scripts/make-admin.js` |
| 2.2 User mgmt | ✅ | `admin-web/src/pages/Users.jsx`, `src/app/(admin)/users.js` |
| 2.2 Content moderation | ✅ | `admin-web/src/pages/Content.jsx`, `src/app/(admin)/moderation.js` |
| 2.2 Event CRUD (admin-only) | ✅ | `admin-web/src/pages/Events.jsx`, `src/app/(admin)/events.js` |
| 2.2 Opportunity oversight | ✅ approval queue + smart-match on approve | `admin-web/src/pages/Opportunities.jsx`, `src/app/(admin)/opportunities.js` |
| 2.2 Platform analytics | ✅ pie/bar/line charts | `admin-web/src/pages/Analytics.jsx`, `src/app/(admin)/index.js` |
| 2.2 Announcement broadcasting | ✅ fan-out per user | `admin-web/src/pages/Announcements.jsx`, `src/app/(admin)/announcements.js` |
| 2.3 Comprehensive profile | ✅ all mandatory fields | `src/app/(student)/profile.js` |
| 2.3 Business/company profile | ✅ | `src/app/(business)/company.js` |
| 2.3 Per-section visibility | ✅ enforced in viewer | `components/VisibilitySelector.js`, `src/app/(student)/user/[uid].js` |
| 2.3 Endorsements + recommendations | ✅ | `src/app/(student)/user/[uid].js` |
| 2.4 Connections | ✅ | `src/app/(student)/connections.js` |
| 2.4 Personalised, role-differentiated feed | ✅ | `lib/feedRanking.js` |
| 2.4 Text posts + short-form video | ✅ video transcoded server-side | `components/CreatePostBox.js`, `functions/index.js:processVideo` |
| 2.4 Direct messaging | ✅ with read receipts | `src/app/(student)/messages.js`, `conversation.js` |
| 2.4 Comments + reactions | ✅ four reaction types | `components/PostCard.js` |
| 2.5 Opportunity listings (admin-approved) | ✅ | `src/app/(business)/listings.js`, admin approval queue |
| 2.5 Career pathway explorer | ✅ | `src/app/(student)/pathways.js` |
| 2.5 Events feed + targeted notifications | ✅ | `src/app/(student)/events.js` |
| 2.6 AI profile assistant + chatbot | ✅ | `src/app/(student)/chatbot.js`, `functions/index.js:chatWithAssistant` |
| 2.6 First-run tutorial | ✅ | `components/OnboardingTutorial.js` |
| 2.7 Three separate dashboards with charts | ✅ | `(student)/analytics.js`, `(business)/analytics.js`, `admin-web/.../Analytics.jsx` |
| 2.8 Real-time notifications (no polling) | ✅ live Firestore listeners + Expo push via Cloud Function | `src/app/(student)/notifications.js`, `functions/index.js:deliverPush` |
| 2.8 Smart job matching | ✅ score by skill + programme + campus | `lib/feedRanking.js:scoreOpportunity` |
| 2.8 NLP CV parsing | ✅ | `functions/index.js:parseCvText`, "Auto-fill" button on profile |
| 2.8 Video transcoding + thumbnails | ✅ ffmpeg Cloud Function | `functions/index.js:processVideo` |

## Running locally

You'll need a Firebase project on the Blaze plan (Cloud Functions +
Storage require it — the free tier inside Blaze is enough for a
hackathon demo; nothing has actually charged us). Steps:

1. Install dependencies:
   ```bash
   npm install
   cd admin-web && npm install && cd ..
   cd functions && npm install && cd ..
   ```
2. Log in to Firebase and select the project:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use endeavourai-a8a27
   ```
3. Set the three Cloud Function secrets (once each, prompts for the value):
   ```bash
   firebase functions:secrets:set GROQ_API_KEY
   firebase functions:secrets:set EMAIL_USER
   firebase functions:secrets:set EMAIL_PASSWORD
   ```
4. Deploy the backend:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage,functions
   ```
5. Grab a Firebase service-account key
   (Console → Project settings → Service accounts → Generate new
   private key) and save it as `service-account.json` at the repo
   root. It's gitignored.
6. Seed demo data (optional but recommended for demo):
   ```bash
   node scripts/seed.js
   node scripts/seed-mohammad-network.js
   node scripts/seed-mohammad-notifications.js
   node scripts/seed-mohammad-posts.js
   node scripts/seed-alumni-posts.js
   ```
7. Bootstrap yourself as admin:
   ```bash
   npm run make-admin YOUR_UID
   ```
8. Run the mobile app:
   ```bash
   npx expo start
   ```
9. Optionally run the admin web panel in a browser:
   ```bash
   cd admin-web && npm run dev
   ```

## Building an APK

We use Expo Application Services (EAS) for cloud builds — free tier is
fine for a hackathon.

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

The `preview` profile in `eas.json` is configured to produce an APK
rather than an AAB, so the resulting artifact is installable directly
on any Android phone.

## Compliance

- **`docs/POPIA.md`** — how each of POPIA's eight conditions is
  addressed in this codebase, named data processors, retention policy,
  breach response.
- **`docs/presentation-outline.md`** — the 17-slide deck outline
  mapped to the brief's Section 4 deliverable requirements, plus a
  live-demo running order.
- **`AGENTS.md`** — a note for future AI assistants: always read the
  Expo 57 docs before writing code.

## Team + credits

Mohammad Rahiman · Azraa Lambat · Dishaan Chetty · Ariyn Lutchman ·
Vaishnavi Maharaj — Richfield Bryanston, IT (BSc IT), 2026 cohort.

Built on Expo 57, React Native 0.86, React 19.2, Firebase 12, Vite 5,
Firebase Cloud Functions 2nd gen, Groq (Llama-family + GPT-OSS via the
OpenAI-compatible chat completions endpoint) and expo-router 6.
