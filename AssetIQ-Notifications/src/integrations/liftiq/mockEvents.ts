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
    sourceState: 'active',
    severity: 'high',
    summary: 'Wet well level reached 70.2 in (threshold: 70 in).',
    observations: [
      { eventId: 'e-1042-1', occurredAt: '2026-10-12T10:04:12', summary: 'Wet well level reached 70.2 in (threshold: 70 in).' },
      { eventId: 'e-1042-2', occurredAt: '2026-10-12T10:08:45', summary: 'Wet well level still above 70 in (71.4 in).' },
      { eventId: 'e-1042-3', occurredAt: '2026-10-12T11:20:16', summary: 'Wet well level 71.8 in.' },
    ],
    detailsUrl: buildLiftIQStationUrl('NOVA_02', 'Alarms'),
  },
  {
    // Deterministic at-least-once delivery example; the observation ID is unchanged.
    eventId: 'liftiq:LC-1042:opened',
    incidentId: 'LC-1042',
    eventType: 'liftiq.alarm.wet_well_high_level.v1',
    tenantId: 'org-city-water',
    stationId: 'NOVA_02',
    occurredAt: '2026-10-12T10:04:12',
    sourceState: 'active',
    severity: 'high',
    summary: 'Wet well level reached 70.2 in (threshold: 70 in).',
    observations: [
      { eventId: 'e-1042-3', occurredAt: '2026-10-12T11:20:16', summary: 'Pump/wet-well lifecycle repeat envelope replayed.' },
    ],
    detailsUrl: buildLiftIQStationUrl('NOVA_02', 'Alarms'),
  },
]
