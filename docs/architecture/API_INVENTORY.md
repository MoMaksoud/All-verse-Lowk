# API and source inventory

Baseline: `c15398da9d152040d68309786d828ad37ef57ed6`, review started 2026-11-16. This is a static route-entry inventory, not a proof that authorization and runtime validation are correct. See the audit and source for field-level policy.

All routes run within the web app and also serve mobile. Firebase UID authentication means a valid bearer token; it does not imply verified email, profile completion, seller readiness or admin rights. Admin SDK calls bypass database rules.

| Method | Path | Entry authentication | Source |
|---|---|---|---|
| DELETE | `/api/account/delete` | Firebase UID (`withApi`) | [apps/web/src/app/api/account/delete/route.ts](../../apps/web/src/app/api/account/delete/route.ts) |
| POST | `/api/ai/analyze-product` | Firebase UID (`withApi`) | [apps/web/src/app/api/ai/analyze-product/route.ts](../../apps/web/src/app/api/ai/analyze-product/route.ts) |
| POST | `/api/ai/chat` | Firebase UID (`withApi`) | [apps/web/src/app/api/ai/chat/route.ts](../../apps/web/src/app/api/ai/chat/route.ts) |
| POST | `/api/ai/market-analysis` | Public; inspect route-specific limiting/validation | [apps/web/src/app/api/ai/market-analysis/route.ts](../../apps/web/src/app/api/ai/market-analysis/route.ts) |
| POST | `/api/ai/negotiate` | Firebase UID (`withApi`) | [apps/web/src/app/api/ai/negotiate/route.ts](../../apps/web/src/app/api/ai/negotiate/route.ts) |
| GET | `/api/ai/usage` | Firebase UID (`withApi`) | [apps/web/src/app/api/ai/usage/route.ts](../../apps/web/src/app/api/ai/usage/route.ts) |
| POST | `/api/auth/send-verification-email` | Public; inspect route-specific limiting/validation | [apps/web/src/app/api/auth/send-verification-email/route.ts](../../apps/web/src/app/api/auth/send-verification-email/route.ts) |
| GET | `/api/auth/verify-token` | Public; inspect route-specific limiting/validation | [apps/web/src/app/api/auth/verify-token/route.ts](../../apps/web/src/app/api/auth/verify-token/route.ts) |
| GET | `/api/carts` | Firebase UID (`withApi`) | [apps/web/src/app/api/carts/route.ts](../../apps/web/src/app/api/carts/route.ts) |
| POST | `/api/carts` | Firebase UID (`withApi`) | [apps/web/src/app/api/carts/route.ts](../../apps/web/src/app/api/carts/route.ts) |
| PUT | `/api/carts` | Firebase UID (`withApi`) | [apps/web/src/app/api/carts/route.ts](../../apps/web/src/app/api/carts/route.ts) |
| DELETE | `/api/carts` | Firebase UID (`withApi`) | [apps/web/src/app/api/carts/route.ts](../../apps/web/src/app/api/carts/route.ts) |
| GET | `/api/categories` | Public / optional Firebase UID | [apps/web/src/app/api/categories/route.ts](../../apps/web/src/app/api/categories/route.ts) |
| POST | `/api/chats/[chatId]/messages` | Firebase UID (`withApi`) | [apps/web/src/app/api/chats/[chatId]/messages/route.ts](../../apps/web/src/app/api/chats/[chatId]/messages/route.ts) |
| GET | `/api/chats/[chatId]/messages` | Firebase UID (`withApi`) | [apps/web/src/app/api/chats/[chatId]/messages/route.ts](../../apps/web/src/app/api/chats/[chatId]/messages/route.ts) |
| PUT | `/api/chats/[chatId]/read` | Firebase UID (`withApi`) | [apps/web/src/app/api/chats/[chatId]/read/route.ts](../../apps/web/src/app/api/chats/[chatId]/read/route.ts) |
| POST | `/api/chats` | Firebase UID (`withApi`) | [apps/web/src/app/api/chats/route.ts](../../apps/web/src/app/api/chats/route.ts) |
| GET | `/api/chats` | Firebase UID (`withApi`) | [apps/web/src/app/api/chats/route.ts](../../apps/web/src/app/api/chats/route.ts) |
| GET | `/api/dev/test-email` | Firebase UID (`withApi`); production disabled; development token policy | [apps/web/src/app/api/dev/test-email/route.ts](../../apps/web/src/app/api/dev/test-email/route.ts) |
| DELETE | `/api/favorites/[listingId]` | Firebase UID (`withApi`) | [apps/web/src/app/api/favorites/[listingId]/route.ts](../../apps/web/src/app/api/favorites/[listingId]/route.ts) |
| GET | `/api/favorites` | Firebase UID (`withApi`) | [apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts) |
| POST | `/api/favorites` | Firebase UID (`withApi`) | [apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts) |
| POST | `/api/internal/payouts/retry` | Internal shared token (`x-internal-token`) | [apps/web/src/app/api/internal/payouts/retry/route.ts](../../apps/web/src/app/api/internal/payouts/retry/route.ts) |
| GET | `/api/listings/[id]` | Public / optional Firebase UID | [apps/web/src/app/api/listings/[id]/route.ts](../../apps/web/src/app/api/listings/[id]/route.ts) |
| PUT | `/api/listings/[id]` | Firebase UID (`withApi`) | [apps/web/src/app/api/listings/[id]/route.ts](../../apps/web/src/app/api/listings/[id]/route.ts) |
| DELETE | `/api/listings/[id]` | Firebase UID (`withApi`) | [apps/web/src/app/api/listings/[id]/route.ts](../../apps/web/src/app/api/listings/[id]/route.ts) |
| GET | `/api/listings` | Public; inspect route-specific limiting/validation | [apps/web/src/app/api/listings/route.ts](../../apps/web/src/app/api/listings/route.ts) |
| POST | `/api/listings` | Firebase UID (`withApi`) | [apps/web/src/app/api/listings/route.ts](../../apps/web/src/app/api/listings/route.ts) |
| GET | `/api/my-listings` | Firebase UID (`withApi`) | [apps/web/src/app/api/my-listings/route.ts](../../apps/web/src/app/api/my-listings/route.ts) |
| POST | `/api/notifications/send` | Internal shared token (`x-internal-token`) | [apps/web/src/app/api/notifications/send/route.ts](../../apps/web/src/app/api/notifications/send/route.ts) |
| POST | `/api/notifications/token` | Firebase UID (`withApi`) | [apps/web/src/app/api/notifications/token/route.ts](../../apps/web/src/app/api/notifications/token/route.ts) |
| DELETE | `/api/notifications/token` | Firebase UID (`withApi`) | [apps/web/src/app/api/notifications/token/route.ts](../../apps/web/src/app/api/notifications/token/route.ts) |
| GET | `/api/orders/[id]` | Firebase UID (`withApi`) | [apps/web/src/app/api/orders/[id]/route.ts](../../apps/web/src/app/api/orders/[id]/route.ts) |
| PATCH | `/api/orders/[id]` | Firebase UID (`withApi`) | [apps/web/src/app/api/orders/[id]/route.ts](../../apps/web/src/app/api/orders/[id]/route.ts) |
| GET | `/api/orders` | Firebase UID (`withApi`) | [apps/web/src/app/api/orders/route.ts](../../apps/web/src/app/api/orders/route.ts) |
| GET | `/api/payments/confirm` | Firebase UID (`withApi`) | [apps/web/src/app/api/payments/confirm/route.ts](../../apps/web/src/app/api/payments/confirm/route.ts) |
| POST | `/api/payments/create-checkout-session` | Firebase UID (`withApi`) | [apps/web/src/app/api/payments/create-checkout-session/route.ts](../../apps/web/src/app/api/payments/create-checkout-session/route.ts) |
| POST | `/api/prices/suggest` | Public; inspect route-specific limiting/validation | [apps/web/src/app/api/prices/suggest/route.ts](../../apps/web/src/app/api/prices/suggest/route.ts) |
| GET | `/api/profile` | Public / optional Firebase UID | [apps/web/src/app/api/profile/route.ts](../../apps/web/src/app/api/profile/route.ts) |
| PUT | `/api/profile` | Firebase UID (`withApi`) | [apps/web/src/app/api/profile/route.ts](../../apps/web/src/app/api/profile/route.ts) |
| GET | `/api/profile/stats` | Firebase UID (`withApi`) | [apps/web/src/app/api/profile/stats/route.ts](../../apps/web/src/app/api/profile/stats/route.ts) |
| POST | `/api/search/image` | Public; inspect route-specific limiting/validation | [apps/web/src/app/api/search/image/route.ts](../../apps/web/src/app/api/search/image/route.ts) |
| GET | `/api/search` | Public; inspect route-specific limiting/validation | [apps/web/src/app/api/search/route.ts](../../apps/web/src/app/api/search/route.ts) |
| GET | `/api/search/suggestions` | Public / optional Firebase UID | [apps/web/src/app/api/search/suggestions/route.ts](../../apps/web/src/app/api/search/suggestions/route.ts) |
| POST | `/api/shipping/create-label` | Firebase UID (`withApi`) | [apps/web/src/app/api/shipping/create-label/route.ts](../../apps/web/src/app/api/shipping/create-label/route.ts) |
| POST | `/api/shipping/get-rates` | Firebase UID (`withApi`) | [apps/web/src/app/api/shipping/get-rates/route.ts](../../apps/web/src/app/api/shipping/get-rates/route.ts) |
| POST | `/api/shipping/scan-label` | Firebase UID (`withApi`) | [apps/web/src/app/api/shipping/scan-label/route.ts](../../apps/web/src/app/api/shipping/scan-label/route.ts) |
| POST | `/api/stripe/connect/account-link` | Firebase UID (`withApi`) | [apps/web/src/app/api/stripe/connect/account-link/route.ts](../../apps/web/src/app/api/stripe/connect/account-link/route.ts) |
| GET | `/api/stripe/connect/account-status` | Firebase UID (`withApi`) | [apps/web/src/app/api/stripe/connect/account-status/route.ts](../../apps/web/src/app/api/stripe/connect/account-status/route.ts) |
| POST | `/api/stripe/connect/create-account` | Firebase UID (`withApi`) | [apps/web/src/app/api/stripe/connect/create-account/route.ts](../../apps/web/src/app/api/stripe/connect/create-account/route.ts) |
| POST | `/api/stripe/webhook` | Stripe raw signature; shared handler re-export | [apps/web/src/app/api/stripe/webhook/route.ts](../../apps/web/src/app/api/stripe/webhook/route.ts) |
| GET | `/api/test-shippo` | Firebase UID (`withApi`); production disabled; development token policy | [apps/web/src/app/api/test-shippo/route.ts](../../apps/web/src/app/api/test-shippo/route.ts) |
| POST | `/api/universal-search` | Public; inspect route-specific limiting/validation | [apps/web/src/app/api/universal-search/route.ts](../../apps/web/src/app/api/universal-search/route.ts) |
| GET | `/api/universal-search` | Public; inspect route-specific limiting/validation | [apps/web/src/app/api/universal-search/route.ts](../../apps/web/src/app/api/universal-search/route.ts) |
| POST | `/api/upload/ai-chat` | Firebase UID (`withApi`) | [apps/web/src/app/api/upload/ai-chat/route.ts](../../apps/web/src/app/api/upload/ai-chat/route.ts) |
| POST | `/api/upload/listing-photos` | Firebase UID (`withApi`) | [apps/web/src/app/api/upload/listing-photos/route.ts](../../apps/web/src/app/api/upload/listing-photos/route.ts) |
| DELETE | `/api/upload/listing-photos` | Firebase UID (`withApi`) | [apps/web/src/app/api/upload/listing-photos/route.ts](../../apps/web/src/app/api/upload/listing-photos/route.ts) |
| POST | `/api/upload/profile-photo` | Firebase UID (`withApi`) | [apps/web/src/app/api/upload/profile-photo/route.ts](../../apps/web/src/app/api/upload/profile-photo/route.ts) |
| DELETE | `/api/upload/profile-photo` | Firebase UID (`withApi`) | [apps/web/src/app/api/upload/profile-photo/route.ts](../../apps/web/src/app/api/upload/profile-photo/route.ts) |
| GET | `/api/users/check-username` | Public / optional Firebase UID | [apps/web/src/app/api/users/check-username/route.ts](../../apps/web/src/app/api/users/check-username/route.ts) |
| GET | `/api/users/search` | Firebase UID (`withApi`) | [apps/web/src/app/api/users/search/route.ts](../../apps/web/src/app/api/users/search/route.ts) |
| POST | `/api/webhooks/stripe` | Stripe raw signature; shared handler re-export | [apps/web/src/app/api/webhooks/stripe/route.ts](../../apps/web/src/app/api/webhooks/stripe/route.ts) |

