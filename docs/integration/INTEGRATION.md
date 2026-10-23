# LiftIQ integration contract

This is a proposed frontend contract, not an existing LiftIQ API. Its source type is in [`liftiqEvent.ts`](../../LiftiQ/app/src/integrations/notifications/liftiqEvent.ts); the notification app keeps a structurally matching local type in [`contract.ts`](../../AssetIQ-Notifications/src/integrations/liftiq/contract.ts) so the two Vite apps remain independent without a shared runtime package.

Each event has a stable lifecycle `eventId`, a lifecycle `incidentId`, versioned `eventType`, tenant and station context, an optional stable asset ID, ISO 8601 local occurrence timestamp, `sourceState`, severity, summary, source device `observations`, and optional source URL. Each observation carries its stable source event ID, timestamp, summary, and optional explicit source state. LiftIQ's mock timestamps have no UTC offset, so the adapter preserves their local date-time text instead of inventing a timezone. LiftIQ's domain model has no tenant field; the fixture's `org-city-water` is synthetic and must be replaced by authenticated server-side tenant resolution before production use.

## Candidate event categories

| Event type | Current support | Evidence / handling |
| --- | --- | --- |
| `liftiq.alarm.wet_well_high_level.v1` | Emitted by the demo adapter | Active lifecycle `LC-1042` carries its activation and two repeated device observations. The notification adapter deduplicates repeated event envelopes by stable event ID and groups unique source observations into one thread by tenant and lifecycle ID. Each observation remains in the thread timeline. |
| `liftiq.alarm.pump_fault.v1` | Mapper supports this category; no current active fixture | `LC-1040` is a completed Pump 1 fault. Pump 2's current status snapshot and stale current alarm do not establish an active pump fault lifecycle, so neither is emitted. |
| `liftiq.station.communication_lost.v1` | Not emitted | The repository has no communication-outage lifecycle or timeout rule. A last report timestamp alone is insufficient evidence. |

The current mapper exports active and LiftIQ-acknowledged lifecycles. Notification state and `sourceState` are separate fields: acknowledging a notification changes only the notification thread. The mapper marks only recognized device alarm-generation/repeat records as explicit active-state observations; it does not infer recovery or export completed lifecycles. The adapter makes no delivery attempts; the mapped thread has an empty delivery list. AssetIQ Notifications now has a deterministic frontend intake demonstration: it retains source observation rows, classifies exact stable observation IDs as duplicate, groups unique records by tenant and lifecycle, and evaluates persistence/flapping when reliable evidence exists. The current fixture has no recovered transitions, so no flapping finding is produced. It does not implement notification-storm protection or receive live events.

Malformed contract envelopes and observations are represented as rejected rows by the activity processor, while the notification-thread adapter drops malformed envelopes and skips malformed observation rows. Stable duplicate source-observation rows remain visible in Incoming Events; grouped observations remain available in the history. These guards are prototype input validation, not a production schema validator or durable idempotency guarantee.

LiftIQ's notification bell links a selected alarm context to `AssetIQ-Notifications/inbox?source=LiftIQ&tenantId=…&lifecycleId=…`; Incoming Events links to a notification thread by its local thread ID. The values support navigation only and must not be treated as identity or access claims. No shared SSO/session or authenticated return path was found in this repository.

The event processor's 30-minute persistence threshold and four alternating active/recovered transitions in 15 minutes for potential flapping are documented, tested prototype defaults. Assessment uses source timestamps and current source state. Rules, recipient resolution, quiet-hour handling, escalation, and delivery remain unconnected.

## Local run commands

Start each app in its own terminal:

```sh
cd LiftiQ/app
npm install
npm run dev
```

LiftIQ: `http://localhost:5173`

```sh
cd AssetIQ-Notifications
npm install
npm run dev
```

AssetIQ Notifications: `http://localhost:5174/inbox`

Both Vite servers use fixed ports with `strictPort`; change their Vite configs if those ports are occupied. Link base URLs can be overridden with `VITE_NOTIFICATION_APP_URL` in LiftIQ and `VITE_LIFTIQ_APP_URL` in the notification app.

This prototype has no shared runtime state, API, event broker, identity integration, persistent store, or provider connection. The notification fixture mirrors the LiftIQ sample explicitly; frontend intake is a deterministic demonstration, not production event ingestion or authenticated cross-tenant delivery. See [event processing and UX decisions](../notifications/EVENT_PROCESSING.md) and [Notifications current state](../notifications/CURRENT_STATE.md).
