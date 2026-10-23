# AssetIQ Notifications Current State and UX Notes

## Pages and behavior

The standalone React application opens on an organization administrator dashboard and has Inbox, Incoming Events, Notification Rules, Recipients & Groups, Preferences, Delivery History, Audit Log, and Administration routes. Its records and edits are in-memory/local mock state. Organization and role selectors are demonstration controls; there is no authentication or server-side authorization.

The Inbox filters notification threads and opens a details drawer with source event, lifecycle timeline, occurrence count, delivery attempts, and supported alert-intelligence evidence. It labels **notification status** separately from **source alarm state**. Acknowledgement updates the notification thread and timeline only. Delivery records say simulated; provider acceptance does not establish user receipt. Incoming Events lists individual deterministic LiftIQ fixture observations with processing reasons and links to the matching Inbox lifecycle.

The dashboard prioritizes unresolved conditions and exposes recent event and delivery issues with links to relevant history. Notification Rules use a five-step create/edit flow for event, scope, recipients/channels, repeat preference, and review. Rules and enable/disable actions change local example data only. The app does not evaluate live or fixture events against these rules. Reminder and every-occurrence choices are saved intent only; repeat grouping is represented in local lifecycle history.

Recipients & Groups, Preferences, Delivery History, Audit Log, and Administration remain separate routes because they serve distinct configuration/history tasks. Group membership and channel edits are local examples. Delivery history is simulated; audit rows are seeded or in-memory and are not durable records. Preference switches are local UI state and do not govern an active delivery service. Administration describes missing production connections rather than presenting inert configuration switches as working controls. See the [administrator experience](ADMIN_EXPERIENCE.md) for the intended page responsibilities.

## Alert intelligence status

| Capability | Status in this checkout |
|---|---|
| Basic event envelope validation | **Implemented in the LiftIQ frontend adapter:** required tenant, event, incident, station IDs, and parseable occurrence timestamps are checked; malformed observation rows are skipped. This is not a server schema/security boundary. |
| Duplicate event handling | **Implemented in the deterministic intake engine:** exact stable observation IDs within a tenant are marked as duplicates, and duplicate history rows remain visible. The fixture replays one stable observation in a duplicate envelope. The separate thread adapter merges duplicate envelopes by event ID. Neither is durable idempotency. |
| Repeat grouping | **Implemented for supplied LiftIQ source observations:** unique stable IDs are grouped by tenant and lifecycle; individual rows remain in Incoming Events and the Inbox timeline. This groups display/history; it does not suppress source events or execute delivery cooldowns. |
| Notification acknowledgement | **Implemented as a local thread action:** it changes notification status and appends a timeline entry; it does not change `event.sourceState` or LiftIQ state. |
| Cooldown, reminders, escalation, quiet hours, recovery routing | **Configured/displayed in mock rules or preferences only.** No policy evaluator or scheduler is connected. |
| Flapping detection | **Implemented as a tested generic prototype rule:** requires at least four alternating explicit active/recovered source transitions inside 15 minutes. Current LiftIQ fixture has no recovered transitions, so no flapping finding is shown. |
| Persistent-alarm detection | **Implemented as a tested prototype rule:** current source state must remain active or acknowledged for at least 30 minutes from the supplied source timestamp. The fixture is old and still marked active, so it demonstrates the classification only; it is not a live duration service. |
| Notification-storm protection | **Proposed, not implemented.** There is no ingestion stream, shared rate limiter, or delivery service. Critical alerts are not silently discarded by the local grouping adapter. |
| Delivery and audit | **Simulated/local only.** No provider integration, durable delivery records, or server audit store exists here. |

The [event processing and UX decisions](EVENT_PROCESSING.md) document the exact criteria and evidence. The contract, fixture and adapter are described in the [integration reference](../integration/INTEGRATION.md). Production use requires authenticated tenant/asset authorization, event ingestion and schema validation, durable idempotency and policy evaluation, provider delivery, and server-side delivery/audit storage.
