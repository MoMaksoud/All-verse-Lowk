# Environments: Production, Staging, Playground

**Status:** Plan (not yet implemented) · **Last updated:** 2026-10-03

## Goal

Three fully separated environments, so that nothing tested outside production can touch real users, real money, or real data.

| | **Playground** | **Staging** | **Production** |
|---|---|---|---|
| Purpose | Try anything. Break things freely. | Final check of a release, in a prod-like setup. | Real users. |
| Git branch | `dev` (plus feature branches) | `staging` | `main` |
| Web URL | `dev.allversegpt.com` + per-branch Vercel preview URLs | `staging.allversegpt.com` | `www.allversegpt.com` |
| Firebase project | `allverse-playground` (new) | `allverse-staging` (new) | existing prod project |
| Data | Seed data, wiped whenever needed | Seed data + realistic test accounts, kept stable | Real |
| Stripe | Test mode | Test mode | Live |
| Shippo | Test token | Test token | Live token |
| Emails (SendGrid) | Logged to console, never sent | Sent, **only to an allowlist** of team addresses | Sent |
| Push notifications / scheduled functions | Off | On (test devices only) | On |
| Mobile (EAS profile) | `development` | `preview` (TestFlight internal) | `production` |
| Who can merge in | Anyone on the team | PR from `dev`, 1 approval | PR from `staging`, 1 approval |

On top of these, **local sandbox** (`pnpm sandbox`) stays the fastest loop: Firebase emulators + seed data on your own machine, no cloud project at all.

## How code moves

```
feature branch ──PR──▶ dev (Playground) ──PR──▶ staging (Staging) ──PR──▶ main (Production)
                        auto-deploys            auto-deploys              auto-deploys
```

- Day-to-day work merges into `dev`. Anything goes.
- When a set of changes is ready to ship, open a PR `dev → staging`. QA it on `staging.allversegpt.com` (checklist: `apps/web/docs/PHASE8_QA_CHECKLIST.md`).
- When staging looks good, open a PR `staging → main`. That is the release.
- Hotfix: branch from `main`, PR into `main`, then merge `main` back into `staging` and `dev` so they don't drift.

## Decisions to confirm

1. **Two new Firebase projects, or one shared non-prod project?**
   *Recommended: two.* Staging data stays stable for QA while Playground gets wiped and abused. Cost is near zero: Playground can stay on the free Spark plan (no Cloud Functions there); Staging needs Blaze for the scheduled functions, at cents per month at test volume.
2. **Staging emails: allowlist or fully off?**
   *Recommended: allowlist.* Staging is where we confirm SendGrid templates actually render. Any recipient not on the list is logged instead of sent.
3. **Staging data: seed only, or a copy of prod?**
   *Recommended: seed only.* Never copy prod user data (emails, addresses, chats) into non-prod. If realistic volume is needed, extend `apps/web/scripts/seed-data.mjs`.

## Setup steps

Steps marked **(owner)** need admin access to the GitHub repo, Vercel, Firebase, Stripe, or Apple/EAS.

### 1. Firebase (owner)
1. Create projects `allverse-staging` and `allverse-playground` in the Firebase console.
2. In each: enable Auth (Email/Password + Google), Firestore, Storage. Add a **Web app** and copy its config.
3. Auth → Settings → Authorized domains: add that environment's domain (`staging.allversegpt.com` / `dev.allversegpt.com`) and `*.vercel.app` previews as needed.
4. Create a service account key per project (for `FIREBASE_SERVICE_ACCOUNT_KEY`).
5. Deploy rules, indexes and (staging only) functions:
   `firebase use staging && firebase deploy --only firestore:rules,firestore:indexes,storage,functions`
   `firebase use playground && firebase deploy --only firestore:rules,firestore:indexes,storage`
6. Seed each project once with the seed script (a `--project` flag will be added, see Code changes).

