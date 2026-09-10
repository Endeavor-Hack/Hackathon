# POPIA Compliance Notes

South Africa's Protection of Personal Information Act (POPIA) governs
how Endeavour must handle personal data belonging to students, alumni,
and business/admin users. This document is the reasoning behind our
design choices so it can be defended in the presentation, and it is the
checklist we work against as new features land.

## The eight POPIA conditions and how Endeavour handles each

### 1. Accountability
The Richfield/AAA institution is the Responsible Party. Day-to-day
processing decisions are logged in this repository (design docs, commit
history) and audited by administrators. Admin accounts are provisioned
only by an existing admin (see `scripts/make-admin.js`) — never
self-serve — so accountability for privileged actions is traceable to
named staff members.

### 2. Processing limitation (lawfulness + minimality)
- **Signup** collects only what each role needs — email + password for
  all; graduation year, programme, and a verification document for
  alumni; company name for businesses. Nothing else is required to
  create an account.
- **Profile fields** beyond the basics are all user-initiated. A user
  can be functional on the platform without providing them.
- **Per-section visibility controls** on every profile section let the
  user decide who sees what (public / connections / businesses only /
  private). See `components/VisibilitySelector.js`. The rendering-side
  `canView()` helper enforces the choice.

### 3. Purpose specification
The purpose of collecting each datum is documented in-line where it is
requested (see the signup flow's contextual notes and the profile
screen's section headers). Data is not repurposed silently:
- Emails are used only for authentication and notifications the user
  triggers (connection requests, applications, etc).
- Skills/programme fields are used for smart-matching and analytics,
  never sold or shared externally.

### 4. Further processing limitation
No collected data is reused for a purpose the user has not been shown.
The AI profile assistant (Cloud Function `chatWithAssistant`) is
explicitly scoped: it receives *only* the caller's own profile as
context, never other users'. CV-parsing (`parseCvText`) only reads a
CV file the caller uploaded themselves — enforced by both storage
rules and an explicit path-prefix check in the function.

### 5. Information quality
- Alumni identity claims are verified by an administrator against an
  uploaded qualification/transcript before the account moves from
  `pending` to `active`. See `admin-web/src/pages/Users.jsx`.
- Users can edit any profile field themselves at any time.
- Endorsements are attributed to the endorsing user (`fromUserId`), so
  the recipient can see and challenge any endorsement they consider
  inaccurate.

### 6. Openness
This document, the README, and the visible in-app copy (signup notes,
profile section headers) tell users what's collected and why. The
brief-mandated presentation slides include a dedicated data-privacy
slide.

### 7. Security safeguards
- **Auth**: Firebase Authentication with per-role rules. Passwords
  never touch our storage — they live in Firebase's managed auth.
- **RBAC**: `firestore.rules` and `storage.rules` enforce role- and
  ownership-based access at the backend. Client-side gating is a
  usability layer, not the security boundary.
- **Admin claim**: administrators are marked with a Firebase custom
  auth claim (`admin: true`) provisioned only by a service-account-
  authenticated script. Admin actions in the rules always check the
  claim, never a self-writable field.
- **Sensitive uploads**: CVs and alumni-verification documents live
  under paths that `storage.rules` restricts to owner + admin reads.
- **Direct messages**: only accessible to the two participants, per
  `firestore.rules`.
- **API keys**: Anthropic API key lives as a Firebase Functions secret;
  never shipped to the client bundle.
- **Downloads/exports**: the app never places personal data in URL
  parameters or shares it with third-party services (except Firebase
  and Anthropic — both are named data processors below).
- **Transport**: all Firebase and Cloud Function calls use HTTPS.

### 8. Data subject participation
- Users may correct any profile field via the Profile screen at any
  time.
- Users may sign out and request account deletion; deletion is a
  one-step admin action (see `admin-web/src/pages/Users.jsx`) that
  removes the profile doc. The Firebase Auth record itself is removed
  by an admin in the Firebase console (or by adding a `deleteUser`
  Cloud Function if desired — a small follow-up).
- To request the data held on them, a user can view their own profile
  (which contains everything Endeavour stores about them) or contact
  the platform admin.

## Data processors
- **Google Firebase** (Firestore, Auth, Storage, Cloud Functions,
  Cloud Messaging): stores all app data; hosted in a Firebase region
  the institution selects at project creation time.
- **Anthropic** (Claude API): receives only the caller's own profile
  summary + chat messages during AI assistant use, and only CV text
  during CV parsing. No third parties beyond these.
- **Expo Push Service**: receives only the device push token +
  notification body/title.

## Cross-border transfer
Firebase and Anthropic process data outside South Africa. Users are
informed at signup (via the privacy notice in the presentation and
this document) and consent by using the platform.

## Retention
- User profile data is retained while the account is active.
- Suspended accounts retain data pending admin review, then may be
  removed.
- Deleted accounts remove the profile document, all posts, comments,
  reactions, connections, and applications authored by the user (a
  cascade Cloud Function is the recommended follow-up; currently the
  admin removes each artefact manually where policy requires it).

## Breach response
Compromise of admin credentials or the service-account file must be
reported to Firebase security and to the Information Regulator within
72 hours, and the service-account revoked immediately in the Firebase
console.
