import type { AlarmLifecycle } from '../../data/model'

/** Proposed frontend contract. This is not an existing LiftIQ API. */
export type LiftIQEventType =
  | 'liftiq.alarm.pump_fault.v1'
  | 'liftiq.alarm.wet_well_high_level.v1'
  | 'liftiq.station.communication_lost.v1'

export type LiftIQEvent = {
  eventId: string
  incidentId: string
  eventType: LiftIQEventType
  tenantId: string
  stationId: string
  assetId?: string
  occurredAt: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  summary: string
  detailsUrl?: string
}

export const DEMO_TENANT_ID = 'org-city-water'

export const LIFTIQ_EVENT_TYPES = {
  pumpFault: 'liftiq.alarm.pump_fault.v1',
  wetWellHighLevel: 'liftiq.alarm.wet_well_high_level.v1',
  stationCommunicationLost: 'liftiq.station.communication_lost.v1',
} as const satisfies Record<string, LiftIQEventType>

export const getNotificationInboxUrl = () =>
  import.meta.env.VITE_NOTIFICATION_APP_URL || 'http://localhost:5174/inbox'

export function buildLiftIQStationUrl(stationId: string, tab = 'Alarms') {
  const base = import.meta.env.VITE_LIFTIQ_APP_URL || 'http://localhost:5173'
  const url = new URL('/', base)
  url.searchParams.set('station', stationId)
  url.searchParams.set('tab', tab)
  return url.toString()
}

function supportedType(alarm: AlarmLifecycle): LiftIQEventType | null {
  if (alarm.name === 'High Level' && alarm.component === 'Wet Well') return LIFTIQ_EVENT_TYPES.wetWellHighLevel
  if (/^Pump \d+ Fault$/.test(alarm.name) && alarm.component === alarm.name.replace(' Fault', '')) return LIFTIQ_EVENT_TYPES.pumpFault
  // The source mock has no timeout rule or communication-outage lifecycle.
  return null
}

/** Map only active lifecycle records; repeated evidence stays within its incident. */
export function mapAlarmToLiftIQEvent(
  alarm: AlarmLifecycle,
  tenantId = DEMO_TENANT_ID,
): LiftIQEvent | null {
  const eventType = supportedType(alarm)
  if (!eventType || !['Active', 'Acknowledged'].includes(alarm.status)) return null
  const activation = alarm.events[0]
  if (!activation?.at || !alarm.station || !tenantId) return null

  return {
    eventId: `liftiq:${alarm.id}:opened`,
    incidentId: alarm.id,
    eventType,
    tenantId,
    stationId: alarm.station,
    occurredAt: activation.at,
    severity: alarm.severity.toLowerCase() as LiftIQEvent['severity'],
    summary: activation.detail,
    detailsUrl: buildLiftIQStationUrl(alarm.station, 'Alarms'),
  }
}

export function mapAlarmsToLiftIQEvents(alarms: AlarmLifecycle[], tenantId = DEMO_TENANT_ID) {
  const byEventId = new Map<string, LiftIQEvent>()
  for (const alarm of alarms) {
    const event = mapAlarmToLiftIQEvent(alarm, tenantId)
    if (event && !byEventId.has(event.eventId)) byEventId.set(event.eventId, event)
  }
  return [...byEventId.values()]
}

export function mapAlarmsToNotificationPreviews(alarms: AlarmLifecycle[]) {
  const unreadLifecycleIds = new Set(alarms.filter(alarm => alarm.unread).map(alarm => alarm.id))
  return mapAlarmsToLiftIQEvents(alarms).map(event => ({ event, unread: unreadLifecycleIds.has(event.incidentId) }))
}
