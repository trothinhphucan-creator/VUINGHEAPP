# PAH Hearing Test App — Project Context

## Overview
Vietnamese clinical hearing test web application for Phúc An Hearing (PAH) clinic.
Owner: Ths. Chu Đức Hải (audiologist, hearing aid specialist)
Live: https://hearingtest.pah.vn | https://hearingtest.vuinghe.com

## Stack
- Next.js 16 (App Router), React 19, Firebase 12
- No CSS framework — custom globals.css with CSS variables
- PM2 on Linux server, GitHub Actions for CI/CD
- Firebase Cloud Functions (Node 20) for email notifications via Resend

## Routes
| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, education, expert, testimonials, simulator CTA, PAH intro |
| `/hearing-test` | Main audiometry test (Hughson-Westlake) + age-norm comparison + smart recommendations |
| `/hearing-aid-simulator` | NAL-NL2 & DSL v5.0 hearing aid simulation (auto-loads Firestore results) |
| `/dashboard` | User test history + audiogram viewer + PTA trend chart + manual entry |
| `/booking` | Appointment booking form (pre-fills from auth, accepts `?from=hearing-test`) |
| `/admin` | Admin dashboard — overview, bookings tab (confirm/cancel), Firebase Auth + role check |
| `/sitemap.xml` | Auto-generated sitemap |
| `/robots.txt` | Crawl rules (block /admin, /api/) |
| `/opengraph-image` | Dynamic OG image 1200x630 via next/og edge runtime |

## Firestore Collections
```
users/          { uid, email, displayName, photoURL, role, createdAt }
userProfiles/   { uid, email, ..., updatedAt }
testResults/    { uid, email, displayName, results: {right:{250..8000}, left:{250..8000}}, evaluationLabel, rightPTA, leftPTA, source, label, createdAt }
bookings/       { uid, name, phone, email, preferredDate, preferredTime, note, testResultId, source, status, notified, notifiedAt, createdAt }
```

## Key Files
```
src/lib/firebase.js       — Firebase init (auth, db, googleProvider, isConfigured)
src/lib/auth-context.js   — useAuth() hook (user, loading, signInWithGoogle, signOut)
src/lib/analytics.js      — GA4 event helpers (trackTestStarted, trackTestCompleted, trackBookingSubmitted, trackSimulatorUsed)
src/app/layout.js         — Root layout with GA4 scripts, PWA manifest, schema.org structured data, metadataBase
src/app/error.js          — Global error boundary (reset + home buttons)
src/app/not-found.js      — Custom 404 page
src/app/api/notify-booking/route.js — POST API: email notification to clinic + patient via Resend (no Cloud Functions needed)
```

## Admin Access
Admin login uses Firebase Google Auth. User must have `role: "admin"` in `users/{uid}` Firestore document.
To grant admin: Firebase console → Firestore → users → find user doc → set `role: "admin"`.

## Environment Variables (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_GA_ID=G-XXXXXXXX          # Google Analytics 4
RESEND_API_KEY=re_xxxxx               # Resend.com API key (server-side only)
CLINIC_EMAIL=email@example.com        # Clinic email for booking notifications
```

## Deployment

### Automated Deployment (GitHub Actions)
Push to `main` branch → GitHub Actions triggers `.github/workflows/deploy.yml`:
1. Creates source tarball (excludes node_modules, .next, .env.local)
2. SCPs tarball to server at `/tmp/pah-app.tar.gz`
3. SSHs to server and runs `/home/haichu/pah-app/scripts/update.sh`
4. Script extracts, runs `npm install`, `npm run build`, restarts PM2

Server-side config:
- App dir: `/home/haichu/pah-app`
- PM2 process name: `pah-app`
- Port: 3010
- `.env.local` preserved across deploys (backup/restore in update.sh)

### GitHub Secrets Required
Set these in GitHub repo Settings → Secrets and variables → Actions:

| Secret | Value | Notes |
|--------|-------|-------|
| `SERVER_HOST` | VPS IP or domain | e.g., `123.45.67.89` or `vps.example.com` |
| `SERVER_USER` | SSH username | Usually `haichu` |
| `SERVER_SSH_KEY` | Private SSH key | Contents of `~/.ssh/id_rsa` (PEM format) |
| `SERVER_PORT` | SSH port | Optional, defaults to 22 if not set |

### Firebase Rules & Indexes
```bash
# Deploy Firestore security rules (after updating firestore.rules)
firebase deploy --only firestore:rules

# Deploy composite indexes (if needed)
firebase deploy --only firestore:indexes
```

Admin role check in rules uses: `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin"`

## Key Constraints
- Do NOT add Tailwind or MUI — use existing CSS variables in globals.css
- Keep Firebase as the only backend (no separate Node.js server)
- Audio engine uses Web Audio API — test only in browser, not Node
- Admin role is set manually in Firestore (no self-signup for admin)
- `.agents/` directory is gitignored — skills are local only
- Dashboard manual entry validates -10 to 120 dB HL with clinical gap warnings
- Landing page Navbar shows user avatar + "Lịch sử" when logged in
- ReengagementBanner shows if last test > 90 days ago
- PWA manifest at `/manifest.json` — needs real icons in `/public/icons/`