### 2. Stripe and Shippo (owner)
1. Stripe **test mode**: add two webhook endpoints, `https://staging.allversegpt.com/api/webhooks/stripe` and `https://dev.allversegpt.com/api/webhooks/stripe`. Note each signing secret.
2. Shippo: use the existing test token (`shippo_test_…`) for both non-prod environments.

### 3. Vercel (owner)
1. Settings → Git: Production Branch = `main` (already).
2. Settings → Domains: add `staging.allversegpt.com` → branch `staging`, and `dev.allversegpt.com` → branch `dev`.
3. Settings → Environment Variables. Vercel lets a Preview variable be scoped to one branch:
   - **Production** scope: current prod values (unchanged).
   - **Preview, branch `staging`**: staging Firebase config + service account, Stripe test keys + staging webhook secret, Shippo test token, SendGrid key, `APP_ENV=staging`, `EMAIL_ALLOWLIST=…`, `NEXT_PUBLIC_APP_URL=https://staging.allversegpt.com`.
   - **Preview, all other branches** (covers `dev` and feature branches): playground Firebase config + service account, Stripe test keys + playground webhook secret, Shippo test token, `APP_ENV=playground`, `NEXT_PUBLIC_APP_URL=https://dev.allversegpt.com`.
   - Separate Gemini / SerpAPI keys with low quotas for non-prod, so a runaway test can't burn the prod quota.
4. **Verify before going further:** open the `dev` preview, sign up a new account, and confirm it appears in the **playground** Firebase console, not prod.

### 4. GitHub (owner)
1. Create branch `staging` from `main`.
2. Settings → Branches → add protection rules for `main` and `staging`: require a pull request with 1 approval, block force pushes and deletion.
3. Optional: make `dev` the default branch so new PRs target it automatically.

### 5. Mobile / EAS (owner for Apple + EAS secrets)
1. In `apps/mobile/eas.json`, give each build profile its environment's `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_FIREBASE_*` values: `development` → playground, `preview` → staging, `production` → prod.
2. Register the iOS/Android app in each Firebase project (same bundle id `com.allversegpt.mobile` is fine across projects).
3. Ship `preview` builds to TestFlight internal testers only.

## Code changes (can be done in the repo now)

1. **Explicit `APP_ENV`** (`production | staging | playground | local`) instead of guessing from `VERCEL_ENV`/`NODE_ENV`. Today `apps/web/src/lib/sandbox.ts` treats every Vercel preview the same, which would also block staging emails. With `APP_ENV`:
   - Live Stripe/Shippo keys refused everywhere except `production`.
   - Emails: sent in `production`, allowlist-only in `staging`, logged in `playground`/`local`.
   - App fails to start if `APP_ENV=production` but the Firebase project id isn't the prod one (and vice versa), so a mis-set env var can't silently point staging at prod data.
2. **`.firebaserc`** with aliases `prod`, `staging`, `playground`.
3. **Seed script `--project` flag** so the same seed data can be loaded into the staging/playground projects, with a hard refusal to run against the prod project id.
4. **`eas.json`** per-profile env blocks (values filled in once the Firebase projects exist).
5. **Visible environment badge** in the header on staging/playground ("STAGING" / "PLAYGROUND") so nobody confuses tabs.
6. **`.env.example`** for the web app listing every variable, grouped by environment.

## Rollout order

1. Code changes 1–6 merged to `dev`. Safe to ship early: while `APP_ENV` is unset, the app keeps today's behavior.
2. Firebase projects (step 1) → Stripe/Shippo (step 2) → Vercel env vars + domains (step 3) → verify playground isolation.
3. Create `staging` branch + protections (step 4) → verify staging isolation the same way.
4. Mobile profiles (step 5).
5. From then on: all work flows `dev → staging → main`.

## Until this is done

- Test only on **localhost** (`pnpm sandbox`).
- Treat the `dev` Vercel preview URL as production: it still uses prod Firebase until step 3 is complete.
