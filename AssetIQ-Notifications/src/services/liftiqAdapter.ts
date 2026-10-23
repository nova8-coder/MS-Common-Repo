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

const validTime = (value: string) => Number.isFinite(Date.parse(value))

/** Validate and group contract events by source lifecycle, retaining each distinct observation. */
export function mapLiftIQEventsToThreads(events: LiftIQEvent[]): NotificationThread[] {
  const unique = new Map<string, LiftIQEvent>()
  for (const event of events) {
    if (!event || typeof event !== 'object' || typeof event.eventId !== 'string' || !event.eventId || typeof event.incidentId !== 'string' || !event.incidentId || typeof event.tenantId !== 'string' || !event.tenantId || typeof event.stationId !== 'string' || !event.stationId || typeof event.eventType !== 'string' || !event.eventType || typeof event.summary !== 'string' || !event.summary.trim() || typeof event.occurredAt !== 'string' || !validTime(event.occurredAt) || !['critical', 'high', 'medium', 'low'].includes(event.severity) || !['active', 'acknowledged'].includes(event.sourceState)) continue
    const key = `${event.tenantId}\u001f${event.eventId}`
    const prior = unique.get(key)
    if (!prior) unique.set(key, event)
    else unique.set(key, {
      ...event,
      observations: [
        ...(Array.isArray(prior.observations) ? prior.observations : []),
        ...(Array.isArray(event.observations) ? event.observations : []),
      ],
    })
  }

  const byLifecycle = new Map<string, LiftIQEvent[]>()
  for (const event of unique.values()) {
    const key = `${event.tenantId}\u001f${event.incidentId}`
    byLifecycle.set(key, [...(byLifecycle.get(key) ?? []), event])
  }

  return [...byLifecycle.values()].map((lifecycleEvents): NotificationThread => {
    const orderedEvents = lifecycleEvents.slice().sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
    const first = orderedEvents[0]
    const latest = orderedEvents[orderedEvents.length - 1]
    const observations = new Map<string, { eventId: string; occurredAt: string; summary: string }>()
    for (const event of orderedEvents) {
      const supplied = Array.isArray(event.observations) && event.observations.length ? event.observations : [{ eventId: event.eventId, occurredAt: event.occurredAt, summary: event.summary }]
      for (const observation of supplied) {
        if (!observation || typeof observation !== 'object' || typeof observation.eventId !== 'string' || !observation.eventId || typeof observation.occurredAt !== 'string' || !validTime(observation.occurredAt) || typeof observation.summary !== 'string' || !observation.summary.trim()) continue
        if (!observations.has(observation.eventId)) observations.set(observation.eventId, observation)
      }
    }
    if (!observations.size) observations.set(latest.eventId, { eventId: latest.eventId, occurredAt: latest.occurredAt, summary: latest.summary })
    const orderedObservations = [...observations.values()].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
    const timeline: NotificationThread['timeline'] = orderedObservations.map((observation, index) => ({
      id: `${observation.eventId}:observed`,
      time: observation.occurredAt,
      kind: index === 0 ? 'detected' : 'repeat',
      title: index === 0 ? 'Source alarm activated' : 'Repeated source observation grouped',
      description: index === 0 ? observation.summary : `${observation.summary} Source alarm history is retained; this observation does not create a separate notification thread.`,
    }))
    const sourceEvent = {
      eventId: first.eventId,
      sourceApplication: 'LiftIQ' as const,
      tenantId: latest.tenantId,
      stationId: latest.stationId,
      assetId: latest.assetId ?? latest.stationId,
      eventType: latest.eventType,
      sourceLifecycleId: latest.incidentId,
      severity: severityLabel[latest.severity],
      occurredAt: first.occurredAt,
      correlationKey: `${latest.tenantId}:${latest.stationId}:${latest.incidentId}`,
      sourceState: latest.sourceState,
      sourceReference: latest.detailsUrl ?? '',
      metadata: { summary: latest.summary },
    }
    return {
      id: `liftiq-${latest.tenantId}-${latest.incidentId.toLowerCase()}`,
      event: sourceEvent,
      title: titleFor(latest),
      description: latest.summary,
      status: 'Active',
      firstOccurredAt: orderedObservations[0]?.occurredAt ?? first.occurredAt,
      lastObservedAt: orderedObservations[orderedObservations.length - 1]?.occurredAt ?? latest.occurredAt,
      occurrences: Math.max(1, orderedObservations.length),
      unread: true,
      escalated: false,
      recipients: [],
      timeline,
      deliveries: [],
    }
  })
}

/** Merge deterministic integration fixtures without duplicating existing stable event IDs. */
export function mergeLiftIQThreads(existing: NotificationThread[], events: LiftIQEvent[]) {
  const incoming = mapLiftIQEventsToThreads(events)
  const byEventId = new Map<string, NotificationThread>()
  const byLifecycle = new Map<string, NotificationThread>()
  for (const thread of incoming) {
    byEventId.set(`${thread.event.tenantId}\u001f${thread.event.eventId}`, thread)
    byLifecycle.set(`${thread.event.tenantId}\u001f${thread.event.sourceLifecycleId}`, thread)
  }
  const used = new Set<string>()
  const merged = existing.map(thread => {
    const key = `${thread.event.tenantId}\u001f${thread.event.sourceLifecycleId}`
    const mapped = byEventId.get(`${thread.event.tenantId}\u001f${thread.event.eventId}`) ?? byLifecycle.get(key)
    if (!mapped || used.has(key)) return thread
    used.add(key)
    // Keep the existing inbox row ID and read state while using the adapter's source data.
    return { ...mapped, id: thread.id, unread: thread.unread }
  })
  for (const thread of incoming) {
    const key = `${thread.event.tenantId}\u001f${thread.event.sourceLifecycleId}`
    if (!used.has(key)) {
      used.add(key)
      merged.push(thread)
    }
  }
  return merged
}
