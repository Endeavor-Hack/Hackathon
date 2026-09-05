# Endeavour — Expo Router version (complete)

Everything in this zip is meant to REPLACE parts of your existing
`endeavour-app` project — this is not a separate app, it's the finished
version of what we were building piece by piece in chat.

## What to delete from your existing project first

Inside `src/app/`, delete these default template files (they conflict
with the ones in this zip):
- `src/app/_layout.tsx`
- `src/app/index.tsx`
- The whole `src/app/(tabs)/` folder
- `src/app/modal.tsx` (if present)

Leave everything else in your project alone — `node_modules/`,
`package.json`, `app.json`, `assets/`, and the default `components/`,
`constants/`, `hooks/` files from the template are all harmless and don't
conflict with anything here.

## What to copy in

Copy every folder from this zip into your project root, matching the
structure exactly:

```
endeavour-app/                  ← your existing project root
├── context/
│   └── AuthContext.js
├── theme/
│   └── colors.js
├── firebase/
│   └── config.js
├── components/
│   ├── ThemedButton.js
│   ├── ThemedInput.js
│   └── PlaceholderScreen.js
└── src/
    └── app/
        ├── _layout.js
        ├── index.js
        ├── login.js
        ├── signup.js
        ├── pending.js
        ├── (student)/
        │   ├── _layout.js
        │   ├── index.js
        │   ├── connections.js
        │   ├── opportunities.js
        │   ├── notifications.js
        │   └── profile.js
        └── (business)/
            ├── _layout.js
            ├── index.js
            ├── candidates.js
            ├── listings.js
            ├── analytics.js
            └── company.js
```

## Before running it

Fill in your real Firebase config values in `firebase/config.js` — the
committed version has placeholder strings that won't connect to anything.

## Then run it

```bash
npx expo start
```

If everything's in place correctly, you should land on the login screen
first (not "Welcome to Expo"), be able to sign up as any of the three
roles, and:
- Students go straight into the app (5-tab layout)
- Alumni/business accounts land on the "pending approval" screen
- Business accounts that reach the app see a different 5-tab layout than
  students do

## What's real vs placeholder right now

**Fully working:** signup (all 3 roles), student domain restriction, login,
role-based routing, pending-approval gating, sign out.

**Placeholder screens (navigate correctly, but show "coming soon"):**
every tab inside `(student)/` and `(business)/` except the routing itself.
Replace these one at a time as each feature gets built — the navigation
shell around them is already provably working.

**Not built yet — still needed before this is spec-compliant:**
Firestore security rules (the student-domain check right now is
client-side only, which the brief explicitly says isn't sufficient), the
admin approval queue itself (nothing currently flips a pending account to
approved), and every real feature behind the placeholder screens.
