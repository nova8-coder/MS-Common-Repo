import type { AuditEntry, NotificationRule, NotificationThread, Recipient, RecipientGroup } from './types'
import { buildLiftIQStationUrl } from '../integrations/liftiq/config'

const orgs = { city: 'org-city-water', county: 'org-county-utilities' }
const iso = (day: number, hour: number, minute: number) => `2026-10-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`

const people: Recipient[] = [
  { id: 'u-1', name: 'Subashini K', email: 'subashini.k@assetiq.example', organizationId: orgs.city, products: ['LiftIQ', 'TankIQ'], channels: ['In-app', 'Push', 'Email'] },
  { id: 'u-2', name: 'Venky Karuppanan', email: 'venky.k@assetiq.example', organizationId: orgs.city, products: ['LiftIQ', 'FlowIQ'], channels: ['In-app', 'Push', 'Email'] },
  { id: 'u-3', name: 'Mathavan S', email: 'mathavan.s@assetiq.example', organizationId: orgs.city, products: ['LiftIQ'], channels: ['In-app', 'Push', 'SMS'] },
  { id: 'u-4', name: 'Vennila M', email: 'vennila.m@assetiq.example', organizationId: orgs.city, products: ['LiftIQ', 'TankIQ'], channels: ['In-app', 'Email'] },
  { id: 'u-5', name: 'Nandhini M', email: 'nandhini.m@assetiq.example', organizationId: orgs.county, products: ['ReeferIQ', 'FlowIQ'], channels: ['In-app', 'Push', 'Email'] },
  { id: 'u-6', name: 'Arun R', email: 'arun.r@assetiq.example', organizationId: orgs.county, products: ['TankIQ', 'FlowIQ'], channels: ['In-app', 'Email', 'SMS'] },
  { id: 'u-7', name: 'Platform Support', email: 'platform.support@assetiq.example', organizationId: orgs.city, products: ['CloudIQ', 'LiftIQ'], channels: ['In-app', 'Email'] },
]

export const initialGroups: RecipientGroup[] = [
  { id: 'g-ops', name: 'LiftIQ Operations Team', organizationId: orgs.city, products: ['LiftIQ'], memberIds: ['u-1', 'u-2', 'u-3'], channels: ['In-app', 'Push', 'Email'], enabled: true },
  { id: 'g-maint', name: 'LiftIQ Maintenance Team', organizationId: orgs.city, products: ['LiftIQ'], memberIds: ['u-3', 'u-4'], channels: ['In-app', 'Push', 'SMS'], enabled: true },
  { id: 'g-supervisors', name: 'Site Supervisors', organizationId: orgs.city, products: ['LiftIQ', 'TankIQ'], memberIds: ['u-1', 'u-4'], channels: ['In-app', 'Email'], enabled: true },
  { id: 'g-county', name: 'County Monitoring Team', organizationId: orgs.county, products: ['FlowIQ', 'ReeferIQ', 'TankIQ'], memberIds: ['u-5', 'u-6'], channels: ['In-app', 'Push', 'Email'], enabled: true },
  { id: 'g-platform', name: 'Platform Support', organizationId: orgs.city, products: ['CloudIQ', 'LiftIQ'], memberIds: ['u-7'], channels: ['In-app', 'Email'], enabled: false },
]

export const recipients = people

