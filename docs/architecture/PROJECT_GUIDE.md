# AllVerse architecture and implementation guide

Reviewed 2026-11-16 against commit `c15398da9d152040d68309786d828ad37ef57ed6` on `main`. Repository: `MoMaksoud/All-verse-Lowk`.

This describes the current source, including defects. Proposed changes are explicitly identified and mapped to audit IDs. It does not establish the deployed Firebase rules, Stripe account settings, Shippo carrier configuration, Vercel settings, or actual customer transaction state.

## 1. Product and system boundary

AllVerse is a peer-to-peer physical-goods marketplace. Sellers upload photos, optionally obtain an AI listing draft and pricing suggestions, publish listings and communicate with buyers. Buyers discover internal listings and external marketplace links, save favorites, message sellers, add items to a cart and pay through Stripe Hosted Checkout. Internal orders use Shippo for shipment rates and labels. External results lead to other marketplaces; they are not AllVerse inventory or orders.

The basic transaction is incomplete until a buyer has a recorded order or refund outcome, the correct seller has traceable proceeds, the seller can fulfill the parcel, the buyer can follow delivery, and support can resolve failures. A success screen or provider API success alone does not prove that lifecycle is complete.

## 2. Runtime and code ownership

| Unit | Current technology and responsibility | Entry points |
|---|---|---|
| Web frontend | Next.js 14 / React 18 / Tailwind; App Router pages and client components | `apps/web/src/app`, `components`, `contexts` |
| Shared backend | Next.js API routes, Firebase Admin, server domain helpers; serves web and mobile | `apps/web/src/app/api`, `lib/server`, `lib/payments` |
| Mobile frontend | Expo 54 / React Native 0.81 / React 19 / Expo Router | `apps/mobile/app`, `lib/api/client.ts` |
| Identity | Firebase Auth; email/password and Google; bearer ID tokens for APIs | web/mobile AuthContext, `lib/withApi.ts`, `lib/firebase-admin.ts` |
| Database | Firestore documents plus realtime client listeners | `lib/server/admin*.ts`; client services still coexist |
| Files | Firebase Storage / Google Cloud Storage | `lib/storage.ts`, `storage-admin.ts`, upload routes |
| Payments | Stripe Hosted Checkout on the platform, Express Connect seller accounts, separate transfers | `lib/stripe.ts`, `lib/payments/stripeCheckoutWebhook.ts` |
| Shipping | Shippo shipment/rate and transaction APIs | `lib/shippo.ts`, `lib/payments/checkout.ts`, `shippingLabel.ts` |
| AI and discovery | Gemini via two SDKs; SerpAPI Shopping/Organic/Amazon adapters | `lib/aiAnalysis.ts`, `gemini.ts`, `marketPricing.ts`, `lib/search` |
| Email | SendGrid template-based verification/order/seller/tracking emails | `lib/email.ts`, `emailLog.ts` |
| Push | Expo Push API plus scheduled Firebase functions | `lib/server/push-notifications.ts`, `functions/src/index.ts` |
| Shared packages | Zod profile/types and utility helpers; no shared complete commerce domain | `packages/types`, `packages/shared-logic` |

This is a shared-backend monorepo, not two independent backends. Most domain behavior lives in the web package. `functions` currently contains promotional/cart push schedules, not durable payment or fulfillment workers.

## 3. Trust boundaries and data access

There are two concurrent access paths:

1. Web/mobile call a Next API with a Firebase bearer token. `withApi` authenticates by default and adds per-process IP limiting/security headers. Some public search, verification and pricing routes implement their own behavior and bypass that wrapper. Internal payout retry/notification-send use `x-internal-token`.
2. Web directly uses Firebase client Firestore/Storage for profiles, cart services, chat, order/sales subscriptions and uploads. Mobile reads its own profile through Firestore for its onboarding gate and mainly uses the backend for business requests.

Admin reads/writes bypass Firestore rules. Every Admin-backed route must separately authorize the actor and select public fields. Conversely, API authorization does not restrict direct SDK writes. Bearer verification does not sign a separately initialized client Storage SDK into the caller's account.

