# API Quick Reference (Mocked)

All responses are JSON. Errors follow `{ "error": { "code", "message" } }`.

> Auth: none. Use `x-user-id` header to simulate a user (defaults to `u2`).

## Listings

- `GET /api/listings?q=&category=&min=&max=&page=&limit=` → `{ items[], total, page, limit, hasMore }`
- `POST /api/listings` body `{ title, description, price, currency:"USD", category, photos[] }` → 201 Listing
- `GET /api/listings/:id` → Listing
- `PATCH /api/listings/:id` body partial of Listing (except id/sellerId/createdAt) → Listing
- `DELETE /api/listings/:id` → `{ ok: true }`

## Price Suggestion
- `POST /api/prices/suggest` body `{ title, description, photos[] }` → `{ price, rationale }`

## Chat
- `GET /api/chat/rooms?listingId=...` → returns (and auto-creates) room for current user & listing
- `GET /api/chat/rooms` → rooms for current user
- `GET /api/chat/messages?roomId=...&cursor=...&limit=20` → `{ items[], nextCursor }`
- `POST /api/chat/messages` body `{ roomId, text | image }` → 201 message

## Users & Profiles
- `GET /api/users?q=...` → basic search
- `POST /api/users` body `{ name, email, avatar? }` → 201 user
- `GET /api/users/:id` → user
- `PATCH /api/users/:id` body partial user → user
- `GET /api/profiles/:userId` → profile
- `PUT /api/profiles/:userId` body partial profile → profile (upsert)

## Orders (placeholder)
- `POST /api/orders/checkout-session` → `{ checkoutUrl }`

## Stripe Webhook (demo)
- `POST /api/webhooks/stripe` → logs raw payload, returns `{ received:true }`

## Error Codes
`BAD_REQUEST, NOT_FOUND, UNAUTHORIZED, RATE_LIMITED, INTERNAL, CONFLICT, UNPROCESSABLE, TOO_LARGE, METHOD_NOT_ALLOWED`
