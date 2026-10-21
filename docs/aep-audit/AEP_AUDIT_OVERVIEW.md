# AEP Audit Overview

**Audit date:** 2026-10-21  
**Scope:** Read-only inspection of the repositories available in this workspace, with emphasis on LiftIQ and the adjacent AssetIQ Notifications prototype. No application behavior or source was changed for this audit.

## Purpose

Establish an evidence-based baseline for a future Application Enablement Platform (AEP): current product features, repeated implementation patterns, reuse candidates, product boundaries, gaps, and decisions that need more evidence. This is a repository audit, not a claim that the workspace contains every service used by the company.

## Applications and repositories found

| Application / repository | Inspection result | Technology and evidence |
|---|---|---|
| **LiftIQ** — `LiftiQ/app` | **Verified:** inspected application source, data, integration adapter, tests, build configuration, and README. | React 19, TypeScript, Vite 8, Tailwind Vite plugin and application CSS. See [`package.json`](../../LiftiQ/app/package.json), [`vite.config.ts`](../../LiftiQ/app/vite.config.ts), [`App.tsx`](../../LiftiQ/app/src/App.tsx). The outer `LiftiQ` directory also contains standalone HTML/image prototypes. |
| **AssetIQ Notifications** — `AssetIQ-Notifications` | **Verified:** inspected as an adjacent platform prototype because it is present in the workspace and its integration with LiftIQ is explicit. It is not one of the four product applications named in the task. | React 19, TypeScript, Vite 8, React Router 7, Lucide icons, Tailwind Vite plugin and custom CSS. See [`package.json`](../../AssetIQ-Notifications/package.json), [`vite.config.ts`](../../AssetIQ-Notifications/vite.config.ts), [`App.tsx`](../../AssetIQ-Notifications/src/App.tsx). |
| **TankIQ** | **Unknown / not inspected:** no TankIQ application repository or source directory was found in this checkout. | `TankIQ` appears as a product label in the notification prototype's product union and mock records; this does not establish that its application implementation is available. |
| **CloudIQ** | **Unknown / not inspected:** no CloudIQ application repository or source directory was found in this checkout. | `CloudIQ` appears as a product label in the notification prototype's product union and mock records only. |
| **ReeferIQ** | **Unknown / not inspected:** no ReeferIQ application repository or source directory was found in this checkout. | `ReeferIQ` appears as a product label in the notification prototype's product union and mock records only. |

The workspace root has no package/workspace manifest that composes the two frontends into one build. The two application directories have independent `package.json` and lockfiles. No common source package or linked workspace dependency was found. The notification application is nested as a separate Git repository; its files were read but not modified.

## High-level architecture observed

### LiftIQ

- **Verified:** a single React app shell owns route selection, local domain state, simulated user selection, alarm mutations, and page composition in [`App.tsx`](../../LiftiQ/app/src/App.tsx). Routes are selected by application state rather than a router; a query-string deep link supports the sample station and tab.
- **Verified:** product pages cover Dashboard, Personalized Home, Lift Stations and station details, Watch Mode, Alarms, Notifications, and Events & History. Station details include Messages, Events, Trends, Totalizer, Commands, Maintenance, Pump Health, and configuration-oriented tabs.
- **Verified:** typed domain fixtures live in [`data/mockData.ts`](../../LiftiQ/app/src/data/mockData.ts) and [`data/model.ts`](../../LiftiQ/app/src/data/model.ts). Alarm lifecycle and personalization logic are local modules under `src/logic/`.
- **Verified:** integrations contain a frontend notification preview mapper and a typed proposed event contract under `src/integrations/notifications/`. No network client, server API, or device-ingestion service was found in the inspected app.
- **Verified:** personalization and Watch Mode use browser storage. Alarm, notification, command, and other interactions are local prototype state. The README explicitly identifies the app as a prototype with no backend or live device connection.

### AssetIQ Notifications

- **Verified:** a standalone React app uses React Router and a single large `src/App.tsx` for the shell, route declarations, page components, and many page-specific interactions.
- **Verified:** available routes are Inbox, Rules, Recipients & Groups, Preferences, Delivery History, Audit Log, and Administration. Its typed mock model covers normalized events, notification threads/timelines/deliveries, rules, recipients/groups, and audit entries.
- **Verified:** `services/mockService.ts` contains in-memory thread filtering and simulated acknowledge/snooze operations; `services/liftiqAdapter.ts` maps an explicit LiftIQ fixture contract into notification threads.
- **Verified:** the organization selector, role selector, filters, rules, recipients, delivery attempts, and audit entries operate on local data. The application footer and README say server authorization and live delivery are not connected.
- **Verified:** the app describes its LiftIQ event type as a proposed frontend contract rather than a LiftIQ API. The matching types are duplicated in both application repositories; the tenant on the fixture is synthetic.