The checked-in policies are unsafe for financial ownership: orders are client-creatable and participant-updatable; profiles are public and owner-writable with private/payment-related data mixed in. Those are findings AV-F001–005, not patterns to preserve. A safe target is server-owned financial data with participant-scoped reads, explicit public profile projections and private seller/customer operational data.

## 4. Firestore model

| Path | Existing purpose and fields | Current writer/readers and caveats |
|---|---|---|
| `users/{uid}` | Auth-adjacent name/email/photo, role, deletion marker | Admin and client user services; owner-writable role/deletion fields need protection |
| `profiles/{uid}` | Public identity plus phone, age/preferences, shipping address, Connect mapping, push token | API/Admin and client ProfileService; public read leaks private fields |
| `usernames/{normalized}` | `{userId, claimedAt}` reservation | Admin transaction only; legacy profile writers do not maintain it |
| `listings/{id}` | Seller/title/description/price/currency/images/category/condition, inventory, isActive, sold flags, searchKeywords, optional shipping dimensions | API/Admin and legacy client listing writers; overlapping availability semantics |
| `carts/{uid}` | `items[{listingId,sellerId,qty,priceAtAdd}]`, updatedAt | API/Admin and client services; qty=1 API rule differs from permissive SDK arrays |
| `checkout_snapshots/{sessionId}` | Trusted items/totals/address/rate, buyer/session, expiry/status, eventual orderId | Server checkout writes; webhook reads and processes |
| `orders/{id}` | Buyer/items/sellerIds, financial totals, shipping address/selection, session/intent IDs, status and fulfillment/payout flags | New flow writes after payment; web realtime orders/sales read directly |
| `orders/{id}/shipping/primary` | Temporary label lock, status, trackingNumber/labelUrl/carrier/service/rateId/shipmentId | Auto/manual label workflows; one primary shipment only; provider transaction ID not retained |
| `payments/{randomId}` | Order/user, amount/currency, stripeEventId reference, status | Server writes after order commit; `stripeEventId` actually receives intent/session reference in active flow |
| `stripe_webhook_events/{eventId}` | processing/processed, temporary lease, type/order/error | Server event-level idempotency; does not enforce session-level atomic uniqueness |
| `chats/{sortedUidPair}` | Participants, embedded profiles, lastMessage, unreadCount, lastOpenedAt, deletion markers | Both Admin/client chat services; permissive update rules and split writes |
| `chats/{chatId}/messages/{id}` | sender/text/timestamp/readBy/optional listingId | Separate message + chat-summary writes; unbounded history reads |
| `favorites/{uid}` | listingIds array | API/Admin; same-user favorites API is implemented, so it is not a missing feature |
| `profile_photos/{uid}`, `listing_photos/{listingId}` | Storage URLs/paths and upload metadata | Mixed Admin/client handling; actual assets can be stored under temp/AI paths |
| `verification_tokens/{uuid}` | UID/email/expiry/used state | Custom web verification; identity-binding flaw AV-F004 |
| `ai_usage/{uid_YYYY-MM-DD}` | tokensUsed/requests/date | Server token budget used by chat, with fail-open/non-atomic behavior |
| `email_logs/{id}` | type/recipient/status/order/error | Observability record, not a durable delivery queue |

Canonical-ish commerce interfaces are in `apps/web/src/lib/types/firestore.ts`; profile types also exist in `lib/firestore.ts` and `packages/types/src/index.ts`. `SimpleListing`, `FirestoreListing`, API DTOs and mobile local interfaces differ. TypeScript interfaces do not validate HTTP JSON or existing Firestore documents.

## 5. Identity and onboarding flow

Firebase creates/signs in the user. Web signup then saves a profile through `/api/profile`, including username reservation via Admin. Mobile has a verification screen and a minimal username/display-name setup screen; its root AuthGate redirects signed-in unverified/profile-incomplete users.

Web uses custom SendGrid verification links backed by `verification_tokens`; mobile uses Firebase email verification. The custom endpoint currently trusts caller UID/email and must be fixed. `withApi` only checks the ID-token UID, so client navigation gates do not establish action eligibility. Password change exists in web settings; a forgotten-password recovery flow was not found. Account deletion exists but currently deletes data needed for open orders and financial recovery.

See AV-F003–004, AV-F032–035 and AV-F051 before expanding identity/eligibility behavior. Terms/privacy say 18+, while profile schemas/forms allow 13+. The app's business owner must choose and enforce a consistent policy.

