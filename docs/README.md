# AllVerse engineering handoff

Start with the [foundation audit](audits/2026-11-16-foundation-audit.md) for readiness and priorities, then use the [architecture guide](architecture/PROJECT_GUIDE.md) to understand implementation.

| File | Use |
|---|---|
| [AGENTS.md](../AGENTS.md) / [CODEX.md](../CODEX.md) | Persistent context and working instructions for future Codex sessions |
| [Architecture guide](architecture/PROJECT_GUIDE.md) | Stack, trust boundaries, data model, buyer/seller/payment/shipping flows and configuration |
| [API inventory](architecture/API_INVENTORY.md) | Every checked-in API route and authentication entry point |
| [Foundation audit](audits/2026-11-16-foundation-audit.md) | Critical findings, functional baseline and actual validation limits |
| [Backlog](backlog/FOUNDATION_BACKLOG.md) | 52 prioritized issues with evidence, acceptance criteria and dependencies |
| [Backlog JSON](backlog/foundation-backlog.json) | Structured source, including full Jira descriptions |
| [Backlog CSV](backlog/foundation-backlog.csv) | Portable import/export aid; hierarchy/dependencies require mapping |
| [Jira mapping](backlog/JIRA_MAPPING.md) | DEV epic/issue links and publication status |
| [Team assignments](backlog/ASSIGNMENTS.md) | Verified primary developer ownership |
| [Stripe sandbox](payments/STRIPE_SANDBOX.md) | Current payment repairs, local emulator setup, actual checks and remaining provider integration |

Reviewed source: `c15398da9d152040d68309786d828ad37ef57ed6` on 2026-11-16. These files document findings and proposed work; they do not indicate that the application defects are already fixed.
