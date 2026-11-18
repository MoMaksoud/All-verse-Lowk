# AllVerse foundation and transaction-readiness audit

Reviewed 2026-11-16, source commit `c15398da9d152040d68309786d828ad37ef57ed6`. Scope: the local `All-verse-Lowk` repository on `main` and the connected DEV Jira project. The source tree was initially clean. No production data, provider settings, deployed policies or live transactions were inspected or changed.

Review/publication completed 2026-11-17. All seven epics, 52 child issues and 115 native dependency links were created in DEV and read back successfully. The filenames/labels retain the review's start date. See [the verified Jira mapping](../backlog/JIRA_MAPPING.md).

**Assessment:** the repository contains much of a marketplace's visible functionality, but it does not yet provide a reliably recoverable end-to-end transaction lifecycle. Real-money readiness cannot be established from this source: critical identity/data permissions and payment-settlement failure paths remain unresolved. This is a source assessment, not a finding that a particular customer has lost money or that production uses these exact rules.

The deliverable is [52 implementation issues](../backlog/FOUNDATION_BACKLOG.md), grouped into seven epics, with 147 source references checked against the reviewed commit. Severity distribution: **9 P0, 38 P1, 5 P2**. [Architecture guide](../architecture/PROJECT_GUIDE.md), [structured backlog](../backlog/foundation-backlog.json), [CSV](../backlog/foundation-backlog.csv), [Jira mapping](../backlog/JIRA_MAPPING.md).

## What already exists

| Capability | Evidence and current limit |
|---|---|
| Web/mobile account creation and sign-in | Firebase email/password/Google, profile setup, verification UI; custom verification identity binding is unsafe |
| Listing creation/editing/photos | Seller-reviewed AI draft, manual fallback, listing APIs; schemas/storage lifecycle/packaging need work |
| Internal and external discovery | Browse/search/filter, image query extraction, SerpAPI/Amazon links; retrieval is capped and web/mobile stacks differ |
| Saved items | Authenticated favorites APIs and client state exist |
| Chat | Participant APIs and realtime web services exist; web creation conflicts with private-user rules and client chat mutation is overbroad |
| Checkout | Hosted Stripe checkout and server price/rate recalculation exist; no reservation or complete checkout-attempt recovery |
| Paid order creation | Snapshot-based paid transaction writes order/inventory/cart; session uniqueness and post-commit resumption are incomplete |
| Seller transfers | Express Connect, 4.5% item commission, transfer keys/ledger, retry endpoint; bank payout visibility and correct recovery are missing |
| Shipping | Shippo rates, label lock/purchase, web label access; origin/package/tracking/ambiguous-purchase recovery are incomplete |
| Orders/sales | Realtime web buyer/seller pages and mobile buyer list; native seller operations and mobile shipment details are incomplete |
| Email/push | SendGrid templates, Expo sends, scheduled reminder/nudge functions; durable delivery and consent/device lifecycle need work |
| Support | Contact email links and internal-token payout retry; no end-to-end reconciliation/case workflow |

Do not write tickets that say payments, shipping, favorites or chat are entirely absent. The important work is making the existing paths secure, consistent and recoverable, then adding the missing lifecycle workflows.

## Critical source findings

### AV-F001 — API restrictions are bypassed by direct database permissions

`apps/web/firestore.rules` permits client order creation when buyerId matches the caller, and unrestricted participant updates. A direct SDK client can change financial/order fields without passing `/api/orders/{id}` validation. The nested shipping rule calls a function that reads the child document's `resource.data` rather than the parent order, so ordinary label reads can fail while forged child fields undermine the intended boundary. Fix rules and test client access alongside the API.

### AV-F002 — Public profile reads include private data

`GET /api/profile?userId=...` spreads the full profile and applies public caching. Firestore also allows public profile reads. Shipping addresses, phone/demographic data, Connect mapping and push tokens share that record. Separate public identity from private operational data and migrate all profile/shipping readers.

### AV-F003 — Sellers can edit trusted payment identity

`saveProfileAdmin` accepts `stripeConnectAccountId` and `stripeConnectOnboardingComplete` from the profile payload; direct SDK rules also allow owner writes. Account-link/status/transfer workflows trust those values. Server-owned Connect mapping and account-ownership verification are required. User role/deletion/eligibility fields also need explicit ownership rules.

### AV-F004 — Verification can mark a different UID as verified

The public verification-email endpoint accepts caller-specified email and userId; the consuming route marks that UID verified without matching its current Auth email. An attacker-controlled inbox can therefore receive a token for another UID. This demonstrates a verification-bypass design; it does not by itself demonstrate password access/account takeover. Bind issuance and consumption to verified identity and current email.

### AV-F005 — Deployed access policy cannot be reconstructed

`firebase.json` configures functions only. The Firestore rules/index files are not wired there and no Storage rules file is tracked. Production may differ, so separately verify deployed policy and establish reviewed, repeatable policy deployment. Do not assume a source rule edit protects the live app.

### AV-F006 — One Stripe Session can create more than one order