## Shared packages and services

| Finding | Status | Evidence |
|---|---|---|
| Common UI package, design-system package, or workspace | **Not found in inspected code.** | Independent app directories and manifests; LiftIQ primitives in [`UI.tsx`](../../LiftiQ/app/src/components/UI.tsx) versus notification primitives in [`ui.tsx`](../../AssetIQ-Notifications/src/components/ui.tsx). |
| Common identity, asset, event, notification, search, or audit backend | **Not found in inspected code.** | Both READMEs describe local prototypes; targeted source inspection found no API calls or authentication provider. This does not rule out services in unprovided repositories. |
| Cross-app LiftIQ notification contract | **Partial:** a useful frontend integration proposal and deterministic mock fixture exist, but there is no shared package, transport, ingestion, or authenticated tenant resolution. | LiftIQ [`liftiqEvent.ts`](../../LiftiQ/app/src/integrations/notifications/liftiqEvent.ts); notification app [`contract.ts`](../../AssetIQ-Notifications/src/integrations/liftiq/contract.ts), [`mockEvents.ts`](../../AssetIQ-Notifications/src/integrations/liftiq/mockEvents.ts), and [`INTEGRATION.md`](../../AssetIQ-Notifications/INTEGRATION.md). |
| Common deployment or infrastructure service | **Not found in inspected code.** | No Terraform, Docker, CI workflow, cloud template, or deployment configuration was found in the inspected checkout. Both have Vite build/preview scripts. |

## Important architectural differences

- **Verified:** LiftIQ is a product operations experience with device/station mock data, alarm lifecycle logic, telemetry, operational workflows, and local personalization. AssetIQ Notifications is a cross-product notification administration/inbox prototype with an explicit notification-thread model.
- **Verified:** LiftIQ uses custom state-driven navigation; AssetIQ Notifications uses React Router. Both are React/TypeScript applications but their component APIs, CSS conventions, icons, and page composition differ.
- **Verified:** LiftIQ owns product-specific alarm semantics. AssetIQ Notifications owns notification-thread concepts and explicitly separates notification acknowledgement from source alarm/equipment state.
- **Inferred:** the notification event adapter is the strongest current integration seam for shared platform work, but its contract needs to be agreed and made service-backed before it is treated as a platform API.
- **Inferred:** a common library could standardize visual primitives and event/data contracts without forcing the product applications to share navigation or domain workflows.

## Audit coverage and limitations

- **Verified:** the only product application repositories found in the workspace were LiftIQ and the adjacent AssetIQ Notifications prototype. TankIQ, CloudIQ, and ReeferIQ application source could not be inspected.
- **Verified:** no backend, production API definitions, protocol documentation, event broker configuration, identity provider configuration, infrastructure-as-code, CI workflows, or environment deployment definitions were found in the inspected directories.
- **Partial:** existing checked-in `dist/` output shows that frontend bundles have been produced, but it does not identify a deployment target, release workflow, environment isolation, or rollback process.
- **Unknown:** whether separate repositories or organization services supply production authentication, device ingest, notification delivery, tenant management, audit storage, monitoring, or deployment automation.
- **Verified:** LiftIQ exposes two current test files for personalization and its LiftIQ event mapping. AssetIQ Notifications has no test script or test files in the inspected tree. Neither package defines a lint script.
- **Verified:** README material is useful evidence, but some LiftIQ README sections describe earlier UI organization. Where README and current source disagree, this audit treats current source as the implementation evidence and records README claims as documentation, not proof of runtime behavior.

## Detailed documents

- [Application comparison](APPLICATION_COMPARISON.md)
- [Common component inventory](COMMON_COMPONENT_INVENTORY.md)
- [AEP capability gap analysis](AEP_CAPABILITY_GAP_ANALYSIS.md)
- [Recommended AEP architecture](AEP_RECOMMENDED_ARCHITECTURE.md)
- [AEP implementation roadmap](AEP_IMPLEMENTATION_ROADMAP.md)
- [AEP Phase 1 design proposal](AEP_PHASE1_DESIGN_PROPOSAL.md) — proposed package boundaries, contracts, adoption, and acceptance criteria; for review, not implementation.

## Evidence labels

- **Verified:** directly supported by source, manifest, or repository documentation inspected here.
- **Partial:** some implementation evidence exists, but scope or complete behavior is unclear.
- **Unknown:** the relevant application/service/repository was unavailable or evidence was insufficient.
- **Inferred:** an architectural interpretation or recommendation, not confirmed current behavior.
