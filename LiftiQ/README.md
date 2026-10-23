# LiftIQ 3.0 prototype application

The consolidated, runnable application is in [`app/`](app/). The original standalone HTML prototypes remain alongside it as reference material.

## Run locally

```sh
cd LiftiQ/app
npm install
npm run dev
```

Create a production build with `npm run build` and preview it with `npm run preview`.

## Structure

- `src/data/` contains typed illustrative station, pump, alarm, notification, and preference data.
- `src/logic/alarmLifecycle.ts` contains lifecycle event handling and manual evidence completion rules.
- `src/components/` contains shared UI components and tokens.
- `src/pages/` contains the dashboard, station, global alarm, notification, and Events & History views.

All interactions are local to this prototype. It has no backend, does not send notifications, and does not control real devices. Mock values are identified in the UI where the source material is incomplete.

## Personalized Home prototype

Personalized Home is a separate navigation destination. Dashboard remains the initial default unless the demo user explicitly changes it in Personalized Home. The new page can remember the last notification filter, save/delete notification views, pin the sample station, reorder optional sections, and suggest repeated filters or pages after use across multiple sessions. Critical alarm lifecycles stay in a fixed operational section outside the reorderable content.

Personalization currently uses browser `localStorage` and `sessionStorage`, namespaced to the sample `Venky Karuppanan` / `sample-workspace` demo context. This demonstrates interactions in one browser; it is not authenticated, cross-device, tenant-isolated production persistence. Do not treat the client storage key as identity or authorization evidence.

The explainable ranking uses separate 3-day recent, 28-day sustained, and 90-day longer history signals. A frequent asset requires views on at least three days and across at least two sessions. A frequent filter suggestion requires at least three applications across two sessions in the last 14 days. These are prototype starting thresholds, not validated product settings. A landing-page recommendation requires at least five meaningful Personalized Home actions across five sessions and three days; it only changes the default after an explicit user choice. Refresh-like repeat events within five minutes in the same session do not add usage evidence.

Filter restoration only accepts the current Notifications filters (`query`, `type`, and `read`) and visibly shows active filters with a reset action. Current prototype data contains only the station records already represented in this app. Client-side filtering is not an authorization boundary; production recommendations and saved views must be resolved through the authenticated user's backend identity, tenant, and current asset permissions.

The page records local time-to-open-a-station from Dashboard and Personalized Home as a navigation-efficiency proxy. It does not claim that the user completed an operational task faster. Production evaluation needs authenticated workflow start/completion events and an agreed privacy/retention policy.

### Production integration still required

- An authenticated personalization API that derives user and tenant identity server-side, returns only currently authorized assets/pages, and revalidates access on open.
- Server-side activity and preference storage, retention/reset behavior, saved-view CRUD, and deduplicated event ingestion; never use client-supplied user/tenant IDs for authorization.
- Server validation of restored filter schemas and access scope, while keeping critical alarms visible independently of personal filters/ranking.
- A product-approved landing recommendation threshold and task-efficiency evaluation using real workflow completion outcomes.

No backend endpoints or database migrations were added because this repository contains no backend/authentication integration to extend.

## Events & History

The sidebar's **Events & History** workspace has five distinct views: Overview, Operational History, Measurements & Trends, Device & Communication, and Maintenance. Alarm lifecycles remain authoritative on the existing global **Alarms** page; Events & History links there instead of displaying duplicate alarm rows. Export actions live on the relevant filtered table (including Alarms), not in a standalone report destination.

The repository is a frontend prototype. It has mock alarm lifecycles, maintenance schedules, five message samples with level/current/run-hour fields, and sampled totalizer values. It does not contain a device protocol decoder, protocol specification sheets, message ingest service, PostgreSQL schema, backend event-processing flow, configuration snapshots, or communication timeout rules. Type 01 / Type 03 / Type 04 wire fields, scales, and clear semantics therefore cannot be validated here. The UI does not label mock messages with those protocol types or derive state transitions from current snapshots.

Operational History is empty until consecutive trustworthy pump states or comparable configuration snapshots can establish transitions. Measurements & Trends separates wet-well level, each pump's current and run-hour readings, and totalizer samples from alarm lifecycles. Device & Communication shows source message timestamps and the supplied reporting label, but does not calculate freshness or outage duration. Maintenance remains based on its own schedule and completion records. Unsupported measurements such as flow, battery voltage, and liquid quality remain unavailable. Totalizer dates without a supplied sample remain missing, not zero.

Reading and maintenance tables provide filters, pagination, record details, and client-side CSV export of the full filtered result set (not just the visible page). The Alarms page exports its currently filtered lifecycle records. Exports are built from local illustrative data; there is no live device connection or reporting API.

No backend, schema, message-processing pipeline, or new protocol behavior was added. Those changes require inspection of the production decoder, protocol documents, storage schema, and ingest flow first.

## AssetIQ Notification app prototype integration

LiftIQ remains a separate app from `../AssetIQ-Notifications`. The top-bar bell opens the notification inbox and previews only supported active mock alarm lifecycles. The local integration contract and mapper are in `app/src/integrations/notifications/liftiqEvent.ts`; the inbox app has a matching structural contract and a deterministic `LC-1042` fixture. There is no shared runtime state or live event/API integration. See [the notification app integration notes](../docs/integration/INTEGRATION.md) for exact commands, ports, event support, and data gaps.

Run the personalization ranking tests with `npm test` from `app/`.
