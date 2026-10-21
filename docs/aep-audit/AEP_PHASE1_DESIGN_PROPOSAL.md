# AEP Phase 1 Design Proposal

**Status:** For review; no package or application changes are authorized by this proposal.  
**Evidence base:** the repository audit dated 2026-10-21, covering LiftIQ and the adjacent AssetIQ Notifications prototype available in this checkout.  
**Scope:** propose the smallest shared UI and contract foundation that can be adopted by independently built applications. This document does not claim that the inspected applications or services represent every production system.

## 1. Decision summary

Proceed to Phase 0 discovery and design approval before creating a package. If Phase 1 is approved, use two independently versioned deliverables:

1. `@assetiq/aep-ui` for neutral visual tokens and low-level React UI primitives.
2. `@assetiq/aep-contracts` for agreed, transport-neutral asset, event, metric, and query schemas, with generated TypeScript types where useful.

Do not put product workflows, alarm lifecycle rules, notification-thread behavior, API clients, tenant selection, or authorization decisions in either package. Each application keeps its own navigation and domain adapters. UI primitives receive already-authorized, already-prepared values; a server or approved data service remains responsible for authorization.

This boundary is a proposed design decision, not a description of existing code. The workspace currently has no shared package, package workspace, production schema, or verified central identity/data service.

## 2. Evidence and design boundaries

### Existing code (verified in the inspected checkout)

- LiftIQ's [`UI.tsx`](../../LiftiQ/app/src/components/UI.tsx) contains `PageTitle`, `Panel`, `Badge`, `Metric`, and `Empty`, alongside alarm-specific severity/status/source labels. It uses LiftIQ styling and has no package-level loading, error, or data-binding contract.
- AssetIQ Notifications' [`ui.tsx`](../../AssetIQ-Notifications/src/components/ui.tsx) contains `PageHeading`, `EmptyState`, `Modal`, `Drawer`, `Toast`, and `Toggle`, alongside notification-specific severity and status badges. These components use that application's styles and types.
- Both applications use React 19, TypeScript, and Vite, but have independent manifests and lockfiles. LiftIQ uses state-selected navigation; AssetIQ Notifications uses React Router. No shared package or workspace dependency was found.
- The inspected LiftIQ event mapper and the notification app's LiftIQ adapter/types are frontend examples, not an agreed production API. Their contract is duplicated and includes a synthetic tenant in notification fixtures.
- In the inspected app directories, data is mock/local and no authenticated backend or device-data provider was found. This is limited to the checkout: it does not establish that organization services or other repositories do not exist.

Evidence references: [`COMMON_COMPONENT_INVENTORY.md`](COMMON_COMPONENT_INVENTORY.md), [`APPLICATION_COMPARISON.md`](APPLICATION_COMPARISON.md), and [`AEP_AUDIT_OVERVIEW.md`](AEP_AUDIT_OVERVIEW.md).

### Proposed designs (not existing implementation)

- A small UI package, separate from domain and service code.
- Neutral, versioned data schemas approved by the relevant product and platform owners.
- Server-enforced tenant and asset access, with UI visibility treated only as presentation.
- An incremental adoption path that preserves each app's routing, behavior, and independently locked build.

Phase 0 should confirm owners, existing design tokens, package registry, production service contracts, target applications, and security requirements before these choices become implementation commitments.

## 3. Shared UI scope and proposed package structure

### First shared primitives

The first release should contain a small set with evidence of repeated or closely related patterns in both inspected apps:

| Proposed primitive | Existing evidence | First-release boundary |
|---|---|---|
| `PageHeading` | LiftIQ `PageTitle`; Notifications `PageHeading` | Title, optional description, optional actions/eyebrow. No route ownership or product-specific navigation. |
| `Panel` | LiftIQ `Panel`; both apps compose bordered content sections | Surface/container semantics and optional title slot. No assumptions about page layout or data loading. |
| `Badge` | LiftIQ `Badge`; both apps show compact status/severity labels | Neutral visual variants (`neutral`, `info`, `success`, `warning`, `danger`). Domain values map to variants in each product adapter; the shared package does not define alarm or notification states. |
| `EmptyState` | LiftIQ `Empty`; Notifications `EmptyState` | Accessible title, optional description and optional action. No product-specific calls or default business guidance. |
| `AsyncState` (new) | Existing prototypes have partial empty/missing states, but no consistent async contract | A small state renderer for loading, empty, error/retry, and partial/stale data. This is a proposed addition, not an existing component. |