47 route files; 62 exported HTTP method entries. Bracketed path names are route parameters.

## Important domain boundaries

| Domain | Implementation | Important restriction |
|---|---|---|
| Checkout | create-checkout-session → payments/checkout → stripe → adminCheckoutSnapshots | Current listings/rates are recalculated; session creation is not yet retry-safe |
| Webhook | both Stripe URL aliases → payments/stripeCheckoutWebhook → adminOrders | Raw signature required; snapshot-first order flow with known recovery gaps |
| Confirmation | payments/confirm → Stripe + snapshot + order | Owner read/verification; does not itself settle payment |
| Seller Connect | create-account/account-link/account-status → stripe + profiles | Mapping fields currently caller-writable; must become server-owned |
| Shipment | get-rates/create-label → Shippo + shippingLabel + order | Seller-authorized label API; direct database rule/label state gaps remain |
| Order status | orders/[id] PATCH → authz → adminOrders | API status-only guard can be bypassed by current client rules |
| Public data | listings/profile GET → Admin Firestore | Public projection/visibility must be enforced in handlers |
| Chats | chat APIs → adminChats; web also client ChatsService | Server/API and direct SDK behavior differ |

## Web pages and mobile routes

This index includes customer-facing routes and aliases, so a future agent can find flows without assuming a screen exists. Route groups in mobile do not add URL segments.