function thread(
  id: string, product: NotificationThread['event']['sourceApplication'], tenantId: string, assetId: string,
  equipmentId: string | undefined, eventType: string, title: string, severity: NotificationThread['event']['severity'],
  status: NotificationThread['status'], day: number, hour: number, minute: number, occurrences: number,
  summary: string, unread = true, escalated = false,
): NotificationThread {
  const occurredAt = iso(day, hour, minute)
  const lifecycle = `source-${id}`
  const time = occurredAt
  const timeline: NotificationThread['timeline'] = [
    { id: `${id}-created`, time, kind: 'detected', title: 'Notification thread created', description: summary },
  ]
  if (occurrences > 1) timeline.push({ id: `${id}-repeat`, time: iso(day, hour + 1, minute), kind: 'repeat', title: `${occurrences - 1} repeat observations grouped`, description: 'Repeated source observations updated this thread; they did not create separate notifications.' })
  if (status === 'Acknowledged') timeline.push({ id: `${id}-ack`, time: iso(day, hour + 2, minute), kind: 'acknowledged', title: 'Acknowledged by Subashini K', description: 'Notification acknowledgement only. Source equipment state is unchanged.' })
  if (escalated) timeline.push({ id: `${id}-esc`, time: iso(day, hour + 3, minute), kind: 'escalated', title: 'Escalation simulated', description: 'The configured response window elapsed without acknowledgement.' })
  if (status === 'Resolved') timeline.push({ id: `${id}-rec`, time: iso(day, hour + 4, minute), kind: 'recovered', title: 'Recovery evidence received', description: 'The source application reported recovery and closed its lifecycle.' })
  const sourceEvent: NotificationThread['event'] = {
    eventId: `evt-${id}`, sourceApplication: product, tenantId, assetId, equipmentId, eventType,
    sourceLifecycleId: lifecycle, severity, occurredAt, receivedAt: time, correlationKey: `${tenantId}:${assetId}:${lifecycle}`,
    sourceState: status === 'Resolved' ? 'recovered' : 'active',
    sourceReference: `/${product.toLowerCase()}/source-record/${id}`, metadata: { summary },
  }
  const recipientNames = tenantId === orgs.city ? ['Subashini K', 'LiftIQ Operations Team'] : ['Nandhini M', 'County Monitoring Team']
  const deliveryStatus: NotificationThread['deliveries'][number]['status'] = id === 'n-04' ? 'Failed' : id === 'n-03' ? 'Retrying' : 'Provider accepted'
  const channels: NotificationThread['deliveries'] = [
    { id: `del-${id}-1`, time, recipient: recipientNames[0], channel: 'Push', status: deliveryStatus, attempt: id === 'n-04' ? 2 : 1, response: id === 'n-04' ? 'Simulated provider timeout. Retry scheduled.' : 'Simulated provider accepted request; end-user receipt is unverified.', simulated: true },
    { id: `del-${id}-2`, time: iso(day, hour, minute + 2), recipient: recipientNames[1], channel: 'Email', status: 'Provider accepted', attempt: 1, response: 'Simulated provider accepted request; delivery is not confirmed.', simulated: true },
  ]
  return {
    id, event: sourceEvent, title, description: summary, status, firstOccurredAt: time,
    lastObservedAt: occurrences > 1 ? iso(day, hour + 1, minute) : time, occurrences, unread,
    escalated, acknowledgedBy: status === 'Acknowledged' ? 'Subashini K' : undefined,
    lastReminderAt: escalated ? iso(day, hour + 3, minute) : undefined,
    recoveryNote: status === 'Resolved' ? 'Recovery confirmed by source application.' : undefined,
    recipients: recipientNames, timeline, deliveries: channels,
  }
}

