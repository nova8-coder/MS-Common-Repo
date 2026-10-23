# AssetIQ Notification Platform

A standalone React and Vite prototype for a shared, multi-application notifications workspace.

## Run locally

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`, then serve it with `npm run preview`.
Run adapter and event-intelligence unit tests with `npm test`.

The prototype Vite server uses `http://localhost:5174` so it can run beside LiftIQ on port 5173.

## Included views

- Notification Inbox with organization scope, search, filters, grouped threads, detail timelines, acknowledgement, and snooze.
- Incoming Events with retained source observations, processing status/reason, prototype intelligence findings, filters, and Inbox deep links.
- Organization administrator dashboard as the landing page, with prioritized alerts, recent events, and delivery issues.
- Notification Rules with a progressive create/edit flow for event, scope, recipients/channels, and repeat intent.
- Recipients & Groups with member and channel controls.
- Preferences, Delivery History, Audit Log, and Administration views.

All records and actions are local mock data. The role selector and organization scope are demonstration controls; they are not authentication or authorization. Delivery attempts are simulated, provider acceptance does not confirm receipt, and acknowledging a notification does not change the source application's alarm or equipment state. Production use requires authenticated tenant scoping, server-side policy and audit storage, event ingestion, and delivery provider integrations.

The Inbox labels notification status separately from source alarm state. Rules are local configuration intent; the prototype does not match events to rules or enforce cooldowns, reminders, escalations, recovery routing, or delivery. Personal preferences are separate from organization rules. The LiftIQ fixture adapter validates basic event identity/timestamps and groups source observations by lifecycle. Incoming Events also classifies exact stable-ID duplicates and evaluates prototype persistence/flapping patterns from supported evidence. The current fixture has no recovered transitions, so it does not show a flapping finding; storm protection remains proposed. See [the administrator experience](../docs/notifications/ADMIN_EXPERIENCE.md), [current-state and behavior notes](../docs/notifications/CURRENT_STATE.md), and [event processing decisions](../docs/notifications/EVENT_PROCESSING.md).

## LiftIQ prototype integration

See [the integration contract and limits](../docs/integration/INTEGRATION.md). The inbox is seeded with a deterministic contract fixture for LiftIQ lifecycle `LC-1042`; it is not receiving live events. The event's `org-city-water` tenant value is a synthetic demo scope because LiftIQ currently has no tenant identity field.

The fixture's stable lifecycle event ID is grouped; its source device observations and timestamps remain individually visible. The source-state field is separate from notification acknowledgement. No delivery attempts or recovery are inferred. The event's `org-city-water` tenant value is a synthetic demo scope because LiftIQ currently has no tenant identity field.

LiftIQ station links use `http://localhost:5173/?station=NOVA_02&tab=Alarms`. Set `VITE_LIFTIQ_APP_URL` in this app's environment to use another LiftIQ base URL.