| Platform | Route/source |
|---|---|
| Web | [apps/web/src/app/about/page.tsx](../../apps/web/src/app/about/page.tsx) |
| Web | [apps/web/src/app/ai/page.tsx](../../apps/web/src/app/ai/page.tsx) |
| Web | [apps/web/src/app/ai-assistant/page.tsx](../../apps/web/src/app/ai-assistant/page.tsx) |
| Web | [apps/web/src/app/cart/page.tsx](../../apps/web/src/app/cart/page.tsx) |
| Web | [apps/web/src/app/chat/page.tsx](../../apps/web/src/app/chat/page.tsx) |
| Web | [apps/web/src/app/contact/page.tsx](../../apps/web/src/app/contact/page.tsx) |
| Web | [apps/web/src/app/discover/page.tsx](../../apps/web/src/app/discover/page.tsx) |
| Web | [apps/web/src/app/faq/page.tsx](../../apps/web/src/app/faq/page.tsx) |
| Web | [apps/web/src/app/favorites/page.tsx](../../apps/web/src/app/favorites/page.tsx) |
| Web | [apps/web/src/app/help/page.tsx](../../apps/web/src/app/help/page.tsx) |
| Web | [apps/web/src/app/listing/[listingId]/page.tsx](../../apps/web/src/app/listing/[listingId]/page.tsx) |
| Web | [apps/web/src/app/listings/[id]/edit/page.tsx](../../apps/web/src/app/listings/[id]/edit/page.tsx) |
| Web | [apps/web/src/app/listings/[id]/page.tsx](../../apps/web/src/app/listings/[id]/page.tsx) |
| Web | [apps/web/src/app/listings/page.tsx](../../apps/web/src/app/listings/page.tsx) |
| Web | [apps/web/src/app/messages/page.tsx](../../apps/web/src/app/messages/page.tsx) |
| Web | [apps/web/src/app/my-listings/page.tsx](../../apps/web/src/app/my-listings/page.tsx) |
| Web | [apps/web/src/app/offers/page.tsx](../../apps/web/src/app/offers/page.tsx) |
| Web | [apps/web/src/app/orders/page.tsx](../../apps/web/src/app/orders/page.tsx) |
| Web | [apps/web/src/app/page.tsx](../../apps/web/src/app/page.tsx) |
| Web | [apps/web/src/app/pricing/page.tsx](../../apps/web/src/app/pricing/page.tsx) |
| Web | [apps/web/src/app/privacy/page.tsx](../../apps/web/src/app/privacy/page.tsx) |
| Web | [apps/web/src/app/profile/[userId]/page.tsx](../../apps/web/src/app/profile/[userId]/page.tsx) |
| Web | [apps/web/src/app/profile/page.tsx](../../apps/web/src/app/profile/page.tsx) |
| Web | [apps/web/src/app/sales/page.tsx](../../apps/web/src/app/sales/page.tsx) |
| Web | [apps/web/src/app/search/page.tsx](../../apps/web/src/app/search/page.tsx) |
| Web | [apps/web/src/app/sell/page.tsx](../../apps/web/src/app/sell/page.tsx) |
| Web | [apps/web/src/app/seller/orders/page.tsx](../../apps/web/src/app/seller/orders/page.tsx) |
| Web | [apps/web/src/app/settings/page.tsx](../../apps/web/src/app/settings/page.tsx) |
| Web | [apps/web/src/app/signin/page.tsx](../../apps/web/src/app/signin/page.tsx) |
| Web | [apps/web/src/app/signup/page.tsx](../../apps/web/src/app/signup/page.tsx) |
| Web | [apps/web/src/app/success/page.tsx](../../apps/web/src/app/success/page.tsx) |
| Web | [apps/web/src/app/team/page.tsx](../../apps/web/src/app/team/page.tsx) |
| Web | [apps/web/src/app/terms/page.tsx](../../apps/web/src/app/terms/page.tsx) |
| Web | [apps/web/src/app/verify/page.tsx](../../apps/web/src/app/verify/page.tsx) |
| Mobile | [apps/mobile/app/(tabs)/assistant.tsx](../../apps/mobile/app/%28tabs%29/assistant.tsx) |
| Mobile | [apps/mobile/app/(tabs)/index.tsx](../../apps/mobile/app/%28tabs%29/index.tsx) |
| Mobile | [apps/mobile/app/(tabs)/messages.tsx](../../apps/mobile/app/%28tabs%29/messages.tsx) |
| Mobile | [apps/mobile/app/(tabs)/profile.tsx](../../apps/mobile/app/%28tabs%29/profile.tsx) |
| Mobile | [apps/mobile/app/(tabs)/search.tsx](../../apps/mobile/app/%28tabs%29/search.tsx) |
| Mobile | [apps/mobile/app/(tabs)/sell.tsx](../../apps/mobile/app/%28tabs%29/sell.tsx) |
| Mobile | [apps/mobile/app/auth/setup-profile.tsx](../../apps/mobile/app/auth/setup-profile.tsx) |
| Mobile | [apps/mobile/app/auth/signin.tsx](../../apps/mobile/app/auth/signin.tsx) |
| Mobile | [apps/mobile/app/auth/signup.tsx](../../apps/mobile/app/auth/signup.tsx) |
| Mobile | [apps/mobile/app/auth/verify-email.tsx](../../apps/mobile/app/auth/verify-email.tsx) |
| Mobile | [apps/mobile/app/cart.tsx](../../apps/mobile/app/cart.tsx) |
| Mobile | [apps/mobile/app/chat/[id].tsx](../../apps/mobile/app/chat/[id].tsx) |
| Mobile | [apps/mobile/app/checkout-success.tsx](../../apps/mobile/app/checkout-success.tsx) |
| Mobile | [apps/mobile/app/checkout.tsx](../../apps/mobile/app/checkout.tsx) |
| Mobile | [apps/mobile/app/favorites.tsx](../../apps/mobile/app/favorites.tsx) |
| Mobile | [apps/mobile/app/legal/about.tsx](../../apps/mobile/app/legal/about.tsx) |
| Mobile | [apps/mobile/app/legal/contact.tsx](../../apps/mobile/app/legal/contact.tsx) |
| Mobile | [apps/mobile/app/legal/faq.tsx](../../apps/mobile/app/legal/faq.tsx) |
| Mobile | [apps/mobile/app/legal/help.tsx](../../apps/mobile/app/legal/help.tsx) |
| Mobile | [apps/mobile/app/legal/privacy.tsx](../../apps/mobile/app/legal/privacy.tsx) |
| Mobile | [apps/mobile/app/legal/terms.tsx](../../apps/mobile/app/legal/terms.tsx) |
| Mobile | [apps/mobile/app/listing/[id]/edit.tsx](../../apps/mobile/app/listing/[id]/edit.tsx) |
| Mobile | [apps/mobile/app/listing/[id].tsx](../../apps/mobile/app/listing/[id].tsx) |
| Mobile | [apps/mobile/app/listing/edit/[id].tsx](../../apps/mobile/app/listing/edit/[id].tsx) |
| Mobile | [apps/mobile/app/orders.tsx](../../apps/mobile/app/orders.tsx) |
| Mobile | [apps/mobile/app/profile/[userId].tsx](../../apps/mobile/app/profile/[userId].tsx) |

