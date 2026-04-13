# Payments Flow

## Current Stripe Flow

### Web
1. The buyer fills out shipping info in `apps/web/src/components/CheckoutForm.tsx`.
2. The client calls `POST /api/payments/create-checkout-session`.
3. The server re-validates everything before creating Stripe checkout:
   - listing availability
   - listing price
   - shipping quote
   - tax and fees
4. The server creates the order in Firestore, creates a Stripe Checkout Session, stores `checkoutSessionId`, and returns the hosted Stripe URL.
5. The browser redirects to Stripe Checkout.

### Mobile
1. The buyer fills out shipping info in `apps/mobile/app/checkout.tsx`.
2. The app calls `POST /api/payments/create-checkout-session`.
3. The server performs the same trusted validation and pricing logic as web.
4. The app opens the returned hosted Stripe Checkout URL in the browser.

## Source Of Truth

The server is the source of truth for amounts.

The checkout routes no longer trust:
- `priceAtAdd` from the client request
- `selectedShipping.price` from the client request
- `taxRate` from the client request

Instead, the server recalculates:
- item totals from the current listing record
- shipping from a fresh Shippo quote
- fees from the final taxable amount

## Webhook Flow

Stripe should send `checkout.session.completed` to either:
- `/api/webhooks/stripe`
- `/api/stripe/webhook`

Both routes now use the same shared handler:
- `apps/web/src/lib/payments/stripeCheckoutWebhook.ts`

That handler:
1. Verifies the Stripe signature.
2. Acquires an idempotency lock for the Stripe event.
3. Looks up `metadata.orderId`.
4. Marks the order paid.
5. Marks payment records succeeded.
6. Adjusts inventory once.
7. Processes seller payouts once.
8. Clears the cart once.
9. Sends emails if they have not already been sent.

## Important Notes

- `POST /api/payments/create-intent` is still present, but mobile now uses hosted Checkout instead of the incomplete PaymentIntent flow.
- The hosted Stripe page is the final amount the buyer should trust if a cart has gone stale.
- Order docs now store fulfillment flags so webhook retries do not repeat inventory, payouts, or cart clearing.

## Expected Env

At minimum, checkout/webhooks need:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `SENDGRID_ORDER_TEMPLATE_ID`
- `SENDGRID_SELLER_TEMPLATE_ID`
- `SHIPPO_API_KEY`
- `NEXT_PUBLIC_APP_URL` recommended for correct redirects