## 6. Seller listing flow and media

Web sell creates a temporary listing identifier to upload photos directly through client Storage. The optional AI flow calls `/api/ai/analyze-product`, collects missing information, and produces a seller-reviewed draft. `mapListingSubmit.ts` builds the payload; publishing creates a new random listing document ID. Package dimensions are optional. AI failure allows manual details.

Mobile uploads photos using `/api/upload/ai-chat`, calls the same analysis backend, then publishes through `/api/listings`. It does not submit package dimensions or complete seller Connect onboarding. Analysis and publishing can upload the same local photos separately. Assets published from the AI route are publicly readable URLs and remain under the AI-upload prefix.

Create/update listing routes override seller identity on create but lack comprehensive runtime schemas; update forwards unknown fields. Sold flags and image storage paths are inconsistent across flows. Photos, AI drafts and market pricing are implemented; asset ownership/lifecycle, reliable packaging and strict publication validation need work (AV-F020, AV-F027–031, AV-F038).

## 7. Cart and checkout: current implementation

1. Clients add a listing through `/api/carts`; the API sets qty=1 and re-add is a no-op. Admin helpers overwrite a cart array after a read. Cart metadata is still caller-supplied and direct SDK writes remain possible.
2. Web/mobile group displayed items by seller and preview shipping. Client totals use cart prices and estimated fees/tax, so they may be stale.
3. `/api/payments/create-checkout-session` loads `carts/{authenticatedUid}` using Admin, optionally filters by requested sellerId, and calls `prepareTrustedCheckout`.
4. Trusted preparation loads current listings, checks availability/quantity/seller mismatch, calculates current item prices, creates fresh Shippo shipments and calculates totals. It does not reserve stock, enforce Connect readiness or enforce buyer!=seller independently.
5. The Stripe helper creates a platform Checkout Session for a single generic USD `Order` line; metadata contains buyerId. Sessions expire in 30 minutes. There is no destination charge or automatic seller transfer attached to Session creation.
6. After Stripe returns, the API writes `checkout_snapshots/{sessionId}` with trusted data and a 30-minute expiresAt. This timestamp is not proof a Firestore TTL policy is deployed.
7. Web redirects to Stripe. Mobile opens an auth browser and returns through `allversegpt://`; clients request payment confirmation afterward.

The authoritative recalculation is valuable and should be preserved. However, one server cart is not necessarily trusted if the client can arbitrarily write its contents. Runtime schema/ownership validation and versioned quotes remain necessary.

The per-seller scope is optional server-side. The dormant mixed-seller path quotes several sellers but the order does not retain the sellerShippingRates array and only supports one primary label. The simplest proposed baseline is to enforce one seller per session, subject to product approval (AV-F018/051).

## 8. Paid webhook and settlement sequence

Both webhook URL aliases resolve to the same handler. The handler verifies the raw Stripe signature and supports:

- `checkout.session.completed` and `checkout.session.async_payment_succeeded` for paid settlement.
- `checkout.session.expired` and `checkout.session.async_payment_failed` to mark a snapshot expired.
- Other events are acknowledged without domain handling, including Connect capability, bank payout, refund and dispute changes.

For paid settlement it obtains an event-level Firestore lease (five minutes), retrieves the Stripe Session, requires paid status, loads the snapshot and checks amount. If a snapshot is already processed, it acknowledges immediately. Otherwise `createOrderFromSnapshotAdmin` runs a transaction that reads current listings/cart, checks stock, creates a random paid order, decrements stock, removes purchased listing IDs from the cart and marks the snapshot processed.

After that transaction, the handler ensures a payment record, attempts each seller line transfer, stores ledger/status, sends buyer/seller emails, starts best-effort push and attempts an automatic shipping label. It then marks the event complete. Legacy pre-snapshot sessions with metadata.orderId use a separate path with older flags and non-atomic inventory/cart helpers.

Three critical boundaries:

1. The transaction never rereads/claims the snapshot; two handlers holding different event IDs can create duplicate orders when stock permits (AV-F006).
2. Stock may become unavailable after Stripe charges the buyer; the handler errors without creating an order/refund/exception outcome (AV-F007).
3. The processed-snapshot early return skips unfinished payment/transfer/communication/label steps after a post-commit failure (AV-F008).

