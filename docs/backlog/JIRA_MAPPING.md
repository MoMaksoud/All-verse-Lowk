# Jira publication mapping

**Completed and verified 2026-11-17.** Created 7 epics and 52 child issues in AllVerseDev (DEV), with 115 native `blocks` relationships. Audit began 2026-11-16; that date is retained in audit labels and filenames.

[Open the foundation backlog in Jira](https://allversegpt.atlassian.net/issues/?jql=project%20%3D%20DEV%20AND%20labels%20%3D%20foundation-audit%20ORDER%20BY%20priority%20DESC%2C%20key%20ASC).

All 59 work items were read back. Child issue types, priorities and epic parents matched the structured backlog. All 115 dependency links were verified in their actual Jira direction. At initial publication the issues were To Do and unassigned. All 59 baseline work items are now assigned per the [verified team assignments](ASSIGNMENTS.md); no estimates or sprint commitments were set.

The CSV is an archive, not an instruction to import these issues again. Use the mapping/audit labels to avoid duplicate tickets. The baseline audit and initial sandbox implementation are recorded in repository commit `0d04f6e`; the follow-up handoff includes current assignments and the Stripe validation record. Jira evidence links retain the original reviewed source commit.

## Epics

| Audit ID | Jira epic | Scope |
|---|---|---|
| AV-E01 | [DEV-1](https://allversegpt.atlassian.net/browse/DEV-1) | Secure identity and private marketplace data |
| AV-E02 | [DEV-2](https://allversegpt.atlassian.net/browse/DEV-2) | Make buyer payments and seller settlement recoverable |
| AV-E03 | [DEV-3](https://allversegpt.atlassian.net/browse/DEV-3) | Complete shipping and order fulfillment |
| AV-E04 | [DEV-4](https://allversegpt.atlassian.net/browse/DEV-4) | Make catalog, cart, and media consistent |
| AV-E05 | [DEV-5](https://allversegpt.atlassian.net/browse/DEV-5) | Complete web and mobile transaction experiences |
| AV-E06 | [DEV-6](https://allversegpt.atlassian.net/browse/DEV-6) | Make discovery and AI reliable and bounded |
| AV-E07 | [DEV-7](https://allversegpt.atlassian.net/browse/DEV-7) | Operate and verify a recoverable marketplace |

## Issues

| Audit ID | Jira | Severity | Type | Summary | Blocked by |
|---|---|---|---|---|---|
| AV-F001 | [DEV-8](https://allversegpt.atlassian.net/browse/DEV-8) | P0 | Bug | Deny client writes to financial orders and fulfillment records | — |
| AV-F002 | [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9) | P0 | Bug | Separate public profiles from private addresses and contact data | — |
| AV-F003 | [DEV-10](https://allversegpt.atlassian.net/browse/DEV-10) | P0 | Bug | Protect Connect account ownership and server-controlled profile fields | [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9) |
| AV-F004 | [DEV-11](https://allversegpt.atlassian.net/browse/DEV-11) | P0 | Bug | Bind email verification to the authenticated account email | — |
| AV-F005 | [DEV-12](https://allversegpt.atlassian.net/browse/DEV-12) | P0 | Task | Version and deploy Firestore and Storage security policies | [DEV-8](https://allversegpt.atlassian.net/browse/DEV-8), [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9), [DEV-10](https://allversegpt.atlassian.net/browse/DEV-10) |
| AV-F006 | [DEV-13](https://allversegpt.atlassian.net/browse/DEV-13) | P0 | Bug | Enforce one order per Checkout Session inside the transaction | — |
| AV-F007 | [DEV-14](https://allversegpt.atlassian.net/browse/DEV-14) | P0 | Bug | Recover paid sessions when stock becomes unavailable | [DEV-13](https://allversegpt.atlassian.net/browse/DEV-13) |
| AV-F008 | [DEV-15](https://allversegpt.atlassian.net/browse/DEV-15) | P0 | Bug | Resume settlement work after the order transaction commits | [DEV-13](https://allversegpt.atlassian.net/browse/DEV-13) |
| AV-F009 | [DEV-17](https://allversegpt.atlassian.net/browse/DEV-17) | P1 | Bug | Make checkout creation retry-safe and bound to one cart attempt | [DEV-13](https://allversegpt.atlassian.net/browse/DEV-13), [DEV-14](https://allversegpt.atlassian.net/browse/DEV-14) |
| AV-F010 | [DEV-18](https://allversegpt.atlassian.net/browse/DEV-18) | P1 | Bug | Keep pending-Connect payout lines pending during retry | [DEV-10](https://allversegpt.atlassian.net/browse/DEV-10), [DEV-15](https://allversegpt.atlassian.net/browse/DEV-15) |
| AV-F011 | [DEV-19](https://allversegpt.atlassian.net/browse/DEV-19) | P1 | Story | Tie seller transfers to funding and reconcile ambiguous outcomes | [DEV-10](https://allversegpt.atlassian.net/browse/DEV-10), [DEV-15](https://allversegpt.atlassian.net/browse/DEV-15), [DEV-18](https://allversegpt.atlassian.net/browse/DEV-18) |
| AV-F012 | [DEV-20](https://allversegpt.atlassian.net/browse/DEV-20) | P1 | Story | Manage seller onboarding and Connect capability changes | [DEV-10](https://allversegpt.atlassian.net/browse/DEV-10), [DEV-18](https://allversegpt.atlassian.net/browse/DEV-18), [DEV-19](https://allversegpt.atlassian.net/browse/DEV-19) |
| AV-F013 | [DEV-21](https://allversegpt.atlassian.net/browse/DEV-21) | P1 | Story | Show real seller earnings and bank payout status | [DEV-19](https://allversegpt.atlassian.net/browse/DEV-19), [DEV-20](https://allversegpt.atlassian.net/browse/DEV-20), [DEV-22](https://allversegpt.atlassian.net/browse/DEV-22) |
| AV-F014 | [DEV-22](https://allversegpt.atlassian.net/browse/DEV-22) | P1 | Story | Use integer minor units and versioned fee allocation | — |
| AV-F015 | [DEV-23](https://allversegpt.atlassian.net/browse/DEV-23) | P1 | Story | Replace flat estimated tax with an approved tax workflow | [DEV-22](https://allversegpt.atlassian.net/browse/DEV-22), [DEV-54](https://allversegpt.atlassian.net/browse/DEV-54) |
| AV-F016 | [DEV-24](https://allversegpt.atlassian.net/browse/DEV-24) | P1 | Story | Implement paid-order cancellations, refunds and return resolution | [DEV-14](https://allversegpt.atlassian.net/browse/DEV-14), [DEV-15](https://allversegpt.atlassian.net/browse/DEV-15), [DEV-19](https://allversegpt.atlassian.net/browse/DEV-19), [DEV-22](https://allversegpt.atlassian.net/browse/DEV-22), [DEV-33](https://allversegpt.atlassian.net/browse/DEV-33), [DEV-54](https://allversegpt.atlassian.net/browse/DEV-54) |
| AV-F017 | [DEV-25](https://allversegpt.atlassian.net/browse/DEV-25) | P1 | Story | Handle payment disputes and chargebacks with an operator workflow | [DEV-19](https://allversegpt.atlassian.net/browse/DEV-19), [DEV-21](https://allversegpt.atlassian.net/browse/DEV-21), [DEV-24](https://allversegpt.atlassian.net/browse/DEV-24), [DEV-51](https://allversegpt.atlassian.net/browse/DEV-51) |
| AV-F018 | [DEV-26](https://allversegpt.atlassian.net/browse/DEV-26) | P1 | Bug | Enforce the per-seller checkout contract on the server | [DEV-13](https://allversegpt.atlassian.net/browse/DEV-13), [DEV-34](https://allversegpt.atlassian.net/browse/DEV-34) |
| AV-F019 | [DEV-27](https://allversegpt.atlassian.net/browse/DEV-27) | P1 | Bug | Require a valid private seller ship-from and return address | [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9), [DEV-20](https://allversegpt.atlassian.net/browse/DEV-20) |
| AV-F020 | [DEV-28](https://allversegpt.atlassian.net/browse/DEV-28) | P1 | Bug | Capture and quote the actual shipment package | [DEV-27](https://allversegpt.atlassian.net/browse/DEV-27), [DEV-35](https://allversegpt.atlassian.net/browse/DEV-35) |
| AV-F021 | [DEV-29](https://allversegpt.atlassian.net/browse/DEV-29) | P1 | Bug | Bind checkout to a server quote and confirm material changes | [DEV-22](https://allversegpt.atlassian.net/browse/DEV-22), [DEV-26](https://allversegpt.atlassian.net/browse/DEV-26), [DEV-27](https://allversegpt.atlassian.net/browse/DEV-27), [DEV-28](https://allversegpt.atlassian.net/browse/DEV-28) |
| AV-F022 | [DEV-30](https://allversegpt.atlassian.net/browse/DEV-30) | P1 | Bug | Keep label purchase separate from physical shipment | [DEV-33](https://allversegpt.atlassian.net/browse/DEV-33) |
| AV-F023 | [DEV-31](https://allversegpt.atlassian.net/browse/DEV-31) | P1 | Story | Ingest tracking events and expose delivery exceptions | [DEV-30](https://allversegpt.atlassian.net/browse/DEV-30), [DEV-32](https://allversegpt.atlassian.net/browse/DEV-32), [DEV-33](https://allversegpt.atlassian.net/browse/DEV-33) |
| AV-F024 | [DEV-32](https://allversegpt.atlassian.net/browse/DEV-32) | P1 | Bug | Reconcile label purchase timeouts before buying another label | [DEV-15](https://allversegpt.atlassian.net/browse/DEV-15), [DEV-29](https://allversegpt.atlassian.net/browse/DEV-29) |
| AV-F025 | [DEV-33](https://allversegpt.atlassian.net/browse/DEV-33) | P1 | Story | Use atomic audited order-state transitions | [DEV-8](https://allversegpt.atlassian.net/browse/DEV-8), [DEV-13](https://allversegpt.atlassian.net/browse/DEV-13) |
| AV-F026 | [DEV-34](https://allversegpt.atlassian.net/browse/DEV-34) | P1 | Bug | Validate cart ownership from listings and mutate carts atomically | [DEV-8](https://allversegpt.atlassian.net/browse/DEV-8), [DEV-35](https://allversegpt.atlassian.net/browse/DEV-35) |
| AV-F027 | [DEV-35](https://allversegpt.atlassian.net/browse/DEV-35) | P1 | Bug | Validate listing inputs and make ownership immutable | [DEV-8](https://allversegpt.atlassian.net/browse/DEV-8) |
| AV-F028 | [DEV-36](https://allversegpt.atlassian.net/browse/DEV-36) | P1 | Bug | Unify sold flags, inventory and marketplace sale attribution | [DEV-13](https://allversegpt.atlassian.net/browse/DEV-13), [DEV-35](https://allversegpt.atlassian.net/browse/DEV-35) |
| AV-F029 | [DEV-37](https://allversegpt.atlassian.net/browse/DEV-37) | P1 | Bug | Enforce public listing visibility in Admin-backed read routes | [DEV-35](https://allversegpt.atlassian.net/browse/DEV-35), [DEV-36](https://allversegpt.atlassian.net/browse/DEV-36) |
| AV-F030 | [DEV-38](https://allversegpt.atlassian.net/browse/DEV-38) | P1 | Bug | Use authenticated server storage operations in upload and cleanup APIs | [DEV-12](https://allversegpt.atlassian.net/browse/DEV-12), [DEV-35](https://allversegpt.atlassian.net/browse/DEV-35) |
| AV-F031 | [DEV-55](https://allversegpt.atlassian.net/browse/DEV-55) | P2 | Story | Track media ownership and clean abandoned or replaced uploads | [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9), [DEV-38](https://allversegpt.atlassian.net/browse/DEV-38) |
| AV-F032 | [DEV-39](https://allversegpt.atlassian.net/browse/DEV-39) | P1 | Bug | Make username claims authoritative across API and SDK writers | [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9), [DEV-10](https://allversegpt.atlassian.net/browse/DEV-10) |
| AV-F033 | [DEV-40](https://allversegpt.atlassian.net/browse/DEV-40) | P1 | Story | Complete account recovery and enforce action eligibility on the server | [DEV-11](https://allversegpt.atlassian.net/browse/DEV-11), [DEV-54](https://allversegpt.atlassian.net/browse/DEV-54) |
| AV-F034 | [DEV-41](https://allversegpt.atlassian.net/browse/DEV-41) | P1 | Bug | Make account deletion safe for outstanding orders and funds | [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9), [DEV-10](https://allversegpt.atlassian.net/browse/DEV-10), [DEV-24](https://allversegpt.atlassian.net/browse/DEV-24), [DEV-39](https://allversegpt.atlassian.net/browse/DEV-39), [DEV-54](https://allversegpt.atlassian.net/browse/DEV-54) |
| AV-F035 | [DEV-42](https://allversegpt.atlassian.net/browse/DEV-42) | P1 | Bug | Repair web chat creation and lock chat participants | [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9), [DEV-12](https://allversegpt.atlassian.net/browse/DEV-12), [DEV-40](https://allversegpt.atlassian.net/browse/DEV-40) |
| AV-F036 | [DEV-56](https://allversegpt.atlassian.net/browse/DEV-56) | P2 | Story | Make message sends atomic, retry-safe and paginated | [DEV-42](https://allversegpt.atlassian.net/browse/DEV-42), [DEV-43](https://allversegpt.atlassian.net/browse/DEV-43) |
| AV-F037 | [DEV-43](https://allversegpt.atlassian.net/browse/DEV-43) | P1 | Story | Deliver transaction emails and push notifications from durable jobs | [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9), [DEV-15](https://allversegpt.atlassian.net/browse/DEV-15) |
| AV-F038 | [DEV-44](https://allversegpt.atlassian.net/browse/DEV-44) | P1 | Story | Provide mobile sellers with onboarding, sales and label access | [DEV-20](https://allversegpt.atlassian.net/browse/DEV-20), [DEV-21](https://allversegpt.atlassian.net/browse/DEV-21), [DEV-27](https://allversegpt.atlassian.net/browse/DEV-27), [DEV-32](https://allversegpt.atlassian.net/browse/DEV-32) |
| AV-F039 | [DEV-45](https://allversegpt.atlassian.net/browse/DEV-45) | P1 | Bug | Show verified payment confirmation and handle webhook delay | [DEV-13](https://allversegpt.atlassian.net/browse/DEV-13), [DEV-14](https://allversegpt.atlassian.net/browse/DEV-14), [DEV-17](https://allversegpt.atlassian.net/browse/DEV-17), [DEV-26](https://allversegpt.atlassian.net/browse/DEV-26) |
| AV-F040 | [DEV-46](https://allversegpt.atlassian.net/browse/DEV-46) | P1 | Bug | Expose complete buyer order details and tracking on mobile | [DEV-31](https://allversegpt.atlassian.net/browse/DEV-31), [DEV-33](https://allversegpt.atlassian.net/browse/DEV-33), [DEV-45](https://allversegpt.atlassian.net/browse/DEV-45) |
| AV-F041 | [DEV-57](https://allversegpt.atlassian.net/browse/DEV-57) | P2 | Story | Define offers and prevent chat negotiation from implying a payable offer | [DEV-14](https://allversegpt.atlassian.net/browse/DEV-14), [DEV-17](https://allversegpt.atlassian.net/browse/DEV-17), [DEV-35](https://allversegpt.atlassian.net/browse/DEV-35), [DEV-54](https://allversegpt.atlassian.net/browse/DEV-54) |
| AV-F042 | [DEV-47](https://allversegpt.atlassian.net/browse/DEV-47) | P1 | Story | Add report, block and minimum marketplace moderation | [DEV-37](https://allversegpt.atlassian.net/browse/DEV-37), [DEV-40](https://allversegpt.atlassian.net/browse/DEV-40), [DEV-42](https://allversegpt.atlassian.net/browse/DEV-42), [DEV-51](https://allversegpt.atlassian.net/browse/DEV-51), [DEV-54](https://allversegpt.atlassian.net/browse/DEV-54) |
| AV-F043 | [DEV-58](https://allversegpt.atlassian.net/browse/DEV-58) | P2 | Story | Unify web and mobile search contracts and provider failures | [DEV-48](https://allversegpt.atlassian.net/browse/DEV-48), [DEV-49](https://allversegpt.atlassian.net/browse/DEV-49) |
| AV-F044 | [DEV-48](https://allversegpt.atlassian.net/browse/DEV-48) | P1 | Bug | Retrieve and paginate the full marketplace catalog | [DEV-36](https://allversegpt.atlassian.net/browse/DEV-36), [DEV-37](https://allversegpt.atlassian.net/browse/DEV-37) |
| AV-F045 | [DEV-49](https://allversegpt.atlassian.net/browse/DEV-49) | P1 | Bug | Bound public search and AI costs across server instances | — |
| AV-F046 | [DEV-50](https://allversegpt.atlassian.net/browse/DEV-50) | P1 | Bug | Restrict server media fetching to approved owned assets | [DEV-9](https://allversegpt.atlassian.net/browse/DEV-9), [DEV-38](https://allversegpt.atlassian.net/browse/DEV-38) |
| AV-F047 | [DEV-16](https://allversegpt.atlassian.net/browse/DEV-16) | P0 | Task | Add automated commerce and permission release gates | — |
| AV-F048 | [DEV-51](https://allversegpt.atlassian.net/browse/DEV-51) | P1 | Story | Build operator reconciliation and recovery queues | [DEV-15](https://allversegpt.atlassian.net/browse/DEV-15), [DEV-19](https://allversegpt.atlassian.net/browse/DEV-19), [DEV-32](https://allversegpt.atlassian.net/browse/DEV-32), [DEV-33](https://allversegpt.atlassian.net/browse/DEV-33) |
| AV-F049 | [DEV-52](https://allversegpt.atlassian.net/browse/DEV-52) | P1 | Task | Make deployment and environment setup reproducible | [DEV-12](https://allversegpt.atlassian.net/browse/DEV-12), [DEV-16](https://allversegpt.atlassian.net/browse/DEV-16) |
| AV-F050 | [DEV-53](https://allversegpt.atlassian.net/browse/DEV-53) | P1 | Task | Version migrations, retention and disaster recovery | [DEV-12](https://allversegpt.atlassian.net/browse/DEV-12), [DEV-13](https://allversegpt.atlassian.net/browse/DEV-13), [DEV-39](https://allversegpt.atlassian.net/browse/DEV-39), [DEV-52](https://allversegpt.atlassian.net/browse/DEV-52) |
| AV-F051 | [DEV-54](https://allversegpt.atlassian.net/browse/DEV-54) | P1 | Task | Approve the baseline commerce policy and supported launch scope | — |
| AV-F052 | [DEV-59](https://allversegpt.atlassian.net/browse/DEV-59) | P2 | Story | Keep seller reputation honest until verified reviews exist | [DEV-33](https://allversegpt.atlassian.net/browse/DEV-33), [DEV-36](https://allversegpt.atlassian.net/browse/DEV-36), [DEV-47](https://allversegpt.atlassian.net/browse/DEV-47) |

## Start here

- Close the identity and permission blockers: DEV-8 through DEV-12.
- Repair session uniqueness, paid-stock exceptions and settlement resumption: DEV-13 through DEV-15.
- Establish commerce/rules tests: DEV-16.
- Confirm the launch policy and supported scope: DEV-54.

These groups can be planned together; native dependencies express specific prerequisites. Priority indicates proposed severity, not an automatic assignment or delivery promise.

Machine-readable publication receipt: [jira-publication.json](jira-publication.json). Complete requirements and immutable source evidence: [foundation-backlog.json](foundation-backlog.json).

## Implementation follow-up

[DEV-60](https://allversegpt.atlassian.net/browse/DEV-60), assigned to Yengner, tracks the first Stripe sandbox and seller-transfer repair. It is additional to the 52 baseline findings. See [the implementation and validation record](../payments/STRIPE_SANDBOX.md). No foundation issue is marked complete by this local implementation.
