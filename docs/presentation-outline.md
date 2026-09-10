# Endeavour — Presentation Outline (≥15 slides)

Structure follows the brief's Section 4 deliverable requirements
one-for-one, then adds a live-demo running order.

| # | Slide | Owner |
|---|---|---|
| 1 | Title / team introductions | All |
| 2 | Problem statement — graduate employability & the digital-portfolio gap | |
| 3 | Scenario response — what Endeavour is + how it addresses the brief | |
| 4 | User type breakdown — Student, Alumni, Business, Admin (access levels table) | |
| 5 | Authentication design — student institutional email; alumni verified-document flow (researched, reasoned solution); business admin-approval; admin custom-claim provisioning | |
| 6 | System architecture diagram — mobile app ↔ Firebase (Auth/Firestore/Storage/Functions) ↔ Anthropic Claude, admin web ↔ Firebase, Expo push service | |
| 7 | Database — Firestore choice justified (real-time listeners, schema-flexible for evolving profile shape, first-party auth integration) | |
| 8 | Mobile framework — React Native + Expo justified (single codebase, team's JS experience, Expo Router for file-based routing, Expo push service) | |
| 9 | Feature tour: Social — feed, ranked per role; posts + short-form video (transcoded); comments + multi-type reactions; connections; DMs | |
| 10 | Feature tour: Career — opportunities with admin approval gate; smart matching by skills + programme; career pathway explorer; events feed with programme-targeted push | |
| 11 | AI Profile Assistant — chatbot backed by Claude via Cloud Function; context-aware (reads caller's profile); CV parsing auto-fills profile entries; first-run tutorial | |
| 12 | Analytics — three distinct dashboards (student / business / admin), each with charts | |
| 13 | Admin panel walkthrough — user approvals (incl. alumni docs), opportunity queue, content moderation, event CRUD, broadcast announcements, platform analytics | |
| 14 | Security & backend RBAC — firestore.rules / storage.rules deep dive; admin custom claim; no client-only gating | |
| 15 | Data privacy & POPIA compliance — 8 conditions summary; data processors named; user rights | |
| 16 | What's next / roadmap — recommendation ML, richer video moderation, Credly OAuth verification | |
| 17 | Live demo running order (see below) — 8–10 min | |
| 18 | Q&A | All |

## Live demo running order (~8–10 min)

1. **Fresh student signup** (30 s) — show domain enforcement rejecting
   a non-institutional email, then a successful @my.richfield signup.
2. **First-run tutorial** appears; complete profile with the AI
   assistant guiding sections; upload CV → **AI auto-fill** demo.
3. **Feed** — create a text post; create a post with a short video
   attached; show the "processing" state and returning to a rendered
   thumbnail.
4. **Connections** — send/accept a request between two demo accounts;
   show the "For you" ranking difference on the feed.
5. **Opportunities** — flip to a business account, post a listing; show
   it's `pending`. Flip to admin panel; **approve** the listing; back on
   the student account, the "Recommended for you" section now includes
   it and a push notification lands on the device.
6. **Apply** to the opportunity as the student; back on the business
   account, show the application in Candidates with a mini profile
   view (respecting visibility settings); mark shortlisted.
7. **DMs** — from the student's user-profile view, send the business
   a message.
8. **Career pathways** — show alumni grouped by programme with their
   trajectories.
9. **AI assistant** — ask for advice on improving the profile.
10. **Admin analytics** — quick tour of the platform dashboard charts.

## What to have ready before the demo starts

- A demo device or emulator with:
  - a `student@my.richfield.ac.za` account
  - an `alumni@somewhere` account (already approved)
  - a `business@somewhere` account (already approved) with a saved
    company profile
  - an `admin` account (custom claim already set)
- Two Firestore-created opportunities (one already approved, one
  pending) so the approval flow demo has content.
- An event already published so it shows up in the events feed.
- The admin panel already signed in on a second screen.