Target invariants: one session maps to one outcome; every paid session is reconciled; each external side effect has durable identity/state; retries resume unfinished work. These can be implemented within the existing Next.js/Firebase architecture with transactions and durable jobs, without a wholesale rewrite.

## 9. Seller money flow

Customer payment is collected on the platform. For each order item, the code calculates `item unitPrice × qty`, deducts 4.5% and creates a USD transfer to the seller's stored Express Connect account if its onboarding flag is true. Transfer requests have deterministic per-line idempotency keys; successful transfer IDs are eventually stored on the order. Missing onboarding produces `pending_connect`; provider failures produce `partial_failed`.

This is an immediate Connect transfer attempt, not a bank payout confirmation, escrow, delivery-based release or proof of settled available funds. The transfer is not associated with a source charge/group. The retry endpoint skips missing Connect sellers but can incorrectly mark the order complete. There is no scheduler/account-updated consumer to discover and release pending balances, no refund/reversal orchestration, and no bank payout lifecycle.

The sales page exists and supports web Connect onboarding and label access, but its displayed seller total includes prorated buyer tax/processing fees rather than a real net-earnings statement. The complete money ledger should distinguish customer charge, tax liability, label cost, platform fee, provider fees, seller transfer, reversals and bank payout. See AV-F010–017.

## 10. Shipping and order lifecycle

Trusted quotes currently use seller ZIP only, with a fallback of 10001, even if a full origin was saved. Package data is taken from the first listing with dimensions or defaults to 2 lb and 12×8×6 inches. Web also offers Canada despite digit-only five-digit ZIP normalization and US origins. Returned rates are normalized into four named tiers when matching carrier service tokens exist.

Automatic/manual label purchase uses `orders/{id}/shipping/primary` as a five-minute lock and calls Shippo transactions. The helper polls up to ten times and returns tracking/label data, but does not persist the provider transaction ID before it can be lost. Manual create-label can requote a stale rate once; its heuristic may not recognize provider errors collapsed to generic messages.

Both label paths currently mark the order shipped immediately. No inbound carrier-tracking consumer exists. The order state table allows pending buyer cancellation, paid seller shipping, and shipped buyer delivery confirmation. There are no paid-cancellation, refund, return, lost parcel or dispute states. Order state PATCH is not transactional with the read precondition.

Web orders/sales subscribe directly to Firestore and fetch shipping subdocuments. Mobile buyer orders calls `/api/orders` and expects top-level trackingNumber that the API does not provide. Native seller operations are absent. See AV-F019–025, AV-F038–040.

## 11. Search, AI and messaging

Web `/search` initially calls `serverSearch -> runPipeline` in process. The pipeline normalizes query/state, infers aliases/vertical, retrieves internal and external results, evaluates quality and may ask up to two refinement rounds or rewrite the query. Refinement UI calls `/api/search` and updates local state/URL. Internal retrieval scans up to 200 active listings; external adapters use SerpAPI Shopping/Organic, with an Amazon affiliate addition. The newer pipeline returns `summary: null`; search event persistence is stubbed.

Mobile text search calls the older `/api/universal-search` implementation with its own internal scan, Gemini logic, response shape and process-local cache. Shared type names do not unify the stacks. Basic full-catalog retrieval and availability correctness outrank new refinement features.

AI analysis fetches caller-provided image URLs and forwards files to Gemini; label scan does likewise. These need owned-asset validation and bounded fetching. Public search/image endpoints can spend provider money without a durable shared limiter. Chat token accounting fails open and is not atomic. Do not treat AI-generated descriptions, suggested prices or negotiation messages as payment authorization.

Chats use a deterministic sorted UID-pair ID. Web still uses client chat services, which read another user's private users document and conflict with checked-in rules. Mobile uses authorized chat APIs. Message creation and summary/unread updates are separate; message histories are unbounded. Mobile offers are formatted chat messages, with no price-redemption contract. See AV-F035–036, AV-F041, AV-F043–046.

## 12. Notifications and operations

Transactional email templates and logging exist. The order uses one emailSent flag across buyer and seller recipients. There is no independent per-recipient durable delivery job. Push helpers send to Expo but do not process receipts. Several calls are unawaited and may be lost when the request process ends.

