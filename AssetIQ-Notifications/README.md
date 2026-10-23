# AssetIQ Notification Platform

A standalone React and Vite prototype for a shared, multi-application notifications workspace.

## Run locally

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`, then serve it with `npm run preview`.

The prototype Vite server uses `http://localhost:5174` so it can run beside LiftIQ on port 5173.

## Included views

- Notification Inbox with organization scope, search, filters, grouped threads, detail timelines, acknowledgement, and snooze.
- Notification Rules with enable and disable controls and rule creation.
- Recipients & Groups with member and channel controls.
- Preferences, Delivery History, Audit Log, and Administration views.

All records and actions are local mock data. The role selector and organization scope are demonstration controls; they are not authentication or authorization. Delivery attempts are simulated, provider acceptance does not confirm receipt, and acknowledging a notification does not change the source application's alarm or equipment state. Production use requires authenticated tenant scoping, server-side policy and audit storage, event ingestion, and delivery provider integrations.

## LiftIQ prototype integration

See [the integration contract and limits](INTEGRATION.md). The inbox is seeded with a deterministic contract fixture for LiftIQ lifecycle `LC-1042`; it is not receiving live events. Its event ID is stable, duplicate IDs are collapsed, and no delivery attempts or recovery are inferred. The event's `org-city-water` tenant value is a synthetic demo scope because LiftIQ currently has no tenant identity field.

LiftIQ station links use `http://localhost:5173/?station=NOVA_02&tab=Alarms`. Set `VITE_LIFTIQ_APP_URL` in this app's environment to use another LiftIQ base URL.
