# Stripe diagnosis, repair and local sandbox

Implementation follow-up to the 2026-11-16 source audit. Owner: Yengner Bermudez. Tracking: [DEV-60](https://allversegpt.atlassian.net/browse/DEV-60). This is a local implementation and validation record, not a production deployment or proof of bank receipt.

## What was found

Read-only checks accepted the configured Stripe test key. The available and pending test balances were zero. An enabled test webhook points to the deployed AllVerse `/api/webhooks/stripe` endpoint. The local web/mobile configuration uses test Stripe keys alongside a live Shippo key and shared Firebase configuration, without emulator routing. No recent failed event was available in the limited provider results; a particular reported failure has not been reproduced.

Source defects were independently confirmed: transfer retry could skip missing Connect accounts and incorrectly finish the order; transfers lacked their original funding charge; an already-processed checkout snapshot caused webhook retries to skip unfinished settlement; two different event deliveries could each create an order from the same snapshot.

## Implemented behavior

- `lib/payments/environment.ts` validates Stripe modes, rejects opposite-mode events/objects, and requires emulators or an explicitly designated test Firebase project for test payment writes.
- `lib/payments/sellerPayouts.ts` is shared by the webhook and internal retry endpoint. It checks provider account ownership, active transfers capability and payout readiness; incomplete sellers remain pending. Each successful line transfer is recorded immediately in a Firestore transaction. Completion requires every line receipt.
- Transfers resolve the succeeded payment intent's original charge and send `source_transaction` plus an order transfer group. Existing per-line idempotency keys are preserved.
- Order creation rereads the snapshot inside its transaction and reuses its order ID. Payment receipts now use deterministic order IDs. Expiry events cannot downgrade snapshots with an order. Webhook retries resume payment and transfer work after order creation.
- `pnpm dev:sandbox` forces the demo Firebase project, emulator connections, localhost redirects, simulated $5 shipping and a visible sandbox banner. It clears production service-account, shipping, email and AI secrets in the child environment. Payment notifications and label purchase are disabled in Stripe test mode. Storage uploads are outside this payment harness and fail against an unstarted local Storage emulator.
- Before sandbox Stripe mutations, enabled webhook endpoints are checked. An enabled public endpoint blocks Checkout creation, Connect creation/onboarding and transfers. Stripe CLI forwarding alone does not disable an existing public endpoint.

## Run locally

Use the repository's pnpm version, Node 20.19+ or a supported newer Node release, and Java 21 for the Firebase emulator. The harness was verified locally with the installed Node 20.15 and Java 21; Firebase CLI may emit a Node support warning on that older Node version.

In separate terminals at the repository root:

```sh
pnpm payments:emulators
pnpm payments:seed
pnpm payments:listen
pnpm dev:sandbox
```

App: `http://127.0.0.1:3005/signin`. Emulator UI: `http://127.0.0.1:4005`.

Synthetic accounts: `buyer@allverse.example` and `seller@allverse.example`; password for both: `AllVerseSandbox123!`. These credentials only belong to the local demo Auth emulator. The seller starts without a Stripe account. The seed creates `sandbox-listing` for $10 and resets its inventory to 10; rerun only when resetting demo fixtures is intended. Emulator data is ephemeral unless export/import is deliberately configured.

For a fresh payment-provider setup, create/select a dedicated Stripe sandbox with Connect enabled, using keys from that same sandbox. Copy `apps/web/.env.sandbox.example` to the ignored `apps/web/.env.sandbox.local` and fill its three values locally. Do not overwrite the working override created during this session unless intentionally replacing its sandbox. The original `.env.local` account is blocked because of its public webhook; the new sandbox override is isolated. Do not disable that deployed webhook merely to bypass the guard.

If Stripe CLI is installed and authenticated to the dedicated sandbox, forward only the supported Checkout events:

```sh
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.expired,checkout.session.async_payment_failed --forward-to http://127.0.0.1:3005/api/stripe/webhook
```

Use the listener's signing secret as `STRIPE_WEBHOOK_SECRET` and restart the app. Finish seller Connect onboarding with test information, then pay as the synthetic buyer using Stripe's documented test payment methods. Verify the order, payment receipt and transfer ledger in the demo Firestore UI; a transfer is not a bank payout confirmation. Buyer Checkout has now been tested successfully in the temporary isolated sandbox described below; Connect remains blocked until it is claimed.

Outside this harness, test mode needs both Auth/Firestore emulator host variables or `STRIPE_TEST_FIREBASE_PROJECT_ID` matching an intentionally dedicated non-demo Firebase project. Never set that variable to the production project to bypass isolation. Existing deployments using test keys against shared Firebase will now reject payment operations until their environment is intentionally configured. Live-mode deployments must use consistent live keys and webhook signing configuration.

## Temporary sandbox created during this session

The isolated sandbox expires **2026-11-25** unless claimed. From this Mac, run the following as one line and attach it to the AllVerse Stripe account:

```sh
npx @stripe/cli --config=/tmp/allverse-stripe-sandbox/config.toml sandboxes claim
```

The CLI config is a private temporary local file. After claiming, use the Dashboard or CLI login to obtain full test keys for that same sandbox, update the ignored `.env.sandbox.local`, and restart the listener/app. Never substitute live keys. The claim URL and API keys are deliberately absent from this document.

`pnpm payments:listen` runs the official Stripe CLI using the sandbox override, forwards the four Checkout events, saves the signing secret privately, and prints only event/HTTP status summaries. Start the app after the listener is ready, or restart it after the signing secret changes. The listener and emulators must remain running during payment tests.

## Validation and remaining work

- Web tests: 31 passed; the three emulator cases are skipped in the normal test command.
- `pnpm payments:verify`: three integration tests passed against the demo Firestore emulator. Eight concurrent order creations settled once and preserved another seller's cart line; concurrent payment/transfer receipts remained unique; late expiry preserved processed state.
- Web TypeScript check passed. Lint passed with 13 existing warnings.
- Seed succeeded against local Auth/Firestore. Browser smoke verified buyer sign-in (200), cart insertion (201), and simulated shipping (200). With the original shared Stripe account, Checkout returned the expected public-webhook isolation error before session creation.
- A separate claimable Stripe sandbox was then provisioned using the official CLI. Its test keys and local listener signing secret are stored only in the ignored `apps/web/.env.sandbox.local`. Key validation supports the sandbox-only `rkcs_test_` prefix.
- A real Hosted Checkout test-card payment of $16.56 succeeded in that isolated sandbox. The provider webhook returned 200, buyer confirmation returned 200, and demo Firestore contained one paid order and one payment receipt. Inventory moved from 10 to 9.
- Replaying the same signed event and a locally signed copy with a different event ID through the alternate webhook alias returned 200 each; order/payment counts remained one and inventory remained 9. No email or shipping document was created. Seller settlement stayed `pending_connect`, with `payoutsProcessed=false`.
- Connect account creation was attempted for the synthetic seller. Stripe returned 403: the unclaimed sandbox key lacks Connect endpoint permissions. No Connect account or seller transfer was created. This is a verified setup limitation of the new temporary sandbox, separate from the original unexplained failure.

Remaining provider validation: claim the temporary sandbox, configure full test-mode sandbox keys, complete seller onboarding, then verify original-charge-funded transfers and failed-transfer recovery. Integer money allocation (DEV-22) is still open; current order totals retain floating-point values even though the Stripe amount is rounded to cents. Account-side delivery destinations beyond the checked webhook endpoint API should also be reviewed when setting up the dedicated sandbox. Production Firebase has not been inspected or changed.

Keep the foundation tickets open: paid-but-unavailable stock compensation (DEV-14), durable settlement jobs and recipient delivery (DEV-15/DEV-43), automatic Connect recovery (DEV-20), financial permissions (DEV-8–DEV-10), and refunds/disputes remain outstanding. Historical transfers with missing local receipts require provider reconciliation. Adding source-charge parameters can produce an idempotency-parameter conflict for a previously used key; reconcile the existing transfer instead of changing its key and risking a duplicate. Provider idempotency retention alone does not guarantee permanent exactly-once transfers.

The dated audit describes the original source. This document and current source/tests supersede its specific claims about the portions implemented here; neither marks the broader launch backlog complete.

Provider references: [Stripe sandbox environments](https://docs.stripe.com/sandboxes), [separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers), [local webhook forwarding](https://docs.stripe.com/webhooks/test).
