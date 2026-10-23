# Changelog

## 2026-10-23

- Clarified LiftIQ station condition/pump summaries and source alarm state versus notification status in both apps; retained LiftIQ device observations in the proposed event contract and grouped duplicate envelopes/repeat observations into a local notification thread. Simplified the Notifications Inbox and Rules views, made rule defaults explicit, and labeled local mute/rule/delivery behavior as prototype-only. Added focused current-state and capability documentation plus adapter boundary tests.
- Organized the existing AEP audit documents under `docs/aep/` and moved the LiftIQ–Notifications integration notes to `docs/integration/`. Added `docs/README.md` as a documentation index and updated affected links. The standalone LiftIQ HTML UI prototypes remain in place as reference prototypes.
- Consolidated `AssetIQ-Notifications` under the parent `MS-Common-Repo` Git worktree. Its committed history is preserved in a local Git bundle; the application files remain in place and are available for review in the parent repository.
- Added scoped root ignore rules for AssetIQ Notifications dependencies and generated build artifacts.
