/** Proposed frontend contract, not a LiftIQ API or backend payload. */
export type LiftIQEventType =
  | 'liftiq.alarm.pump_fault.v1'
  | 'liftiq.alarm.wet_well_high_level.v1'
  | 'liftiq.station.communication_lost.v1'

export type LiftIQEvent = {
  eventId: string
  /** Stable lifecycle identity used to group repeated source observations. */
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
