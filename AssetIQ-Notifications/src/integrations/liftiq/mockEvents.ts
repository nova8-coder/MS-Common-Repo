import type { LiftIQEvent } from './contract'
import { buildLiftIQStationUrl } from './config'

/** Explicit demo fixtures mirrored from LiftIQ's LC-1042 active lifecycle. */
export const liftIQMockEvents: LiftIQEvent[] = [
  {
    eventId: 'liftiq:LC-1042:opened',
    incidentId: 'LC-1042',
    eventType: 'liftiq.alarm.wet_well_high_level.v1',
    // Synthetic prototype scope only; LiftIQ does not currently carry tenant identity.
    tenantId: 'org-city-water',
    stationId: 'NOVA_02',
    occurredAt: '2026-10-12T10:04:12',
    severity: 'high',
    summary: 'Wet well level reached 70.2 in (threshold: 70 in).',
    detailsUrl: buildLiftIQStationUrl('NOVA_02', 'Alarms'),
  },
]
