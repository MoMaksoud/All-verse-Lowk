# Verified team assignments

Assigned in Jira per the user-provided roles; read back all 59 baseline work items and verified account IDs. Assignments establish primary ownership, not a sprint commitment.

| Developer | Foundation issues | Epics | Focus |
|---|---:|---:|---|
| Yengner Bermudez | 16 | 1 | Receiving payments, settlement, payment recovery and commerce checks |
| Daniel Misherky | 24 | 5 | Backend permissions, data, shipping, catalog and operations |
| Fahdah Alathel | 12 | 1 | UI/UX, mobile and related onboarding/fulfillment flows |

Fahdah owns the experience for cross-domain work such as earnings and addresses; Yengner/Daniel should support the trusted backend contracts. Policy decisions in DEV-54 require product/business input.

Yengner also owns [DEV-60](https://allversegpt.atlassian.net/browse/DEV-60), the additional Stripe implementation task. See [sandbox and validation notes](../payments/STRIPE_SANDBOX.md).

| Audit ID | Jira | Primary owner | Work |
|---|---|---|---|
| AV-F001 | [DEV-8](https://allversegpt.atlassian.net/browse/DEV-8) | Daniel Misherky | Deny client writes to financial orders and fulfillment records |
| AV-F002 | [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9) | Daniel Misherky | Separate public profiles from private addresses and contact data |
| AV-F003 | [DEV-10](https://allversegpt.atlassian.net/browse/DEV-10) | Yengner Bermudez | Protect Connect account ownership and server-controlled profile fields |
| AV-F004 | [DEV-11](https://allversegpt.atlassian.net/browse/DEV-11) | Daniel Misherky | Bind email verification to the authenticated account email |
| AV-F005 | [DEV-12](https://allversegpt.atlassian.net/browse/DEV-12) | Daniel Misherky | Version and deploy Firestore and Storage security policies |
| AV-F006 | [DEV-13](https://allversegpt.atlassian.net/browse/DEV-13) | Yengner Bermudez | Enforce one order per Checkout Session inside the transaction |
| AV-F007 | [DEV-14](https://allversegpt.atlassian.net/browse/DEV-14) | Yengner Bermudez | Recover paid sessions when stock becomes unavailable |
| AV-F008 | [DEV-15](https://allversegpt.atlassian.net/browse/DEV-15) | Yengner Bermudez | Resume settlement work after the order transaction commits |
| AV-F009 | [DEV-17](https://allversegpt.atlassian.net/browse/DEV-17) | Yengner Bermudez | Make checkout creation retry-safe and bound to one cart attempt |
| AV-F010 | [DEV-18](https://allversegpt.atlassian.net/browse/DEV-18) | Yengner Bermudez | Keep pending-Connect payout lines pending during retry |
| AV-F011 | [DEV-19](https://allversegpt.atlassian.net/browse/DEV-19) | Yengner Bermudez | Tie seller transfers to funding and reconcile ambiguous outcomes |
| AV-F012 | [DEV-20](https://allversegpt.atlassian.net/browse/DEV-20) | Yengner Bermudez | Manage seller onboarding and Connect capability changes |
| AV-F013 | [DEV-21](https://allversegpt.atlassian.net/browse/DEV-21) | Fahdah Alathel | Show real seller earnings and bank payout status |
| AV-F014 | [DEV-22](https://allversegpt.atlassian.net/browse/DEV-22) | Yengner Bermudez | Use integer minor units and versioned fee allocation |
| AV-F015 | [DEV-23](https://allversegpt.atlassian.net/browse/DEV-23) | Yengner Bermudez | Replace flat estimated tax with an approved tax workflow |
| AV-F016 | [DEV-24](https://allversegpt.atlassian.net/browse/DEV-24) | Yengner Bermudez | Implement paid-order cancellations, refunds and return resolution |
| AV-F017 | [DEV-25](https://allversegpt.atlassian.net/browse/DEV-25) | Yengner Bermudez | Handle payment disputes and chargebacks with an operator workflow |
| AV-F018 | [DEV-26](https://allversegpt.atlassian.net/browse/DEV-26) | Yengner Bermudez | Enforce the per-seller checkout contract on the server |
| AV-F019 | [DEV-27](https://allversegpt.atlassian.net/browse/DEV-27) | Fahdah Alathel | Require a valid private seller ship-from and return address |
| AV-F020 | [DEV-28](https://allversegpt.atlassian.net/browse/DEV-28) | Fahdah Alathel | Capture and quote the actual shipment package |
| AV-F021 | [DEV-29](https://allversegpt.atlassian.net/browse/DEV-29) | Daniel Misherky | Bind checkout to a server quote and confirm material changes |
| AV-F022 | [DEV-30](https://allversegpt.atlassian.net/browse/DEV-30) | Daniel Misherky | Keep label purchase separate from physical shipment |
| AV-F023 | [DEV-31](https://allversegpt.atlassian.net/browse/DEV-31) | Daniel Misherky | Ingest tracking events and expose delivery exceptions |
| AV-F024 | [DEV-32](https://allversegpt.atlassian.net/browse/DEV-32) | Daniel Misherky | Reconcile label purchase timeouts before buying another label |
| AV-F025 | [DEV-33](https://allversegpt.atlassian.net/browse/DEV-33) | Daniel Misherky | Use atomic audited order-state transitions |
| AV-F026 | [DEV-34](https://allversegpt.atlassian.net/browse/DEV-34) | Daniel Misherky | Validate cart ownership from listings and mutate carts atomically |
| AV-F027 | [DEV-35](https://allversegpt.atlassian.net/browse/DEV-35) | Daniel Misherky | Validate listing inputs and make ownership immutable |
| AV-F028 | [DEV-36](https://allversegpt.atlassian.net/browse/DEV-36) | Daniel Misherky | Unify sold flags, inventory and marketplace sale attribution |
| AV-F029 | [DEV-37](https://allversegpt.atlassian.net/browse/DEV-37) | Daniel Misherky | Enforce public listing visibility in Admin-backed read routes |
| AV-F030 | [DEV-38](https://allversegpt.atlassian.net/browse/DEV-38) | Daniel Misherky | Use authenticated server storage operations in upload and cleanup APIs |
| AV-F031 | [DEV-55](https://allversegpt.atlassian.net/browse/DEV-55) | Fahdah Alathel | Track media ownership and clean abandoned or replaced uploads |
| AV-F032 | [DEV-39](https://allversegpt.atlassian.net/browse/DEV-39) | Daniel Misherky | Make username claims authoritative across API and SDK writers |
| AV-F033 | [DEV-40](https://allversegpt.atlassian.net/browse/DEV-40) | Fahdah Alathel | Complete account recovery and enforce action eligibility on the server |
| AV-F034 | [DEV-41](https://allversegpt.atlassian.net/browse/DEV-41) | Daniel Misherky | Make account deletion safe for outstanding orders and funds |
| AV-F035 | [DEV-42](https://allversegpt.atlassian.net/browse/DEV-42) | Daniel Misherky | Repair web chat creation and lock chat participants |
| AV-F036 | [DEV-56](https://allversegpt.atlassian.net/browse/DEV-56) | Daniel Misherky | Make message sends atomic, retry-safe and paginated |
| AV-F037 | [DEV-43](https://allversegpt.atlassian.net/browse/DEV-43) | Daniel Misherky | Deliver transaction emails and push notifications from durable jobs |
| AV-F038 | [DEV-44](https://allversegpt.atlassian.net/browse/DEV-44) | Fahdah Alathel | Provide mobile sellers with onboarding, sales and label access |
| AV-F039 | [DEV-45](https://allversegpt.atlassian.net/browse/DEV-45) | Fahdah Alathel | Show verified payment confirmation and handle webhook delay |
| AV-F040 | [DEV-46](https://allversegpt.atlassian.net/browse/DEV-46) | Fahdah Alathel | Expose complete buyer order details and tracking on mobile |
| AV-F041 | [DEV-57](https://allversegpt.atlassian.net/browse/DEV-57) | Fahdah Alathel | Define offers and prevent chat negotiation from implying a payable offer |
| AV-F042 | [DEV-47](https://allversegpt.atlassian.net/browse/DEV-47) | Fahdah Alathel | Add report, block and minimum marketplace moderation |
| AV-F043 | [DEV-58](https://allversegpt.atlassian.net/browse/DEV-58) | Fahdah Alathel | Unify web and mobile search contracts and provider failures |
| AV-F044 | [DEV-48](https://allversegpt.atlassian.net/browse/DEV-48) | Daniel Misherky | Retrieve and paginate the full marketplace catalog |
| AV-F045 | [DEV-49](https://allversegpt.atlassian.net/browse/DEV-49) | Daniel Misherky | Bound public search and AI costs across server instances |
| AV-F046 | [DEV-50](https://allversegpt.atlassian.net/browse/DEV-50) | Daniel Misherky | Restrict server media fetching to approved owned assets |
| AV-F047 | [DEV-16](https://allversegpt.atlassian.net/browse/DEV-16) | Yengner Bermudez | Add automated commerce and permission release gates |
| AV-F048 | [DEV-51](https://allversegpt.atlassian.net/browse/DEV-51) | Yengner Bermudez | Build operator reconciliation and recovery queues |
| AV-F049 | [DEV-52](https://allversegpt.atlassian.net/browse/DEV-52) | Daniel Misherky | Make deployment and environment setup reproducible |
| AV-F050 | [DEV-53](https://allversegpt.atlassian.net/browse/DEV-53) | Daniel Misherky | Version migrations, retention and disaster recovery |
| AV-F051 | [DEV-54](https://allversegpt.atlassian.net/browse/DEV-54) | Yengner Bermudez | Approve the baseline commerce policy and supported launch scope |
| AV-F052 | [DEV-59](https://allversegpt.atlassian.net/browse/DEV-59) | Fahdah Alathel | Keep seller reputation honest until verified reviews exist |
| AV-E01 | [DEV-1](https://allversegpt.atlassian.net/browse/DEV-1) | Daniel Misherky | Secure identity and private marketplace data |
| AV-E02 | [DEV-2](https://allversegpt.atlassian.net/browse/DEV-2) | Yengner Bermudez | Make buyer payments and seller settlement recoverable |
| AV-E03 | [DEV-3](https://allversegpt.atlassian.net/browse/DEV-3) | Daniel Misherky | Complete shipping and order fulfillment |
| AV-E04 | [DEV-4](https://allversegpt.atlassian.net/browse/DEV-4) | Daniel Misherky | Make catalog, cart, and media consistent |
| AV-E05 | [DEV-5](https://allversegpt.atlassian.net/browse/DEV-5) | Fahdah Alathel | Complete web and mobile transaction experiences |
| AV-E06 | [DEV-6](https://allversegpt.atlassian.net/browse/DEV-6) | Daniel Misherky | Make discovery and AI reliable and bounded |
| AV-E07 | [DEV-7](https://allversegpt.atlassian.net/browse/DEV-7) | Daniel Misherky | Operate and verify a recoverable marketplace |