const initialThreadFixtures: NotificationThread[] = [
  thread('n-01', 'LiftIQ', orgs.city, 'NOVA_02', 'Pump 1', 'pump.fault', 'Pump 1 fault', 'Critical', 'Active', 16, 8, 14, 12, 'Pump 1 reports a fault state. Repeated observations are grouped in this thread.', true, true),
  thread('n-02', 'LiftIQ', orgs.city, 'NOVA_02', 'Wet well', 'wetwell.level.high', 'Wet well high level', 'High', 'Active', 16, 7, 42, 3, 'Wet well level remains above the configured operating threshold.', true),
  thread('n-03', 'LiftIQ', orgs.city, 'LiftIQ-Asset-001', undefined, 'station.communication.lost', 'Station stopped reporting', 'High', 'Active', 16, 5, 20, 1, 'No recent status report has been received from this station.', false),
  thread('n-04', 'TankIQ', orgs.city, 'TK-204', 'Tank 204', 'tank.level.warning', 'Tank level approaching limit', 'Medium', 'Acknowledged', 15, 16, 5, 2, 'Tank level entered its warning range. Acknowledgement does not alter the source condition.', false),
  thread('n-05', 'FlowIQ', orgs.county, 'FLOW-17', 'Main flow sensor', 'flow.anomaly', 'Abnormal flow condition', 'Medium', 'Resolved', 15, 11, 18, 4, 'Flow deviation returned to the configured normal range.', false),
  thread('n-06', 'LiftIQ', orgs.city, 'NOVA_04', 'Pump 2', 'pump.fault.recovered', 'Pump fault recovery', 'Informational', 'Resolved', 15, 9, 10, 1, 'Source application reported that Pump 2 returned to service.', false),
  thread('n-07', 'LiftIQ', orgs.city, 'NOVA_07', 'Pump 3', 'pump.current.high', 'Pump current above threshold', 'High', 'Acknowledged', 14, 19, 32, 5, 'Pump current exceeded its configured threshold in repeated observations.', false),
  thread('n-08', 'ReeferIQ', orgs.county, 'RF-09', 'Compressor', 'reefer.temperature.high', 'Cold-room temperature high', 'Critical', 'Active', 16, 6, 2, 2, 'Temperature is above the configured safety range.', true, true),
  thread('n-09', 'LiftIQ', orgs.city, 'NOVA_11', undefined, 'station.power.generator', 'Generator fault', 'High', 'Active', 13, 12, 46, 1, 'A generator fault event was reported by the station controller.', false),
  thread('n-10', 'TankIQ', orgs.county, 'TK-018', 'Tank 18', 'tank.level.low', 'Tank level low', 'Low', 'Resolved', 12, 10, 8, 3, 'Tank level recovered after a refill event reported by TankIQ.', false),
  thread('n-11', 'FlowIQ', orgs.city, 'FLOW-02', 'Outlet meter', 'flow.sensor.quality', 'Sensor signal quality degraded', 'Low', 'Active', 16, 4, 50, 1, 'FlowIQ reported intermittent sensor quality for this meter.', true),
  thread('n-12', 'LiftIQ', orgs.county, 'COUNTY-LS-03', 'Pump 1', 'maintenance.reminder', 'Routine maintenance reminder', 'Informational', 'Active', 11, 8, 0, 1, 'A scheduled service date is approaching for this pump.', false),
]

export const initialThreads: NotificationThread[] = initialThreadFixtures.map(item => item.id !== 'n-02' ? item : {
  ...item,
  event: {
    ...item.event,
    eventId: 'liftiq:LC-1042:opened',
    sourceLifecycleId: 'LC-1042',
    sourceReference: buildLiftIQStationUrl('NOVA_02', 'Alarms'),
  },
})