Add a generic `Button`/`TextField` only if Phase 0 finds a design-system owner and can agree behavior, tokens, and app-specific form requirements. Native controls currently provide behavior in both apps; repeated use of HTML elements alone is not enough evidence for a shared abstraction. Defer Modal/Drawer to a later slice: the Notifications app has helpers, but equivalent cross-app focus/scroll contracts have not been verified. Keep `Metric`, `SeverityBadge`, `StatusBadge`, alarm lifecycle helpers, charts, tables, and product navigation out of the initial package.

### Proposed repository/package layout

The package may live in a platform-owned repository or approved monorepo after Phase 0 confirms the organization convention. Do not require the applications to become a single workspace.

```text
packages/                         # illustrative; final repository location TBD
  aep-ui/                         # @assetiq/aep-ui
    src/components/
    src/tokens/
    src/styles/
    stories/ or examples/
    tests/
    package.json
  aep-contracts/                  # @assetiq/aep-contracts
    schemas/                      # canonical machine-readable schemas
    src/                          # generated/public types and validators, if selected
    examples/
    tests/
    package.json
```

The names and paths are proposals, not present files. Keep contracts separately versioned from visual components so a data-schema change does not force a UI release and a visual change does not silently change data semantics. Do not put API clients, credentials, identity-provider SDKs, product adapters, or mock fixtures in these packages.

## 4. Proposed component, token, and behavior contracts

### Component API

- Components are controlled by explicit typed props and `children`; they do not import fixtures, read local storage, fetch data, infer a tenant, or navigate to app routes.
- Keep inputs product-neutral. A badge accepts a visual `tone` and text/children; it does not accept LiftIQ `Severity` or notification `ThreadStatus` types.
- Preserve native HTML semantics and allow relevant safe HTML attributes/ref forwarding where appropriate. Avoid broad `any`, hidden global state, and styling APIs that expose product-specific concepts.
- `AsyncState` receives an explicit discriminated state (`loading`, `empty`, `error`, `partial`, or `ready`) plus content/action slots. It must not infer empty from a missing response or failure from an empty array.
- Distinguish an unavailable/missing measurement from numeric zero. A stale or partial record must retain that quality information for the app to render; the shared component must not calculate domain quality.

### Design tokens and CSS boundary

Define CSS custom properties as the stable cross-app interface, with a documented mapping from each app's current styles. Initial token families: semantic color (surface, text, border, focus, and status tones), typography, spacing, radius, shadow, and layering. Names should be product-neutral (for example, `--aep-color-surface`, `--aep-color-text`, `--aep-space-3`).

Do not require Tailwind in either consumer and do not ship a reset that changes unrelated app styles. The UI package should expose an explicitly imported stylesheet/token entry point and document defaults/overrides. Product themes can map their existing values to the tokens. Both themes must be reviewed against contrast, focus, disabled, and state treatments before migration.

### Accessibility and state behavior

Make keyboard use and semantic HTML part of each component's API acceptance, not a later visual polish step. Required behaviors include visible focus, accessible names, labels and descriptions, no color-only status meaning, keyboard-operable actions, and appropriate live/status announcements for asynchronous changes. Reduced-motion preferences should be respected where animation exists. Dialog focus trapping/return and Escape behavior are required before any dialog component is shared.

Agree an organization accessibility target during Phase 0; assess each primitive with automated checks plus keyboard and screen-reader review. Automated checks do not replace manual review.

