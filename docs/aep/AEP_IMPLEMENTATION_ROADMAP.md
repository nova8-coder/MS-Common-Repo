# AEP Implementation Roadmap

This roadmap is a proposal, not an implementation plan with committed dates. It prioritizes foundations that can serve several products, while preserving product-owned domain logic. Reorder it if investigation finds an existing central service that can be adopted instead of rebuilt.

## Phase 0 — Repository and platform discovery

- **User problem:** teams cannot make sound reuse choices without seeing all product apps and central services.
- **Required capabilities:** obtain TankIQ, CloudIQ and ReeferIQ source; inventory identity, device/data, notification, CI/CD, infrastructure and observability services; confirm ownership and existing standards.
- **Existing code to reuse:** this audit's LiftIQ/notification inventory and the notification prototype's proposed event seam as an investigation lead only.
- **New work:** cross-repository review, service-owner interviews, data-flow/security diagrams, initial domain glossary and ADRs.
- **Dependencies and risks:** access to repositories and architecture owners. Risk: rebuilding a service already maintained elsewhere or overgeneralizing from two prototypes.
- **Completion criterion:** each target product and relevant platform service has an evidence-backed inventory, owner, current contract, deployment flow, and explicit unknowns.

## Phase 1 — Common foundations and contracts

The detailed, review-only design baseline is in [AEP Phase 1 Design Proposal](AEP_PHASE1_DESIGN_PROPOSAL.md). It distinguishes inspected implementation from proposed package and contract decisions. Package creation and application migration remain gated on Phase 0 discovery and owner approval.

- **User problem:** products cannot safely compose shared UI/data services when identifiers, visual behavior and authorization assumptions differ.
- **Required capabilities:** design tokens and low-level component contracts; identity/tenant/asset authorization integration or explicit approved service boundary; canonical asset/event/metric/filter/audit contract decisions; compatibility and ownership policy.
- **Existing code to reuse:** compare LiftIQ `UI.tsx` with notification `ui.tsx`; use LiftIQ alarm mapper and notification adapter as examples to validate event semantics. Do not publish the prototype's synthetic tenant contract as production.
- **New work:** shared package skeleton only after governance; contract schemas; authorization model and integration; examples and conformance tests.
- **Dependencies and risks:** Phase 0 answers and identity/service owner participation. Risk: a UI package creates false confidence before backend authorization/data contracts exist.
- **Measurable completion criterion:** two independently built apps consume a documented, versioned set of neutral primitives and contract fixtures; tenant/access tests demonstrate that unauthorized data/actions are denied server-side.

## Phase 2 — Shared service boundaries

- **User problem:** event notifications, audit, search and exports are currently local simulations and cannot reliably work across products/users.
- **Required capabilities:** event ingestion/idempotency, notification thread and delivery separation, recipient resolution, policy/audit APIs, authorized search/history paging, export access checks, error/retry semantics.
- **Existing code to reuse:** notification page workflows, `NotificationThread` concepts, event ID deduplication, delivery/audit screen patterns, and LiftIQ mapper tests as domain examples.
- **New work:** adopt or build authenticated server APIs and persistence; delivery provider integration; service monitoring and retention controls.
- **Dependencies and risks:** identity/tenant contracts, canonical events, data ownership. Risk: treating client-filtered demo rows or simulated provider acceptance as delivery/security.
- **Measurable completion criterion:** an authorized event from two product adapters can be ingested once, correlated to a source record, routed to server-resolved recipients, audited, and searched without exposing another tenant's records.

## Phase 3 — Reusable widgets and configurable dashboards

- **User problem:** teams duplicate common visual patterns and cannot tailor dashboard layouts without code changes.
- **Required capabilities:** vetted chart/table/status/alarm widgets, schema-bound properties, standardized loading/empty/error states, accessibility behavior, stable component versions, a constrained dashboard configuration model.
- **Existing code to reuse:** LiftIQ telemetry chart/table, KPI patterns and station summaries; notification status/severity badges, empty state and drawer patterns, after decoupling from fixture imports.
- **New work:** data adapter props, widget manifests, schema validation, saved dashboard configuration and safe preview.
- **Dependencies and risks:** Phase 1 UI/data contracts and authorization; Phase 2 query APIs. Risk: standardizing product terms or metric formulas that are not semantically equivalent.
- **Measurable completion criterion:** a dashboard definition using supported widgets can render in at least two inspected products with the same component package while each product supplies its own authorized data adapter and keeps its domain rules.

