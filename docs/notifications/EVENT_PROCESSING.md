# Notification event processing and UX decisions

This document describes the first deterministic, frontend-only LiftIQ intake increment in AssetIQ Notifications. It is a prototype behavior contract, not a production event service or a commitment that other AEP applications already publish events.

## Responsibilities and flow

LiftIQ interprets device messages, defines equipment-specific alarm semantics, and owns the source alarm lifecycle. It exports only a proposed normalized event envelope for supported active or acknowledged lifecycles. Source state and notification workflow state remain independent.

AssetIQ Notifications validates the envelope, retains source observations, identifies repeated stable observation IDs, groups observations by tenant and source lifecycle, evaluates generic patterns, and presents processing evidence beside the corresponding inbox thread. Rules remain user-configurable routing intent; they are not evaluated by this prototype. Delivery history remains a record of simulated attempts and does not imply receipt.

```text
LiftIQ lifecycle fixture
  -> frontend intake validation
  -> stable-ID duplicate classification
  -> tenant + lifecycle repeat grouping (individual rows retained)
  -> generic persistence / flapping assessment
  -> Incoming Events and linked Inbox detail
```

The reusable logic is in `AssetIQ-Notifications/src/services/eventIntelligence.ts`, separate from React components. The source adapter remains in `src/services/liftiqAdapter.ts`.

## Functional and UX decisions

- **Incoming Events** is a separate workspace page because individual source observations and notification threads answer different questions. The page supports search and filters for event type, processing status, and source time, and shows source application, station, lifecycle, event type, timestamp, current source state, processing reason, intelligence finding, and a related Inbox link when available.
- Each source observation remains visible. Stable duplicate IDs are labeled `Duplicate`; later unique observations in a known lifecycle are labeled `Grouped`; the first is `Accepted`. Invalid envelopes/observations are represented as `Rejected` by the processing function, but no invalid input is included in the current demo fixture.
- The Inbox detail keeps the source lifecycle separate from notification acknowledgement and adds an Alert intelligence section with the assessment and its evidence. Event Activity links to the matching inbox thread by tenant and lifecycle ID.
- LiftIQ's existing notification bell now carries tenant and lifecycle context into the Notifications inbox. It remains a cross-app URL link, not shared navigation state or SSO.
- Rules, recipients, preferences, delivery history, audit, and administration remain distinct pages. Their controls and records are still local prototype state; rule matching, channel routing, quiet hours, retries, and durable audit are not executed.

## Implemented intelligence behavior

| Behavior | Prototype rule | Evidence shown / limit |
|---|---|---|
| Envelope validation | Requires stable event/lifecycle/tenant/station identity, event type, summary, supported severity/source state, and parseable source time. | Invalid records are `Rejected`; this is client-side validation, not a server schema or security boundary. |
| Duplicate detection | Exact stable observation ID within a tenant. No text-only or name-only matching. | Duplicate row remains in activity history and increments the lifecycle duplicate count. This is in-memory per evaluation, not durable idempotency. |
| Repeat grouping | Same tenant and source lifecycle. | Unique observations remain separate rows and are linked to one lifecycle thread. This groups display/history; it does not suppress a source event or send/delay a notification. |
| Persistence | Latest source state is active or acknowledged and the earliest reliable source timestamp is at least 30 minutes old. | Shows current source state and elapsed time. Acknowledged still means the source alarm is unresolved. The threshold is a prototype default and uses the fixture clock/source timestamp. |
| Potential flapping | At least four alternating explicit `active`/`recovered` state transitions inside a 15-minute window; acknowledgment is not treated as a recovery transition. | Shows transition count/window and labels the result a pattern, not an equipment diagnosis. The current LiftIQ fixture has no recovered transitions, so it does not produce a flapping finding. |
| Storm protection / correlation | Not implemented. | No shared rate limiter or reliable cross-event relationship is present. |

The LiftIQ source fixture contains one active `LC-1042` lifecycle, three stable device observations, and a duplicate envelope replaying the final observation ID. Its dates are old relative to current time, so the deterministic prototype will report persistence while the fixture says the lifecycle is still active. These are seeded examples, not a live stream or alarm-duration measurement.

## Integration, identity, and enforcement

The contract is duplicated as TypeScript in each independent Vite app; no shared runtime package exists. The event fixture supplies `org-city-water` as a synthetic tenant because LiftIQ has no authoritative tenant field. URLs and tenant/lifecycle query parameters are context only. They do not establish authentication, membership, or authorization.

The repository has no shared SSO/session flow, backend API, broker, durable database, authenticated member/site/asset scope, or delivery provider. The Notifications organization and role controls are demo selectors; all filtering is client-side. Do not rely on them for tenant isolation or recipient eligibility.

## Status and validation

- **Implemented:** deterministic fixture intake, basic validation, stable-ID duplicate classification, lifecycle grouping with source rows retained, evidence-based persistence/flapping evaluation, Incoming Events filters, Inbox intelligence detail, contextual cross-app/deep links, unit tests for supported logic.
- **Prototype/simulated:** fixture intake only, local inbox/rule/preference/audit state, organization and role selection, notification actions, and delivery outcomes.
- **Proposed:** production event API/schema ownership and versioning, shared event intake, durable idempotency/history, backend policy evaluation, authenticated recipient resolution, delivery/retry service, server audit, and SSO/deep-link authorization.
- **Blocked by missing infrastructure:** live multi-application processing, tenant-safe visibility, persistent intelligence state, provider delivery/retry, and enforced notification rules.

Build and test commands are listed in the application READMEs. No separate lint script is defined in either package manifest.
