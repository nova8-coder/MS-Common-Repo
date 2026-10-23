# LiftIQ integration contract

This is a proposed frontend contract, not an existing LiftIQ API. Its source type is in [`liftiqEvent.ts`](../../LiftiQ/app/src/integrations/notifications/liftiqEvent.ts); the notification app keeps a structurally matching local type in [`contract.ts`](../../AssetIQ-Notifications/src/integrations/liftiq/contract.ts) so the two Vite apps remain independent without a shared runtime package.

Each event has a stable lifecycle `eventId`, a lifecycle `incidentId`, versioned `eventType`, tenant and station context, an optional stable asset ID, ISO 8601 local occurrence timestamp, `sourceState`, severity, summary, a list of source device `observations`, and optional source URL. Each observation carries its stable source event ID, timestamp, and summary. LiftIQ's mock timestamps have no UTC offset, so the adapter preserves their local date-time text instead of inventing a timezone. LiftIQ's domain model has no tenant field; the fixture's `org-city-water` is synthetic and must be replaced by authenticated server-side tenant resolution before production use.

## Candidate event categories

| Event type | Current support | Evidence / handling |
| --- | --- | --- |
| `liftiq.alarm.wet_well_high_level.v1` | Emitted by the demo adapter | Active lifecycle `LC-1042` carries its activation and two repeated device observations. The notification adapter deduplicates repeated event envelopes by stable event ID and groups unique source observations into one thread by tenant and lifecycle ID. Each observation remains in the thread timeline. |
| `liftiq.alarm.pump_fault.v1` | Mapper supports this category; no current active fixture | `LC-1040` is a completed Pump 1 fault. Pump 2's current status snapshot and stale current alarm do not establish an active pump fault lifecycle, so neither is emitted. |
| `liftiq.station.communication_lost.v1` | Not emitted | The repository has no communication-outage lifecycle or timeout rule. A last report timestamp alone is insufficient evidence. |

The current mapper exports active and LiftIQ-acknowledged lifecycles. Notification state and `sourceState` are separate fields: acknowledging a notification changes only the notification thread. Recovery is not inferred or emitted by this mapper. The adapter makes no delivery attempts; the mapped thread has an empty delivery list. The local prototype demonstrates duplicate envelope handling and repeat grouping from the supplied source observations. It does not implement flapping, persistence, or notification-storm detection, nor does it receive live events.

Malformed contract envelopes with missing identifiers or invalid occurrence timestamps are ignored by the frontend adapter. Invalid individual observations are skipped; repeated observation IDs are retained once. These guards are prototype input validation, not a production schema validator or durable idempotency guarantee.

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

This prototype has no shared runtime state, API, event broker, identity integration, or provider connection. The notification fixture mirrors the LiftIQ sample explicitly; it is not event ingestion or authenticated cross-tenant delivery.
