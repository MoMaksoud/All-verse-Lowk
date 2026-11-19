# AllVerse project instructions for Codex

## Start here

This repository is an AI-assisted peer-to-peer marketplace with web and mobile clients. Read these before substantial changes:

1. [Project architecture and flows](docs/architecture/PROJECT_GUIDE.md).
2. [Foundation audit and release criteria](docs/audits/2026-11-16-foundation-audit.md).
3. [Prioritized implementation backlog](docs/backlog/FOUNDATION_BACKLOG.md), with machine-readable records in `docs/backlog/foundation-backlog.json`.
4. [API and source inventory](docs/architecture/API_INVENTORY.md).
5. [Jira publication mapping](docs/backlog/JIRA_MAPPING.md), when working from an issue.
6. [Stripe sandbox implementation and validation](docs/payments/STRIPE_SANDBOX.md) and [team assignments](docs/backlog/ASSIGNMENTS.md). These describe changes after the dated source audit.

The guide describes commit `c15398da9d152040d68309786d828ad37ef57ed6`, reviewed on 2026-11-16. Recheck source when it changes. Audit IDs `AV-F001`–`AV-F052` are stable local identifiers, not Jira issue keys. They must not be mistaken for completed work.

## Repository map

- `apps/web`: `@marketplace/web`, Next.js 14 App Router, React 18, TypeScript, Tailwind; also the shared backend for mobile.
- `apps/mobile`: `mobile`, Expo SDK 54 / React Native 0.81 / React 19, Expo Router.
- `packages/types`: shared Zod types, compiled into `dist`.
- `packages/shared-logic`: source-exported formatting/error/image helpers. Most marketplace business logic is still web-local.
- `functions`: separate Firebase scheduled push jobs; **not included in the pnpm workspace**.
- `apps/web/src/lib/server/admin*.ts`: server Firestore access through Firebase Admin.
- `apps/web/src/lib/payments`: checkout validation, rates, webhook settlement and label orchestration.
- `apps/web/src/lib/services/firestore.ts` and `lib/firestore.ts`: overlapping client SDK services, still used by web. Do not assume every mutation goes through an API.

## Architecture facts that are easy to get wrong

- Current checkout is **snapshot first, order after payment**. POST `/api/payments/create-checkout-session` loads the server cart, validates current listings and quotes Shippo, creates Stripe Hosted Checkout, then stores `checkout_snapshots/{sessionId}`. It does not create a new pending order/payment record.
- `/api/stripe/webhook` and `/api/webhooks/stripe` share `lib/payments/stripeCheckoutWebhook.ts`. Successful payment creates the order, updates inventory and removes purchased cart lines in one Firestore transaction; payment records/transfers/notifications/labels happen afterward.
- The original audit found session-uniqueness and post-commit recovery gaps (AV-F006–008). DEV-60 now transactionally reuses the snapshot order and resumes payment/transfer work; paid-without-stock compensation and durable jobs remain open. A temporary lock or `processed` flag is not proof of complete settlement.
- Clients normally pay **one seller per session**. The server still accepts an optional seller scope and an incomplete mixed-seller path (AV-F018). Preserve other sellers' cart items when settling one order.
- Seller money uses **separate Stripe transfers to Express Connect accounts**, currently item value minus 4.5%. Transfer creation is not proof that the seller's bank received money. Do not call the implementation escrow.
- Current tax is a hardcoded 8% and buyer processing charge is modeled as 2.9% + $0.30. These are code behavior, not approved universal tax/provider pricing facts.
- Labels live under `orders/{orderId}/shipping/primary`; they are not top-level `trackingNumber` fields. Label purchase currently marks shipped too early (AV-F022).
- Web search uses `serverSearch -> runPipeline` directly on initial render, then `/api/search` for refinement. Mobile text search still uses `/api/universal-search`.
- Firebase bearer verification does not authenticate a separate client Firestore/Storage SDK on the server. Admin SDK bypasses Firestore rules and therefore needs explicit authorization/projection at each route.

## Working rules

- For a Jira task, read its acceptance criteria, source evidence and dependencies first; inspect current source before implementing. Keep the change focused and update the corresponding documentation when behavior changes.
- Put trusted pricing, state transitions and provider operations in server domain code. Keep pages/components focused on interaction and presentation. Reuse existing Firebase/Next.js architecture; no rewrite is assumed by this audit.
- Treat client values, Firestore documents writable by clients, URL/deep-link success parameters, TypeScript casts and AI output as untrusted inputs. Validate at runtime and whitelist mutable fields.
- Preserve immutable order/seller/price/provider references and historical accounting. Use atomic state guards, durable per-operation identity and reconciliation for external side effects.
- Test direct SDK permissions as well as API authorization. A secure API does not fix a permissive client database rule.
- Protect private addresses/contact details/Connect IDs/push tokens. Public profile/listing endpoints should use deliberate projections, not document spreads.
- Do not copy environment values, credentials, private customer data or payment artifacts into docs/logs/issues. Reference variable names and sanitized IDs instead.
- Use isolated emulator/provider test mode for destructive or financial validation. A backlog ticket does not itself authorize real charges, transfers, labels, notifications or production deployments; follow the user's actual task authorization.
- Separate implemented behavior, proposed architecture, observed test results and unverified deployment settings. Do not report a repository gap as a proven production incident.

## Commands

Use pnpm 8.15.0 as declared. Mobile EAS profiles pin Node 20.19.0; confirm supported versions before changing toolchains.

```sh
pnpm install --frozen-lockfile
pnpm --filter @marketplace/types build
pnpm --filter @marketplace/web dev
pnpm --filter mobile start
pnpm --filter @marketplace/web test
pnpm --filter @marketplace/web type-check
pnpm --filter @marketplace/web lint
pnpm --filter mobile exec tsc --noEmit
pnpm --filter @marketplace/web build
```

`functions` requires its own installed dependencies before `pnpm exec tsc --noEmit -p functions/tsconfig.json` can be meaningful. The root test command is not a complete commerce gate: at audit time web had only three model-selection tests, and mobile/shared test scripts were placeholders. See the audit for actual executed results and limits.

## Documentation precedence

Code and verified tests establish current behavior. `PAYMENTS_FLOW.md` and `apps/web/docs/SYSTEM_CONTRACT.md` describe an older pre-payment-order design; their claims of retry safety are not release evidence. Historical search/UX checklists mix completed and planned work. Use the new dated guide/audit as the starting map, then verify source. Update affected contracts after implementation instead of adding another contradictory summary.