The processed-snapshot check is outside `createOrderFromSnapshotAdmin`'s transaction. The transaction reads listings/cart and creates a random order, but never reads/claims the snapshot. Two different event IDs can start from the same pending snapshot; if inventory still permits a sale, a transaction retry can commit another order. The event-ID lease does not establish session uniqueness.

### AV-F007 — Payment can succeed without a recoverable order

Inventory is checked after Stripe has already charged the buyer. Another purchase or seller deactivation/deletion can make the snapshot unavailable. The transaction aborts and the webhook returns 500 with no order/refund exception path. Stock does not go negative, but the paid buyer can remain unresolved. Define reservation/authorization behavior and durable compensation for paid-but-unfulfillable sessions.

### AV-F008 — Successful order creation suppresses unfinished settlement retries

The order transaction marks its snapshot processed before payment-record creation, transfers, notifications and labels. If any later step fails, the next delivery acknowledges the processed snapshot immediately. It cannot resume missing work. Persist and retry independent settlement steps; external-provider success followed by a lost database write must be reconciled too.

### AV-F047 — Passing checks do not cover commerce correctness

The only automated web suite has three AI model-selection tests. Mobile/shared test scripts are placeholders; there is no checked-in financial/rules/integration CI gate. A small emulator/provider-contract harness is foundational work, especially for concurrency, crash recovery and permission tests.

Full source links, affected symbols and acceptance criteria are in the corresponding backlog records. These findings were reasoned from source; no exploit or customer transaction was exercised against a live environment.

## Buyer payment to seller bank: missing links

1. **Seller eligibility and identity:** prove ownership of the Connect account and enforce the approved onboarding/capability policy before charging, or explicitly record held liabilities. Account changes must revoke stale eligibility (AV-F003/012).
2. **Charge-to-order integrity:** make checkout creation retry-safe, reserve/reconcile stock, guarantee one session outcome and resume post-commit work (AV-F006–009).
3. **Funding and transfers:** associate or schedule transfers against a supported funding model, reconcile ambiguous results, and keep untransferred lines pending. The current retry falsely reports complete if it skips all missing-Connect sellers (AV-F010–011).
4. **Bank payout visibility:** distinguish transfer-created from money reaching a bank. Show gross item price, commission, adjustments, pending amount, transfer and bank payout status. The sales UI currently combines buyer tax/processing fees into its seller total (AV-F013–014).
5. **Tax and fees:** replace universal 8% tax with an approved supported-market calculation/reporting workflow; version fee allocation and use cents (AV-F014–015/051). This audit does not determine legal tax obligations or approve a surcharge policy.
6. **Reverse paths:** implement cancellation after payment, full/partial refunds, transfer recovery, returns and disputes with auditable outcomes. A `refunded` enum is not an implementation (AV-F016–017/025).
7. **Operations:** expose unresolved money and provider/database differences to an authorized operator, with safe idempotent actions and restricted retained identity (AV-F034/048/050).

## Seller parcel to buyer receipt: missing links

- A real private ship-from/return address is required. Trusted quoting currently uses ZIP only and can invent 10001 (AV-F019).
- Actual package dimensions/weight and a bundle plan must replace first-item/default-package assumptions (AV-F020).
- Bind a quote to the cart/address/package/service and preserve charged versus actual shipping spend. Do not silently replace the selected service or rewrite financial history during a label requote (AV-F021).
- Label-created must not mean shipped. Current label paths immediately set shipped status and tell the buyer the item is on its way (AV-F022).
- Persist Shippo purchase identity before retrying ambiguous/time-out purchases; a five-minute lock does not prevent a second paid label after a crash (AV-F024).
- Consume tracking updates, handle delivery exceptions/return-to-sender and distinguish carrier delivery from buyer receipt confirmation (AV-F023/025).
- Add mobile seller onboarding/sales/labels and mobile buyer detail/tracking. These cannot be inferred from the existence of the web Sales page (AV-F038–040).

## Other baseline work

The backlog also covers cart lost updates and untrusted seller metadata; runtime listing schemas; sold-history attribution; hidden-listing leaks; server Storage authentication; username migration/uniqueness; password recovery; deletion with financial liabilities; chat permissions; notification recovery; report/block/moderation; complete-catalog search/paging; provider abuse limits; untrusted image URL fetching; reproducible environments and disaster recovery.

Offers and reviews are explicitly later scope. Mobile currently sends offers as chat text, with no accepted buyer-bound checkout price; web says offers are unavailable. Either label this as non-binding discussion or implement the actual contract. Reviews should remain absent until a verified-purchase/moderation design exists. Avoid displaying invented seller trust claims.

## Product decisions needed

