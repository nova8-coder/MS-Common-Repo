# Documentation Index

This index points to the current application entry points and groups the repository's supporting documentation by subject. Prototype behavior and proposals are labeled so they are not mistaken for production implementation.

## LiftIQ

LiftIQ product behavior and local prototype limits:

- [LiftIQ application README](../LiftiQ/README.md) — current product prototype entry point and behavior overview.
- [LiftIQ current state and UX notes](liftiq/CURRENT_STATE.md) — page scope, alarm lifecycle ownership, and UX clarifications.
- Standalone [LiftIQ UI prototypes](<../LiftiQ/HTML files for example/>) remain in their original folder. They are HTML UI prototypes, not authoritative current behavior documentation; their adoption status is unknown.

The `docs/liftiq/` folder is reserved for LiftIQ-specific documentation. No standalone document was moved there because the application README remains at its existing root and the other LiftIQ artifacts are prototypes.

## AssetIQ Notifications

Notifications application pages, local mock behavior, and prototype limits:

- [AssetIQ Notifications README](../AssetIQ-Notifications/README.md) — application entry point and prototype behavior overview.
- [Notifications current state and UX notes](notifications/CURRENT_STATE.md) — routes, rule semantics, alert-intelligence status, and prototype limits.
- [LiftIQ integration contract](integration/INTEGRATION.md) — proposed frontend contract and integration limits; not a production API.

The `docs/notifications/` folder is reserved for Notifications-specific documentation. The application README remains at its existing root; no separate Notifications design or processing specification was present in this checkout.

## AEP / shared platform

The audit documents below describe the inspected checkout and proposals for possible future platform work. They do not establish production services or approved requirements.

- [AEP Audit Overview](aep/AEP_AUDIT_OVERVIEW.md) — historical audit snapshot dated 2026-10-21 and index to its detailed reports.
- [Application Comparison](aep/APPLICATION_COMPARISON.md) — capability comparison; TankIQ, CloudIQ, and ReeferIQ source was unavailable to that audit.
- [Common Component Inventory](aep/COMMON_COMPONENT_INVENTORY.md) — observed components and reuse candidates.
- [AEP Capability Gap Analysis](aep/AEP_CAPABILITY_GAP_ANALYSIS.md) — checkout-scoped evidence gaps and questions to verify.
- [Recommended AEP Architecture](aep/AEP_RECOMMENDED_ARCHITECTURE.md) — conceptual proposal, not current architecture.
- [AEP Implementation Roadmap](aep/AEP_IMPLEMENTATION_ROADMAP.md) — proposed phases without committed dates.
- [AEP Phase 1 Design Proposal](aep/AEP_PHASE1_DESIGN_PROPOSAL.md) — explicitly for review; package boundaries and acceptance criteria are proposals.

## LiftIQ–Notifications integration

- [Integration contract and limits](integration/INTEGRATION.md) — proposed event contract, fixture handling, and assumptions. It does not describe a live API or transport.

## Other supporting documentation

- [Repository README](../README.md) — repository layout and application setup locations.
- [Changelog](CHANGELOG.md) — repository-level changes, including the documentation reorganization.

The `docs/other/` folder is reserved for supporting documents. No separate development or operations document needed moving there; the repository README and changelog remain at their established paths.
