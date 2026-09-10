# Endeavour Admin Panel

A separate React (Vite) web app for platform administration — kept
separate from the mobile app because the brief permits an admin panel
to be web-based, and desktop-scale UI (tables, charts, moderation
queues) fits the admin workflow far better than a phone screen.

## Setup

```bash
cd admin-web
npm install
npm run dev
```

It reads from the same Firebase project as the mobile app.

## Gaining access

Admin accounts cannot be self-registered. To become one:

1. Sign up in the mobile app as any role (this creates the auth account).
2. Copy your UID from Firebase Console → Authentication → Users.
3. From the mobile-app repo root, run:
   ```bash
   npm run make-admin YOUR_UID
   ```
   (needs `service-account.json` at that repo root — see the script header).
4. Sign out of both the mobile app and admin panel, then sign back in.

The panel checks a Firebase Auth custom claim (`admin: true`) — the
same claim `firestore.rules` requires for privileged writes, so all
authority flows through one gate.

## Screens

- **Analytics** — platform-wide stats and charts (users by type,
  opportunity approval pipeline, registrations over time).
- **Users** — approve/suspend/remove; review alumni verification docs.
- **Opportunities** — approval queue (pending listings are hidden from
  students until an admin approves them).
- **Content moderation** — flag or delete posts.
- **Events** — create/edit institutional events; publishing fans out
  targeted notifications to the matched programmes (or everyone).
- **Announcements** — broadcast to all users or by role.
