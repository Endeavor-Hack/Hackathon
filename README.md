# Endeavour

Professional networking mobile application for the Richfield/AAA
community — students, alumni, business/recruiters, and administrators.
Built for the 2026 Richfield Hackathon.

## Repository layout

| Path | What lives there |
|------|------------------|
| `src/app/` | Mobile app (Expo Router) — student and business tab stacks, login/signup, admin redirect |
| `context/` | React contexts (auth state + user doc + push registration) |
| `components/` | Reusable RN components (posts, cards, charts, tutorial, profile widgets) |
| `lib/` | Pure helpers (display names, feed ranking + smart matching, error mapping, push, conversation id) |
| `theme/` | Colour + spacing + typography tokens |
| `firebase/` | Firebase client SDK bootstrap (Auth, Firestore, Storage, Functions) |
| `admin-web/` | Separate React (Vite) admin panel — user approvals, moderation, events, announcements, analytics |
| `functions/` | Firebase Cloud Functions — AI proxy (Claude), CV parsing, video transcoding, push delivery |
| `scripts/` | Ops tooling (admin provisioning) |
| `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json` | Backend security + config |
| `docs/` | POPIA compliance + presentation outline |

## Running the mobile app

```bash
npm install
npx expo start
```

You'll land on the login screen. Sign up as any of the three
self-serve roles:

- **Student** — requires an @my.richfield / @richfield / @my.aaa / @aaa
  email (enforced client-side *and* by security rules)
- **Alumni** — asks for a graduation year + upload of a verification
  document. Lands on the "pending approval" screen until an admin
  reviews the document.
- **Business** — captures the company name. Also lands on "pending
  approval" until an admin approves.

**Push notifications** and **video posting** require a native
development build (Expo Go dropped push in SDK 53+). Everything else
works in Expo Go.

## Running the admin panel

```bash
cd admin-web
npm install
npm run dev
```

See `admin-web/README.md` for how to gain admin access (custom claim
via `scripts/make-admin.js`).

## Deploying backend rules + functions

Both need a `service-account.json` at the repo root
(Firebase console → Project settings → Service accounts). The file is
gitignored.

```bash
# rules + indexes + storage rules
npm run deploy-rules

# Cloud Functions (requires Blaze plan)
cd functions && npm install
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase deploy --only functions
```

## Feature coverage vs the brief

| Brief section | Status | Where |
|---|---|---|
| 2.1 Auth — student domain | ✅ backend-enforced | `firestore.rules`, `signup.js` |
| 2.1 Auth — alumni verification | ✅ document upload + admin review | `signup.js`, `admin-web/.../Users.jsx` |
| 2.1 Auth — business approval | ✅ pending status until admin | `admin-web/.../Users.jsx` |
| 2.1 Auth — admin provisioning | ✅ custom claim via service-account script | `scripts/make-admin.js` |
| 2.2 Admin: user mgmt | ✅ | `admin-web/.../Users.jsx` |
| 2.2 Admin: content moderation | ✅ | `admin-web/.../Content.jsx` |
| 2.2 Admin: event mgmt | ✅ | `admin-web/.../Events.jsx` |
| 2.2 Admin: opportunity oversight | ✅ | `admin-web/.../Opportunities.jsx` |
| 2.2 Admin: platform analytics | ✅ (charts) | `admin-web/.../Analytics.jsx` |
| 2.2 Admin: announcements | ✅ (fan-out to targeted role) | `admin-web/.../Announcements.jsx` |
| 2.3 Profiles — all fields | ✅ (photo, exp, portfolio, badges, Credly, awards, leadership, clubs, CV) | `src/app/(student)/profile.js` |
| 2.3 Business profile | ✅ | `src/app/(business)/company.js` |
| 2.3 Visibility controls | ✅ per-section | `components/VisibilitySelector.js`, applied in `user/[uid].js` |
| 2.3 Endorsements + recommendations | ✅ | `src/app/(student)/user/[uid].js` |
| 2.4 Connections | ✅ | `src/app/(student)/connections.js` |
| 2.4 Personalised, role-differentiated feed | ✅ | `lib/feedRanking.js` |
| 2.4 Text posts | ✅ | `components/CreatePostBox.js` |
| 2.4 Short-form video | ✅ transcoded server-side | `CreatePostBox.js` + `functions/index.js:processVideo` |
| 2.4 Direct messaging | ✅ | `src/app/(student)/messages.js` + `conversation.js` |
| 2.4 Comments + reactions | ✅ multi-type reactions | `components/PostCard.js` |
| 2.5 Opportunities + admin approval | ✅ | `(business)/listings.js`, admin approval queue |
| 2.5 Filter + apply | ✅ | `(student)/opportunities.js` |
| 2.5 Career pathway explorer | ✅ | `(student)/pathways.js` |
| 2.5 Events feed + targeted notifications | ✅ | `(student)/events.js` + admin fan-out |
| 2.6 AI profile assistant + chatbot | ✅ Claude via Cloud Function | `(student)/chatbot.js` + `functions/index.js:chatWithAssistant` |
| 2.6 First-run tutorial | ✅ | `components/OnboardingTutorial.js` |
| 2.7 Three separate dashboards with charts | ✅ student / business / admin | `(student)/analytics.js`, `(business)/analytics.js`, `admin-web/.../Analytics.jsx` |
| 2.8 Real-time notifications | ✅ live Firestore listeners + Expo push via Cloud Function | `notifications.js` + `functions/index.js:deliverPush` + `lib/registerPush.js` |
| 2.8 Smart job matching | ✅ score-based (skills + programme + campus) | `lib/feedRanking.js:scoreOpportunity`, matches notified on approval |
| 2.8 NLP CV parsing | ✅ Claude via Cloud Function → suggests profile fields | `functions/index.js:parseCvText`, "Auto-fill" button on profile |
| 2.8 Video transcoding + thumbnails | ✅ Cloud Function using ffmpeg | `functions/index.js:processVideo` |

## What needs your action to run end-to-end

1. Enable the Blaze plan on the Firebase project (Cloud Functions +
   Storage bandwidth).
2. `firebase functions:secrets:set ANTHROPIC_API_KEY` before deploying
   functions.
3. Run `npm run make-admin <uid>` at least once to bootstrap the first
   admin account.
4. Build a native dev build (`npx expo run:android` or `run:ios`, or
   use EAS) to enable push notifications and video capture in a real
   device flow.

## Compliance + presentation prep

- `docs/POPIA.md` — how each of POPIA's eight conditions is met, named
  data processors, retention, breach response.
- `docs/presentation-outline.md` — a 17-slide deck outline mapped to
  the brief's required sections + a live-demo running order.
