import type { LiftIQEvent } from '../integrations/liftiq/contract'
import type { NotificationThread } from '../data/types'

const severityLabel: Record<LiftIQEvent['severity'], NotificationThread['event']['severity']> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}

const titleFor = (event: LiftIQEvent): string => {
  switch (event.eventType) {
    case 'liftiq.alarm.pump_fault.v1': return 'Pump fault'
    case 'liftiq.alarm.wet_well_high_level.v1': return 'Wet well high level'
    case 'liftiq.station.communication_lost.v1': return 'Station communication lost'
    default: return event.eventType
  }
}

/** Convert contract events to inbox threads; repeated delivery of an event ID is ignored. */
export function mapLiftIQEventsToThreads(events: LiftIQEvent[]): NotificationThread[] {
  const unique = new Map<string, LiftIQEvent>()
  for (const event of events) {
    if (!unique.has(event.eventId)) unique.set(event.eventId, event)
  }

  return [...unique.values()].map((event): NotificationThread => ({
    id: `liftiq-${event.incidentId.toLowerCase()}`,
    event: {
      eventId: event.eventId,
      sourceApplication: 'LiftIQ',
      tenantId: event.tenantId,
      stationId: event.stationId,
      assetId: event.assetId ?? event.stationId,
      eventType: event.eventType,
      sourceLifecycleId: event.incidentId,
      severity: severityLabel[event.severity],
      occurredAt: event.occurredAt,
      correlationKey: `${event.tenantId}:${event.stationId}:${event.incidentId}`,
      state: 'active',
      sourceReference: event.detailsUrl ?? '',
      metadata: { summary: event.summary },
    },
    title: titleFor(event),
    description: event.summary,
    status: 'Active',
    firstOccurredAt: event.occurredAt,
    lastObservedAt: event.occurredAt,
    occurrences: 1,
    unread: true,
    escalated: false,
    recipients: [],
    timeline: [{
      id: `${event.eventId}:created`, time: event.occurredAt, kind: 'detected',
      title: 'LiftIQ lifecycle fixture received',
      description: 'Mock contract event. No repeated observations or delivery attempts are inferred.',
    }],
    deliveries: [],
  }))
}

/** Merge deterministic integration fixtures without duplicating existing stable event IDs. */
export function mergeLiftIQThreads(existing: NotificationThread[], events: LiftIQEvent[]) {
  const incoming = mapLiftIQEventsToThreads(events)
  const byEventId = new Map<string, NotificationThread>()
  for (const thread of incoming) byEventId.set(thread.event.eventId, thread)
  const used = new Set<string>()
  const merged = existing.map(thread => {
    const mapped = byEventId.get(thread.event.eventId)
    if (!mapped || used.has(thread.event.eventId)) return thread
    used.add(thread.event.eventId)
    // Keep the existing inbox row ID and read state while using the adapter's source data.
    return { ...mapped, id: thread.id, unread: thread.unread }
  })
  for (const thread of incoming) {
    if (!used.has(thread.event.eventId)) {
      used.add(thread.event.eventId)
      merged.push(thread)
    }
  }
  return merged
}
