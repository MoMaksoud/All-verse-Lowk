# Commerce System Contract

This document defines the current source-of-truth behavior for checkout, payment, inventory, payouts, and shipping labels.

## 1) Order creation

- Route: `POST /api/payments/create-checkout-session`
- Source of cart truth: `carts/{userId}` from server-side Admin read.
- The route creates:
  - `orders/{orderId}` with `status: "pending"`.
  - one pending payment record in `payments`.
  - a Stripe Checkout Session that stores `metadata.orderId`.
- The route stores `checkoutSessionId` on the order after Stripe returns successfully.

## 2) Payment record lifecycle

- Pending payment is created during checkout session creation.
- Stripe webhook transitions matching payment records to `succeeded`.
- If no payment row exists (unexpected path), webhook creates a succeeded payment row.
- Duplicate webhook deliveries must not create duplicate successful payment state transitions.

## 3) Webhook settlement and idempotency

- Event-level lock collection: `stripe_webhook_events/{eventId}`.
- Lock states:
  - `processing=true` while active.
  - `processed=true` after completion.
- Order-level guard:
  - `lastStripeCheckoutSessionId`
  - `checkoutWebhookSettledAt`
- If a second Stripe event arrives for the same checkout session (`checkout.session.completed` and `checkout.session.async_payment_succeeded`), processing short-circuits once settlement fields match.

## 4) Inventory changes

- Inventory changes only in webhook paid path.
- Guard field: `inventoryAdjusted`.
- Listing update contract:
  - decrement `inventory`
  - increment `soldCount`
  - set sold flags when inventory reaches `0`
- Non-goal: no automatic inventory rollback for refunds in current version.

## 5) Payout behavior

- Payout attempts happen after core payment/order state is committed.
- Successful payout sets:
  - `payoutStatus: "complete"`
  - `payoutsProcessed: true`
  - `payoutRetryable: false`
- Partial failure sets:
  - `payoutStatus: "partial_failed"`
  - `payoutFailures[]`
  - `payoutRetryable: true`
- Transfer idempotency:
  - Stripe transfer uses deterministic `idempotencyKey` per order line.
  - Order stores `payoutTransferIds[]` ledger by line key to avoid duplicate transfers on reprocessing.

## 6) Cart clearing

- Cart clear runs in paid webhook path after payment/inventory handling.
- Guard field: `cartCleared`.
- Cart should only clear once per order.

## 7) Shipping label creation contract

- Label route: `POST /api/shipping/create-label`.
- Authorization: requester must be an order seller (`canCreateShippingLabel`).
- Lock location: `orders/{orderId}/shipping/primary`.
- Lock states:
  - `processing`
  - `success`
  - `failed`
- Expired/invalid rate behavior:
  - re-quote shipping once
  - update `order.shipping`
  - retry purchase one time
- Response codes:
  - `RATE_REFRESHED`
  - `SHIPPO_DECLINED`
  - `FORBIDDEN`

## 8) Recovery and support path

- Internal retry endpoint:
  - `POST /api/internal/payouts/retry`
  - auth via `x-internal-token` matching `INTERNAL_OPS_TOKEN`
  - retries only missing/unsettled payout lines
  - keeps `payoutTransferIds` ledger
- This endpoint is the preferred recovery path over manual Firestore edits.

## 9) Non-goals (current release)

- No inbound Shippo webhook integration.
- No refund automation or compensating rollback workflow.
- No multi-currency payout logic.
- No broad architectural redesign; reliability hardening only.