## Phase 4 — Data mapping and application runtime

- **User problem:** each product encodes telemetry fields and pages directly, making device changes and new app creation developer-heavy.
- **Required capabilities:** protocol/device schema registry, metric normalization and quality/unit semantics, product adapters, declarative page/layout schema, permissions-aware runtime renderer, migration/version validation.
- **Existing code to reuse:** typed LiftIQ station/message fixtures and notification event adapter are examples of product adapters, not production schemas.
- **New work:** authoritative schemas, mapping administration, query binding, configuration runtime and safe version migration.
- **Dependencies and risks:** device protocol owners, storage/ingestion contracts, Phase 1 schemas, Phase 2 authorized data APIs and Phase 3 stable widgets. Risk: mapping raw values to a canonical metric without domain validation.
- **Measurable completion criterion:** a versioned station schema maps a supported device message into validated canonical fields and renders a configured page; invalid or unauthorized bindings fail visibly and safely.

## Phase 5 — Self-service builder, publication and controlled extensions

- **User problem:** product developers or admins need to compose approved applications without hand-authoring every supported screen.
- **Required capabilities:** visual editor, templates, validation, preview, draft/publish lifecycle, immutable versions, rollback, role-controlled changes, component registry, dependency/security review.
- **Existing code to reuse:** no builder/runtime was found. Existing form patterns may inform editing controls; they do not constitute a builder foundation.
- **New work:** builder UI, config APIs, version management, approval workflow, registry and isolation strategy.
- **Dependencies and risks:** stable schema/runtime, component contracts, identity, audit and deployment lifecycle. Risk: accepting untrusted code or publishing configs that bind unauthorized data.
- **Measurable completion criterion:** a tenant admin can produce a valid application from approved templates/widgets, preview it under their authorized scope, publish a version through approval, and roll back without changing product code.

## Phase 6 — Controlled deployment and infrastructure

- **User problem:** teams need repeatable releases and, where required, isolated customer environments with a safe rollback path.
- **Required capabilities:** CI/CD integration, artifact promotion, environment configuration, secrets, infrastructure provisioning through approved modules, health checks, monitoring, configuration/artifact rollback, and audit.
- **Existing code to reuse:** independent Vite build/preview scripts are local build inputs only. No control plane or Terraform configuration was found in this checkout.
- **New work:** first adopt the organization's current pipeline/cloud foundations; add app/config release metadata and per-environment policy only where missing.
- **Dependencies and risks:** Phase 0 discovery, identity/tenant boundaries, immutable app/config versions, central cloud architecture and operations. Risk: building a duplicate deployment platform or mistaking separate builds for tenant isolation.
- **Measurable completion criterion:** a versioned artifact/config is promoted through approved environments, health and access checks are recorded, and an operator can roll back with an auditable result.

## Phase 7 — AI-assisted extensions

- **User problem:** teams need capabilities beyond the approved component library without destabilizing published applications.
- **Required capabilities:** AI proposal flow, component/extension registry, isolated build and test, policy/security scanning, human review, signed artifacts, compatibility checks, permission limits, monitoring and rollback.
- **Existing code to reuse:** LiftIQ's AskLiftIQ is a keyword-based local helper, not AI generation. No component registry or isolated extension build was found.
- **New work:** choose declarative versus executable extension model; add generation/validation pipeline and approval lifecycle behind the registry and deployment controls.
- **Dependencies and risks:** stable component contract and registry, identity/governance, Phase 6 isolation/deployment, tests and monitoring. Highest risk: executing generated code with customer privileges.
- **Measurable completion criterion:** a generated proposal cannot enter a published registry/runtime until it passes isolated tests and policy checks, receives approval, carries version metadata, and can be disabled or rolled back with audit evidence.

## Priority recommendation

Start with **Phase 0**, then Phase 1. The audit only found two accessible frontends, and one is a notification prototype; the other three target products plus production identity/data/deployment services remain unknown. A narrow component extraction now would risk setting contracts around illustrative mocks. Phase 1 should include an identity/authorization decision alongside UI and event/data contracts because tenant-aware access is a prerequisite for customer configuration, shared search, notifications and deployment.

Do not begin AI-generated extensions until the registry, build isolation, tests, review, permissions, monitoring and rollback gates are real and verified. This places controlled deployment before AI extension work. Keep device command semantics and product safety rules owned by each product domain.