For loading/error/empty/partial states, provide consistent layout affordances while allowing the app to supply product-appropriate wording and recovery actions. A retry callback is displayed only when the caller supplies one. Do not show stale data as current or imply that retry, event acknowledgement, alarm clear, or maintenance completion has occurred.

## 5. Minimum data and security contracts before real-data use

The UI package must remain data-source agnostic. Before any shared list, table, or state component is bound to real service data, owners must approve schemas and service behavior for at least the following:

| Contract | Minimum fields/semantics to decide | Security/quality guardrail |
|---|---|---|
| Asset | Stable asset identifier; product/domain namespace; asset type; display label; parent/relationship references where needed; lifecycle/availability semantics. Define whether an equipment item is a separate asset or a component reference. | An identifier is not proof of access. Server-side services must scope reads/actions to the authenticated principal. |
| Event/message | Stable event ID; schema version; namespaced event/message type and subtype; source/product; source asset/equipment reference; occurrence time and ingest/receive time where available; source reference/payload policy; severity only where defined. Define event versus message versus notification and correlation/idempotency rules. | Preserve original source type/evidence. Do not infer alarm-clear, equipment recovery, or maintenance completion from unrelated measurements or messages. Restrict raw payload by permission and policy. |
| Metric/measurement | Canonical metric identifier and definition; value type; unit; observation timestamp; quality/missing/stale semantics; source reference; equipment/asset association; conversion/precision rules. | Zero, unavailable, invalid, stale, and not-reported are distinct. Only use a canonical name when protocol/domain owners validate the mapping. |
| Tenant and principal | Authenticated principal identity; server-resolved tenant/organization context; authorized asset/resource scope; role/capability model; session expiry and revocation behavior. | Client-supplied tenant IDs, roles, asset IDs, and hidden controls are untrusted inputs. Never use UI filtering as authorization. |
| Authorization and actions | Service-owned policy decision for each read/query/action; deny behavior; allowed action metadata if returned; audit requirements for sensitive actions. Define where policy is evaluated and how changes/revocation take effect. | Authorization must be checked on the server/API for every request and action. UI may hide/disable unavailable actions for usability, but cannot grant access. |
| Query/filter | Time range and timezone interpretation; asset scope; event/metric filters; stable sort; pagination/cursor behavior; maximum page size; partial/error behavior; query validation. | The service applies authorization before returning results and must not leak inaccessible counts or existence through filters/errors. |

These are proposed minimums, not claims that current LiftIQ fixtures or the duplicated event types satisfy them. The specific field names, vocabularies, retention, and raw-payload access must be settled with the relevant protocol, product, identity, security, and data-service owners. Phase 0 must inventory any existing authoritative schemas/services before proposing replacements.

## 6. Independent application adoption

The two apps can share a library without sharing a build, router, or release cadence:

1. After Phase 0 identifies the approved package registry and owners, publish immutable, semver-versioned artifacts there. If no suitable registry exists, make registry selection an explicit platform decision; do not infer one from this checkout.
2. Keep `@assetiq/aep-ui` compatible with the consumers' supported React versions through peer dependencies, and publish compiled ESM, declarations, and CSS exports. Do not bundle another React runtime or depend on either app's router, Tailwind setup, or CSS classes.
3. Each app pins a reviewed package version in its own manifest and lockfile. A package release does not deploy either app; each app builds and releases independently.
4. In each app, first add a small token bridge and compatibility wrappers that map the existing API/visuals to shared primitives. Migrate one primitive and one representative screen at a time. Keep product-specific severity/status mapping in the app.
5. Compare rendered states and user flows with the existing screen. Migrate additional screens only after the representative integration passes acceptance. Retain a straightforward wrapper/import rollback path for each app.
6. Do not make shared components call APIs. App-owned data adapters/services supply authorized records and callbacks. The server contract remains authoritative for access.

This path is compatible with independent lockfiles observed in the audit, while exact registry, release automation, supported browser matrix, and peer-version policy remain Phase 0 decisions.

## 7. Verification and compatibility plan