## Direct Firebase client data access

These modules import client Firestore APIs. Types/config imports do not necessarily perform a query. Review actual operations and rules before migrating a domain; web listeners and uploads must continue to work.

- [apps/mobile/contexts/AuthContext.tsx](../../apps/mobile/contexts/AuthContext.tsx)
- [apps/mobile/lib/firebase/config.ts](../../apps/mobile/lib/firebase/config.ts)
- [apps/web/src/app/api/users/search/route.ts](../../apps/web/src/app/api/users/search/route.ts)
- [apps/web/src/app/orders/page.tsx](../../apps/web/src/app/orders/page.tsx)
- [apps/web/src/app/sales/page.tsx](../../apps/web/src/app/sales/page.tsx)
- [apps/web/src/lib/firebase.ts](../../apps/web/src/lib/firebase.ts)
- [apps/web/src/lib/firestore.ts](../../apps/web/src/lib/firestore.ts)
- [apps/web/src/lib/services/firestore.ts](../../apps/web/src/lib/services/firestore.ts)
- [apps/web/src/lib/types/firestore.ts](../../apps/web/src/lib/types/firestore.ts)

Client Storage operations also exist in `apps/web/src/lib/storage.ts` and are used by both components and server routes. Server authentication does not propagate to that SDK.

## Configuration and historical documents

- Runtime/deploy: root package.json, pnpm-workspace.yaml, turbo.json, vercel.json, firebase.json, apps/mobile/app.json and apps/mobile/eas.json.
- Rules/indexes: apps/web/firestore.rules and apps/web/firestore.indexes.json; no tracked Storage policy.
- Current search design reference: SEARCH_REFINEMENT_UPGRADE_README.md; SEARCH_ARCHITECTURE_BASELINE.md is historical.
- PAYMENTS_FLOW.md and apps/web/docs/SYSTEM_CONTRACT.md are marked historical because source now uses snapshots and creates orders after payment.
- UI_UX_AUDIT.md contains several already-implemented changes; do not recreate those tickets without source verification.
- Source package inventory: 240 web source TS/TSX/JS files, 61 mobile TS/TSX/JS/MJS files, 5 shared source files and 1 functions source file at the reviewed baseline. Native generated dependencies, binaries and styling were not all semantically audited.