The separately deployed functions run daily cart reminders and weekly buyer/seller nudges. They do not implement payment reconciliation or fulfillment recovery. Profiles hold one push token rather than a private multi-device/consent registry.

There is no operator application or case/reconciliation queue in this repository. Contact/help link to email, and an internal-token payout retry is available. Production dashboards may have manual practices, but those were not reviewed. See AV-F037 and AV-F047–050.

## 13. Configuration and local development

Use the declared pnpm workspace with `apps/*` and `packages/*`. Build `@marketplace/types` before relying on a fresh `dist`. Shared-logic exports TypeScript source and has no build script. `functions` requires its own dependency installation/build step. Root `pnpm dev` runs Turbo dev scripts, while mobile uses its own `start` script.

Important environment names (no values):

| Scope | Names |
|---|---|
| Web public Firebase client | `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` |
| Server Firebase | `FIREBASE_SERVICE_ACCOUNT_KEY` or appropriate default credentials; `FIREBASE_STORAGE_BUCKET` |
| Server commerce | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SHIPPO_API_KEY`, `INTERNAL_OPS_TOKEN` |
| Server email | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_VERIFICATION_TEMPLATE_ID`, `SENDGRID_ORDER_TEMPLATE_ID`, `SENDGRID_SELLER_TEMPLATE_ID`, optional `SENDGRID_TRACKING_TEMPLATE_ID` |
| Server discovery | `GEMINI_API_KEY`, `SERPAPI_API_KEY`, production `AMAZON_ASSOCIATE_TAG`; search flags/defaults in source |
| Origins | `NEXT_PUBLIC_APP_URL` for web/payment redirects; mobile `EXPO_PUBLIC_API_URL` |
| Mobile public identity | `EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |

Do not put server provider credentials into public/mobile variables. `aiAnalysis.ts` still accepts a `NEXT_PUBLIC_GEMINI_API_KEY` fallback; remove public-secret conventions when hardening configuration. The presence of that reference does not prove a key was configured or leaked.

Vercel config runs Turbo with `--filter=web`; the audit dry run confirmed that the installed Turbo resolves this to `@marketplace/web` and its package dependencies. This is not a demonstrated build-filter bug. A complete deployment build was not run. `firebase.json` configures functions only and does not wire checked-in Firestore rules/indexes or Storage policy. EAS profiles specify Node 20.19.0 and pnpm 8.15.0. Live project/secret/webhook settings remain to be verified.

## 14. Recommended implementation sequence and handoff

Read the [audit](../audits/2026-11-16-foundation-audit.md) for release gates and [backlog](../backlog/FOUNDATION_BACKLOG.md) for acceptance criteria. Begin with data/identity containment and session/order recovery, then finish money/shipping contracts, then lifecycle support and client parity. Use the seven epics as domain organization and the dependencies as execution constraints.

Product decisions belong to AV-F051; engineers should not silently choose tax responsibility, bank payout timing, return policy or geographic expansion. Small manual support workflows can be acceptable initial implementations when explicit, auditable and tested. Cosmetic UI changes, reviews and richer AI features should not displace payment/fulfillment correctness.

## 15. Provider guidance checked during this review

- Stripe documents separate-charge transfer funding, including associating a transfer with its source charge and the need to retry failed transfers. This supports the funding/reconciliation work; it does not prove a specific production failure occurred. [Transfer guide](https://docs.stripe.com/connect/marketplace/tasks/accept-payment/separate-charges-and-transfers).
- Stripe's marketplace guide explains refund/dispute balance effects and transfer recovery. The implementation needs a matching workflow. [Refunds and disputes](https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes).
- Stripe recommends webhook fulfillment that tolerates repeated/concurrent calls. Redirect-only success is insufficient. [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment.md?ui=full-page).
- Shippo distinguishes label-created/pre-transit, carrier transit, delivered and exception statuses and supplies tracking events. [Tracking guide](https://docs.goshippo.com/tracking/tracking).
- Firebase documents the client rules boundary and server authorization distinction. [Firestore rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions).

These were checked as implementation guidance, not as legal/tax advice or a full provider-configuration audit.
