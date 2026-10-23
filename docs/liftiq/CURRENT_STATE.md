# LiftIQ Current State and UX Notes

## Application scope

LiftIQ is the product-specific operations prototype for lift stations, pumps, equipment readings, alarms, and station history. The runnable React app is under `LiftiQ/app/`; its records and interactions are local mock data/state. There is no device-message decoder, backend, live ingestion, authenticated user/tenant boundary, or device-control connection in this repository.

The main application destinations are Dashboard, Personalized Home, Lift Stations and station details, Watch Mode, Alarms, Notifications, and Events & History. Station detail views include messages, events, trends, totalizer, commands, maintenance, and pump health. See [the LiftIQ README](../../LiftiQ/README.md) for prototype setup and additional page notes.

## Alarm and event ownership

LiftIQ owns the meaning and local lifecycle of LiftIQ alarms. The model currently represents `Active`, `Acknowledged`, `Recovery review`, `Stale`, and `Completed` states. A matching new activation updates an unresolved lifecycle's repeat count and evidence timeline. A device clear completes the matching lifecycle. Normalization evidence without a device clear can be placed in recovery review and requires an explicit user completion action. A stale lifecycle means the condition during the reporting gap is unknown; it does not imply a clear.

`Completed` is not always equivalent to a device clear: the resolution field distinguishes device completion from status-based or manual evidence completion. The Notifications UI therefore shows `Cleared` only for a completed lifecycle whose resolution is `Device`; other lifecycle states retain their specific names.

## UX clarification made in this task

LiftIQ's station banner now reports the supplied reporting label and last-reported timestamp, summarizes unresolved alarm and pump-fault records, and lists each pump's supplied state and role. It no longer labels the station "Good" when the sample data contains an open alarm and a pump fault. These are summaries of mock fields, not a live freshness calculation or an aggregate device-health diagnosis.

The Notifications table and detail drawer now show the linked source alarm lifecycle state separately from notification read state and mock delivery attempts. The explanatory note states that read and mute actions do not change the source alarm. A mute action records a local prototype rule only; no delivery engine applies it. Existing alarm lifecycle records remain visible on the Alarms page.

The fixed mute suggestion is labeled as an example based on mock data, not an automated detector. No equipment signals, alarm states, or lifecycle rules were added or changed for this UI clarification.

## Integration boundary

The frontend mapper exports only supported active or LiftIQ-acknowledged lifecycles. It carries `sourceState` and source device observation IDs, timestamps, and summaries. The event contract, fixture tenant, and URL links are prototype integration data, not a production API. See the [LiftIQ–Notifications integration reference](../integration/INTEGRATION.md).
