# AssetIQ Notifications Current State and UX Notes

## Pages and behavior

The standalone React application has Inbox, Rules, Recipients & Groups, Preferences, Delivery History, Audit Log, and Administration routes. Its records and edits are in-memory/local mock state. Organization and role selectors are demonstration controls; there is no authentication or server-side authorization.

The Inbox filters notification threads and opens a details drawer with source event, lifecycle timeline, occurrence count, and delivery attempts. It now labels **notification status** separately from **source alarm state**. Acknowledgement updates the notification thread and timeline only. Delivery records say simulated; provider acceptance does not establish user receipt.

Rules are grouped in the UI as condition, noise handling, and delivery policy. Creating a rule captures a name, product/event/severity, and recipient group rather than silently choosing the first rule's hidden defaults. Enable/disable and create actions change local example data only. The app does not evaluate live or fixture events against these rules.

Recipients & Groups, Preferences, Delivery History, Audit Log, and Administration remain separate routes because they serve distinct configuration/history tasks. Group membership and channel edits are local examples. Delivery history is simulated; audit rows are seeded or in-memory and are not durable records. Preference switches are local UI state and do not govern an active delivery service.

## Alert intelligence status

| Capability | Status in this checkout |
|---|---|
| Basic event envelope validation | **Implemented in the LiftIQ frontend adapter:** required tenant, event, incident, station IDs, and parseable occurrence timestamps are checked; malformed observation rows are skipped. This is not a server schema/security boundary. |
| Duplicate event handling | **Implemented in the LiftIQ frontend adapter:** repeated envelopes with the same tenant and `eventId` are collapsed. |
| Repeat grouping | **Implemented for supplied LiftIQ source observations:** observations with stable IDs are de-duplicated and retained in one notification thread per tenant and lifecycle. The timeline keeps the original activation and later observations. This groups display/history; it does not suppress source events or execute delivery cooldowns. |
| Notification acknowledgement | **Implemented as a local thread action:** it changes notification status and appends a timeline entry; it does not change `event.sourceState` or LiftIQ state. |
| Cooldown, reminders, escalation, quiet hours, recovery routing | **Configured/displayed in mock rules or preferences only.** No policy evaluator or scheduler is connected. |
| Flapping detection | **Proposed, not implemented.** This checkout does not provide a trusted ordered transition stream to evaluate. |
| Persistent-alarm detection | **Proposed, not implemented.** The fixtures show timestamps, but there is no live-state duration service or trusted ongoing event feed. |
| Notification-storm protection | **Proposed, not implemented.** There is no ingestion stream, shared rate limiter, or delivery service. Critical alerts are not silently discarded by the local grouping adapter. |
| Delivery and audit | **Simulated/local only.** No provider integration, durable delivery records, or server audit store exists here. |

The contract, fixture and adapter are described in the [integration reference](../integration/INTEGRATION.md). Production use requires authenticated tenant/asset authorization, event ingestion and schema validation, durable idempotency and policy evaluation, provider delivery, and server-side delivery/audit storage.