### Package-level checks (proposed)

- Type-check public exports and compile declarations; test the documented exports and CSS entry point from a clean consumer fixture.
- Unit-test props, semantic markup, controlled behavior, and every `AsyncState` branch. Add accessibility automation and manual keyboard/screen-reader checks for interactive components.
- Use visual examples/snapshots for light/dark or product themes only if those themes are confirmed in Phase 0; compare the package rendering in both actual apps before migration.
- Run contract schema validation and compatibility fixtures. For generated types, verify generated output matches schemas and that unsupported schema changes fail CI.
- Use consumer compatibility builds against each app's supported React/tooling versions. Verify no duplicate React runtime, undeclared CSS dependency, or router/product import enters the package.
- Keep tests for product adapters and current workflows in their owning apps; shared package tests must not encode LiftIQ alarm or notification thread policy.

No test runner or CI workflow should be assumed to exist based on this audit: the LiftIQ app has two current test files; no test script/files were found in the inspected Notifications tree, and no CI workflow was found in the inspected checkout. Phase 0 should discover any organization-level pipelines and decide how these checks integrate.

### Schema and package compatibility

- Use semantic versioning for public package APIs. Patch releases fix compatible defects; minor releases add backward-compatible optional APIs; breaking prop/token/schema semantics require a major release and migration guide.
- Version data schemas independently from the UI package. Define allowed additive changes, deprecation windows, and producer/consumer compatibility before any production event contract is published.
- Pin app dependencies via lockfiles and validate upgrades in each app before merge. Keep release notes, supported React/tool versions, deprecations, and rollback versions discoverable.
- Do not promise wire compatibility solely from TypeScript types; validate the agreed machine-readable schema at service boundaries.

## 8. Migration sequence and acceptance criteria

### Proposed sequence

**A. Discovery and decisions:** complete Phase 0 inventory; identify owners and any current design system, registry, identity, asset, event, metric, API, and CI services. Record decisions/unknowns in ADRs.  
**B. Contract design:** approve neutral asset/event/metric and authorization/query semantics with platform and domain owners. Keep security enforcement on the service side.  
**C. Package pilot:** after approval, implement and publish the four initial primitives (`PageHeading`, `Panel`, `Badge`, `EmptyState`) plus `AsyncState` and token exports; run consumer fixtures.  
**D. App pilots:** migrate a representative page in LiftIQ and AssetIQ Notifications behind app-local wrappers; verify behavior/visuals; then choose any further screens.  
**E. Real-data gate:** bind shared views to production data only after a service owner confirms the authorized endpoint, schema, pagination, error, and audit contracts and integration tests prove server-side authorization.

### Measurable Phase 1 acceptance

Phase 1 is ready for implementation review when:

- Owners approve the package boundary, package ownership, publishing location, support policy, and separate UI/schema versioning.
- The five initial components and token API have documented props, state semantics, accessibility behavior, styling/import contract, and examples.
- The asset, event, metric, tenant/principal, authorization, and query contracts have named owners, machine-readable schemas or equivalent authoritative definitions, and documented unknowns.
- There is an agreed threat/access test plan proving cross-tenant and unauthorized-asset requests are rejected by the server/API; frontend hiding alone does not pass.
- Each inspected app can independently consume the package in a clean build without sharing a router/workspace or acquiring an undeclared styling dependency.
- Both app pilots preserve the existing target workflow and pass agreed visual review; there are no product-domain imports in the shared UI package.
- Public exports, type declarations, CSS exports, supported React/tool versions, schema compatibility checks, package tests, and rollback steps are documented and exercised in CI or an approved equivalent.
- Accessibility review finds no critical keyboard, labeling, focus, or status-announcement defects for the initial components, against the organization target agreed in Phase 0.
- A migration note reports the number of migrated screens and unresolved issues. Phase 1 does not require migrating every page or connecting real production data.

These are proposed exit criteria. They do not authorize implementation or establish that a specific service is missing. Return this proposal for owner review and approval before package creation or application migration.
