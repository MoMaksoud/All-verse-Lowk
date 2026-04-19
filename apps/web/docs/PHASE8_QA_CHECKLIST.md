# Phase 8 QA Checklist

Use this checklist for staging and production verification after reliability refactors.

## Environment setup

- API base URL configured and reachable.
- Firebase Auth test users available (`buyerA`, `sellerA`, `sellerB`, `guest`).
- Stripe test mode enabled; Stripe CLI configured for webhook forwarding.
- Shippo API key configured.
- At least one listing from `sellerA` with inventory > 1.

## Test matrix

| Flow | Preconditions | Steps | Expected result | Evidence to capture |
|---|---|---|---|---|
| Guest protected action | Logged out | `POST /api/carts` without bearer token | `401` with stable JSON error shape | Response body + status |
| Signed-in add to cart | `buyerA` token | `POST /api/carts` with valid listing | Item appears in `GET /api/carts` | Cart payload |
| Checkout creates order | Cart has one active listing | `POST /api/payments/create-checkout-session` | `200`, `orderId`, `sessionId`, checkout URL | API payload + Firestore `orders/{orderId}` |
| Webhook updates order | Stripe session paid | Trigger `checkout.session.completed` | Order status becomes `paid`; payment row `succeeded`; `inventoryAdjusted=true`; `cartCleared=true` | Webhook response + order/payment docs |
| Connect payout succeeds | Seller has valid Connect account | Process paid webhook event | `payoutStatus=complete`; `payoutsProcessed=true`; no payout failures | Order payout fields + Stripe transfer |
| Connect payout partially fails | One seller transfer intentionally fails | Process paid webhook event | Webhook returns `200`; order has `payoutStatus=partial_failed`, `payoutRetryable=true`, `payoutFailures[]` | Webhook response + order payout fields |
| Seller creates shipping label | Paid order, requester is order seller | `POST /api/shipping/create-label` | `200`, tracking + label URL persisted under `orders/{id}/shipping/primary` | API payload + shipping subdoc |
| Expired Shippo rate requote | Paid order with stale rateId | Call create-label with stale rate | Order shipping refreshed; one retry attempted; success or `SHIPPO_DECLINED` | API payload + updated `order.shipping` |
| Wrong seller blocked | User is buyer or unrelated seller | Call create-label | `403` with `FORBIDDEN` code | Response body + status |
| Chat permissions | Two users, one outsider | Outsider reads/sends for chat | `403` denied; participants still can send/read | API responses |
| Profile GET incomplete docs | User exists without profile doc | `GET /api/profile` | `200` with `data: null` (or defined placeholder contract) | Response payload |
| Listing photos upload | Authenticated listing owner | `POST /api/upload/listing-photos` | Upload succeeds; listing images updated | API payload + listing doc |
| Profile photo upload | Authenticated user | `POST /api/upload/profile-photo` | Upload succeeds; profile/user photo fields updated | API payload + profile/users docs |

## Duplicate-event and idempotency checks

### Stripe duplicate event replay

- Trigger same Stripe event twice (same `event.id`) through Stripe CLI replay.
- Expected:
  - Second call returns idempotent/processing-safe response.
  - No duplicate payment docs.
  - Inventory does not decrement again.
  - Cart clear and email flags stay stable.

### Multi-event same session

- Trigger both `checkout.session.completed` and `checkout.session.async_payment_succeeded` for same checkout session.
- Expected:
  - Order settles once per session.
  - No duplicate seller transfer for already-processed line items.

### Shipping label repeated attempts

- Call create-label multiple times quickly.
- Expected:
  - Active processing lock returns conflict/processing signal.
  - Success path remains single-source and does not create inconsistent shipping state.

## Money and inventory invariants

Verify these invariants for each paid order tested:

- Inventory decremented exactly once per line item.
- Listing sold flags set only when inventory reaches zero.
- Cart cleared once after successful payment processing.
- Partial payout failure does not roll back paid order state.
- `payoutFailures` includes seller identifiers and timestamp fields.

## Logging checks

Confirm logs include correlation fields where applicable:

- `route` or operation name.
- `orderId`.
- `userId` (if known in route context).
- `sessionId` and/or `paymentIntentId` for checkout/webhook paths.
- `shipmentId` + `rateId` for shipping label operations.

## Sign-off

- [ ] Staging matrix complete.
- [ ] Production matrix complete.
- [ ] Idempotency replay checks complete.
- [ ] Invariant review complete.
- [ ] Logs verified for correlation fields.