export const initialRules: NotificationRule[] = [
  { id: 'r-1', name: 'Critical pump faults', description: 'Notify operations immediately about active pump faults.', product: 'LiftIQ', category: 'Equipment condition', eventType: 'pump.fault', severity: 'Critical', scope: 'All accessible LiftIQ stations', recipientGroupId: 'g-ops', channels: ['In-app', 'Push', 'Email'], cooldownMinutes: 15, reminderMinutes: 30, maxReminders: 4, escalationMinutes: 20, recoveryNotification: true, enabled: true, updatedAt: iso(15, 15, 20) },
  { id: 'r-2', name: 'Wet well high-level notifications', description: 'Alert operators when the wet well is above limit.', product: 'LiftIQ', category: 'Level condition', eventType: 'wetwell.level.high', severity: 'High', scope: 'Selected stations: NOVA_02, NOVA_04', recipientGroupId: 'g-ops', channels: ['In-app', 'Push'], cooldownMinutes: 20, reminderMinutes: 45, maxReminders: 3, escalationMinutes: 60, recoveryNotification: true, enabled: true, updatedAt: iso(14, 13, 10) },
  { id: 'r-3', name: 'Communication loss', description: 'Route station reporting gaps to the operations team.', product: 'LiftIQ', category: 'Connectivity', eventType: 'station.communication.lost', severity: 'High', scope: 'All accessible LiftIQ stations', recipientGroupId: 'g-ops', channels: ['In-app', 'Email'], cooldownMinutes: 60, reminderMinutes: 120, maxReminders: 2, escalationMinutes: 180, recoveryNotification: false, enabled: true, updatedAt: iso(12, 10, 0) },
  { id: 'r-4', name: 'Tank-level warnings', description: 'Notify monitoring team about tank level changes.', product: 'TankIQ', category: 'Level condition', eventType: 'tank.level.warning', severity: 'Medium', scope: 'All accessible tanks', recipientGroupId: 'g-county', channels: ['In-app', 'Email'], cooldownMinutes: 30, reminderMinutes: 120, maxReminders: 2, escalationMinutes: 240, recoveryNotification: true, enabled: true, updatedAt: iso(10, 9, 20) },
  { id: 'r-5', name: 'High-priority flow conditions', description: 'Notify on high-priority flow anomalies.', product: 'FlowIQ', category: 'Measurement', eventType: 'flow.anomaly', severity: 'High', scope: 'All accessible meters', recipientGroupId: 'g-county', channels: ['In-app', 'Push', 'Email'], cooldownMinutes: 15, reminderMinutes: 60, maxReminders: 3, escalationMinutes: 90, recoveryNotification: true, enabled: false, updatedAt: iso(9, 12, 5) },
  { id: 'r-6', name: 'Maintenance reminders', description: 'Send a digest for upcoming planned maintenance.', product: 'LiftIQ', category: 'Maintenance', eventType: 'maintenance.reminder', severity: 'Informational', scope: 'All accessible LiftIQ stations', recipientGroupId: 'g-maint', channels: ['In-app', 'Email'], cooldownMinutes: 1440, reminderMinutes: 0, maxReminders: 0, escalationMinutes: 0, recoveryNotification: false, enabled: true, updatedAt: iso(8, 11, 42) },
]

export const initialAudit: AuditEntry[] = [
  { id: 'a-1', time: iso(16, 8, 14), actor: 'Notification service (simulated)', organizationId: orgs.city, action: 'Thread updated', target: 'Pump 1 fault · NOVA_02', summary: 'Grouped repeated source observations into an existing notification thread.', before: '11 observations', after: '12 observations' },
  { id: 'a-2', time: iso(15, 15, 20), actor: 'Subashini K', organizationId: orgs.city, action: 'Rule updated', target: 'Critical pump faults', summary: 'Changed escalation timing.', before: 'Escalate after 30 min', after: 'Escalate after 20 min' },
  { id: 'a-3', time: iso(15, 11, 18), actor: 'Subashini K', organizationId: orgs.city, action: 'Notification acknowledged', target: 'Tank level approaching limit · TK-204', summary: 'Acknowledged notification thread. Source alarm state was not changed.' },
  { id: 'a-4', time: iso(14, 14, 40), actor: 'Venky Karuppanan', organizationId: orgs.city, action: 'Recipient group changed', target: 'LiftIQ Operations Team', summary: 'Added Mathavan S to the group.', before: '2 members', after: '3 members' },
  { id: 'a-5', time: iso(13, 9, 16), actor: 'Subashini K', organizationId: orgs.city, action: 'Preferences changed', target: 'Personal preferences', summary: 'Changed quiet hours and preferred time zone.' },
  { id: 'a-6', time: iso(12, 8, 30), actor: 'Tenant administrator', organizationId: orgs.county, action: 'Rule disabled', target: 'High-priority flow conditions', summary: 'Disabled rule pending review.' },
]

export const organizations = [
  { id: orgs.city, name: 'City Water Services' },
  { id: orgs.county, name: 'County Utilities' },
]

export const sourceEventCatalog: Record<string, string[]> = {
  LiftIQ: ['pump.fault', 'wetwell.level.high', 'station.communication.lost', 'pump.current.high', 'maintenance.reminder'],
  TankIQ: ['tank.level.warning', 'tank.level.low'],
  FlowIQ: ['flow.anomaly', 'flow.sensor.quality'],
  ReeferIQ: ['reefer.temperature.high', 'reefer.temperature.recovered'],
  CloudIQ: ['integration.health.degraded'],
}
