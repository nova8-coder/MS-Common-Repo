import type { EventObservation, LifecycleAssessment } from '../data/types'
import type { LiftIQEvent } from '../integrations/liftiq/contract'

const PERSISTENCE_WINDOW_MS = 30 * 60 * 1000
const FLAPPING_WINDOW_MS = 15 * 60 * 1000
const FLAPPING_TRANSITIONS = 4

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object'
const validTime = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))

function validEnvelope(value: unknown): value is LiftIQEvent {
  if (!isRecord(value)) return false
  return typeof value.eventId === 'string' && !!value.eventId.trim()
    && typeof value.incidentId === 'string' && !!value.incidentId.trim()
    && typeof value.tenantId === 'string' && !!value.tenantId.trim()
    && typeof value.stationId === 'string' && !!value.stationId.trim()
    && typeof value.eventType === 'string' && !!value.eventType.trim()
    && typeof value.summary === 'string' && !!value.summary.trim()
    && validTime(value.occurredAt)
    && ['critical', 'high', 'medium', 'low'].includes(String(value.severity))
    && ['active', 'acknowledged', 'recovered'].includes(String(value.sourceState))
}

/**
 * Deterministic, in-memory prototype intake. Stable observation IDs are required for
 * duplicate classification; no content-based matching is attempted.
 */