| Decision | Recommended starting constraint, subject to owner approval | Affected work |
|---|---|---|
| Geographic/currency scope | US/USD until address, tax and provider support are implemented consistently | AV-F015/019/021/051 |
| Seller/order model | One seller per checkout session; explicit supported parcel plan | AV-F018/020 |
| Seller payout readiness | Gate payment or deliberately show held liabilities; document release timing | AV-F011–013 |
| Cancellation/returns/non-shipment | Define eligibility, deadlines, shipping cost allocation and support authority | AV-F016/023/048 |
| Tax/fee responsibility | Obtain business/tax owner decision and configure actual calculation/reporting | AV-F014–015 |
| Age/consent and listing policy | Resolve 13+ validation versus 18+ terms; enforce server eligibility and prohibited-category rules | AV-F033/042/051 |

These are implementation dependencies, not a request to stop the audit. AV-F051 records the decisions without silently inventing company policy.

## Definition of the functional baseline

The baseline is demonstrated only when the agreed launch scope passes these scenarios in isolated staging/test mode, with provider and database evidence:

1. A new seller signs in, completes approved eligibility/Connect/address/package setup, publishes a valid listing and sees accurate readiness.
2. A buyer finds an item beyond the first 200 records, messages the seller, adds it to a cart, receives a bound shipping/tax quote and pays one seller.
3. Duplicate requests, concurrent event IDs and process crashes still produce one paid order/outcome, one inventory decrement and correct remaining cart contents.
4. Two buyers racing for the last unit leave the losing payment with a visible fulfilled/refunded/support exception outcome, not an endless webhook error.
5. Unsettled funds, unavailable Connect, provider timeout and a lost transfer response remain pending/recoverable and cannot be falsely declared paid to bank.
6. A seller obtains one correct owned label. An ambiguous provider response is reconciled; the buyer sees awaiting handoff until actual shipment.
7. Tracking reaches delivery or an exception; seller and buyer see the same truthful order/shipment state on web/mobile.
8. Cancellation/refund/non-shipment and a test dispute produce an auditable financial/support outcome without duplicate stock restoration or transfers.
9. Direct API and SDK attempts cannot forge orders, alter financial identity, read private profiles or change chat participants; legitimate realtime reads still work.
10. An operator detects and recovers missing settlement/label/email steps; backup/restore and deployment procedures preserve provider identities and in-flight compatibility.

P0 issues must be resolved and the included P1 scope must be demonstrated. P2 items may be deferred with honest UI and explicit operational limits. Product policy may simplify supported commerce, but does not eliminate financial exception handling.

## Validation actually performed

| Check | Observed result | What it establishes |
|---|---|---|
| Repository inventory | 382 tracked files; 47 API route files; about 56,000 tracked TypeScript/JavaScript application/package/function lines | Source breadth and entry-point map, not line-by-line semantic verification of every UI/style block |
| `pnpm --filter @marketplace/web test` | Passed: 1 file, 3 tests | AI model resolution only; warning about root Expo base config and stale browser mapping |
| `pnpm --filter @marketplace/web type-check` | Passed | Current web types resolve with installed dependencies/generated artifacts |
| `pnpm --filter mobile exec tsc --noEmit` | Passed | Current mobile types resolve with installed dependencies |
| `pnpm --filter @marketplace/web lint` | Passed with 13 warnings | Existing image optimization/hook dependency warnings; no lint failure |
| `pnpm exec tsc --noEmit -p functions/tsconfig.json` | Failed: missing `firebase-functions/v2/scheduler`, `firebase-admin`; consequential implicit-any errors | Functions dependencies are absent in this local/root install; not proof functions source fails after proper installation |
| `pnpm exec turbo run build --filter=web --dry=json` | Passed after sandbox keychain restriction was bypassed with approved escalation | The filter selects `@marketplace/web` and its dependencies; no full production build/deploy was run |
| Backlog/reference validation | 52 unique issues, 7 epics, 147 checked source anchors, dependency graph without cycles | Artifacts reference real source locations and have valid internal dependencies |

No new application behavior was implemented by this audit. No live Stripe charge/refund/transfer, Shippo purchase, email/push send, Firebase data mutation or deployment was performed. Existing test outputs are baseline results and should not be presented as commerce tests. Jira issue creation is separately authorized by the user and recorded in the mapping.

## Coverage and limits

The review inventories the complete tracked repository and traces authentication/profile boundaries, catalog/media, cart, checkout, active and legacy webhooks, Connect transfer/retry, shipping labels, order readers/state changes, chat/notifications, search/AI and deployment/test configuration. Business-critical modules and relevant UI handlers were read in depth; layout/style/native generated files were not all semantically reviewed. This is not a browser visual/accessibility audit, dependency vulnerability scan, penetration test, legal/tax review or live infrastructure audit.

Documentation was cross-checked rather than trusted as proof of completion. `PAYMENTS_FLOW.md` and `SYSTEM_CONTRACT.md` describe the old pending-order-before-payment flow. Search/UX checklists contain historical or already-fixed findings; those were not automatically copied into the backlog. The Vercel short filter was specifically tested and is not reported as broken.

Current source and proposed architecture are separated in [PROJECT_GUIDE.md](../architecture/PROJECT_GUIDE.md). That guide includes the provider documentation consulted. Every backlog item includes source evidence, a requested change, acceptance criteria and dependencies; actual estimates/owners/sprint commitments remain for the development team.