export function processLiftIQIntake(input: readonly unknown[], now = Date.now()): {
  observations: EventObservation[]
  assessments: LifecycleAssessment[]
} {
  const observations: EventObservation[] = []
  const validEvents: LiftIQEvent[] = []
  const seenObservationIds = new Set<string>()
  const uniqueByLifecycle = new Map<string, Set<string>>()
  const duplicateByLifecycle = new Map<string, number>()

  for (const raw of input) {
    if (!validEnvelope(raw)) {
      const item = isRecord(raw) ? raw : {}
      observations.push({
        id: `rejected-${observations.length}`,
        sourceObservationId: '—',
        eventId: typeof item.eventId === 'string' ? item.eventId : 'Unknown event',
        incidentId: typeof item.incidentId === 'string' ? item.incidentId : 'Unknown lifecycle',
        tenantId: typeof item.tenantId === 'string' ? item.tenantId : 'Unknown tenant',
        sourceApplication: 'LiftIQ',
        stationId: typeof item.stationId === 'string' ? item.stationId : 'Unknown station',
        eventType: typeof item.eventType === 'string' ? item.eventType : 'Unknown event type',
        sourceState: 'active',
        occurredAt: typeof item.occurredAt === 'string' ? item.occurredAt : '',
        summary: typeof item.summary === 'string' ? item.summary : 'Envelope failed required field checks.',
        disposition: 'Rejected',
        reason: 'Missing required identity, event data, supported severity/state, or valid source timestamp.',
      })
      continue
    }
    validEvents.push(raw)
    const lifecycleKey = `${raw.tenantId}\u001f${raw.incidentId}`
    const lifecycleIds = uniqueByLifecycle.get(lifecycleKey) ?? new Set<string>()
    const supplied: unknown[] = Array.isArray(raw.observations) && raw.observations.length
      ? raw.observations
      : [{ eventId: raw.eventId, occurredAt: raw.occurredAt, summary: raw.summary }]

    for (const candidate of supplied) {
      const item = isRecord(candidate) ? candidate : {}
      const observationId = typeof item.eventId === 'string' ? item.eventId : ''
      const occurredAt = validTime(item.occurredAt) ? item.occurredAt : raw.occurredAt
      const summary = typeof item.summary === 'string' && item.summary.trim() ? item.summary : raw.summary
      const identity = `${raw.tenantId}\u001f${observationId}`
      const invalid = !observationId || !validTime(item.occurredAt) || typeof item.summary !== 'string' || !item.summary.trim()
      let disposition: EventObservation['disposition']
      let reason: string
      if (invalid) {
        disposition = 'Rejected'
        reason = 'Observation failed stable ID, summary, or timestamp checks; source event remains available.'
      } else if (seenObservationIds.has(identity)) {
        disposition = 'Duplicate'
        reason = `Stable observation ID ${observationId} was already seen for this tenant.`
        duplicateByLifecycle.set(lifecycleKey, (duplicateByLifecycle.get(lifecycleKey) ?? 0) + 1)
      } else {
        disposition = lifecycleIds.size ? 'Grouped' : 'Accepted'
        reason = disposition === 'Grouped'
          ? `Grouped by tenant and source lifecycle ${raw.incidentId}; observation retained in history.`
          : 'First valid observation for this source lifecycle.'
        lifecycleIds.add(observationId)
        seenObservationIds.add(identity)
      }
      observations.push({
        id: `${raw.eventId}:${observationId || `invalid-${observations.length}`}:${observations.length}`,
        sourceObservationId: observationId || 'Unknown observation',
        eventId: raw.eventId,
        incidentId: raw.incidentId,
        tenantId: raw.tenantId,
        sourceApplication: 'LiftIQ',
        stationId: raw.stationId,
        eventType: raw.eventType,
        sourceState: item.sourceState === 'active' || item.sourceState === 'acknowledged' || item.sourceState === 'recovered'
          ? item.sourceState
          : raw.sourceState,
        sourceStateExplicit: item.sourceState === 'active' || item.sourceState === 'acknowledged' || item.sourceState === 'recovered',
        occurredAt,
        summary,
        disposition,
        reason,
      })
    }
    uniqueByLifecycle.set(lifecycleKey, lifecycleIds)
  }

  const eventGroups = new Map<string, LiftIQEvent[]>()
  for (const event of validEvents) {
    const key = `${event.tenantId}\u001f${event.incidentId}`
    eventGroups.set(key, [...(eventGroups.get(key) ?? []), event])
  }

  const assessments = [...eventGroups].map(([key, events]): LifecycleAssessment => {
    const ordered = events.slice().sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
    const [tenantId, incidentId] = key.split('\u001f')
    const latest = ordered[ordered.length - 1]
    const uniqueCount = uniqueByLifecycle.get(key)?.size ?? 0
    const duplicateCount = duplicateByLifecycle.get(key) ?? 0
    const findings: LifecycleAssessment['findings'] = []
    const evidence: string[] = []

    if (latest.sourceState !== 'recovered' && now - Date.parse(ordered[0].occurredAt) >= PERSISTENCE_WINDOW_MS) {
      findings.push('Persistent active alarm')
      evidence.push(`Source remains ${latest.sourceState}; active lifecycle began ${Math.floor((now - Date.parse(ordered[0].occurredAt)) / 60_000)} minutes ago (prototype threshold: 30 minutes).`)
    }

    // Only explicit observation-level source states count as transition evidence.
    const transitions = observations
      .filter(item => item.tenantId === tenantId && item.incidentId === incidentId && item.sourceStateExplicit && item.disposition !== 'Duplicate' && item.disposition !== 'Rejected')
      .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
    let transitionWindow: EventObservation[] = []
    let transitionCount = 0
    for (const item of transitions.filter(item => item.sourceState !== 'acknowledged')) {
      transitionWindow = transitionWindow.filter(prior => Date.parse(item.occurredAt) - Date.parse(prior.occurredAt) <= FLAPPING_WINDOW_MS)
      transitionWindow.push(item)
      transitionCount = transitionWindow.slice(1).reduce((count, current, index) => {
        return count + (transitionWindow[index].sourceState !== current.sourceState ? 1 : 0)
      }, 0)
      if (transitionCount >= FLAPPING_TRANSITIONS) break
    }
    if (transitionCount >= FLAPPING_TRANSITIONS) {
      findings.push('Potentially flapping')
      evidence.push(`${transitionCount} explicit source-state transitions were observed within ${FLAPPING_WINDOW_MS / 60_000} minutes. This is a pattern classification, not an equipment diagnosis.`)
    }
    if (!findings.length) evidence.push('No supported flapping or persistence pattern detected from the supplied source history.')

    return { tenantId, incidentId, findings, evidence, uniqueObservations: uniqueCount, duplicateObservations: duplicateCount, currentSourceState: latest.sourceState }
  })

  return { observations, assessments }
}
