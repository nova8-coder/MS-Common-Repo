import type { AlarmLifecycle, NotificationItem, Pump } from './model'

const event = (id: string, at: string, kind: 'device' | 'system' | 'user', title: string, detail: string, value?: string, evidence?: string) => ({ id, at, kind, title, detail, value, evidence })

export const station = {
  id: 'NOVA_02',
  location: 'Hosur, Tamil Nadu',
  type: 'Lift Station',
  liquid: 'Waste Water',
  lastReported: '2026-10-13T16:08:22',
  reporting: 'Online' as const,
}

export const pumps: Pump[] = [
  { id: 'P1', name: 'Pump 1', state: 'On', mode: 'Auto', role: 'Lead', runHours: 4.2 },
  { id: 'P2', name: 'Pump 2', state: 'Fault', mode: 'Auto', role: 'Lag', runHours: 0 },
  { id: 'P3', name: 'Pump 3', state: 'On', mode: 'Auto', role: 'Lag-Lag', runHours: 3.8 },
]

export const HL_RULE = 'High Level: activation at or above 70 in, normalization at or below 68 in (illustrative thresholds).'

export const initialAlarms: AlarmLifecycle[] = [
  {
    id: 'LC-1042',
    name: 'High Level',
    component: 'Wet Well',
    severity: 'High',
    status: 'Active',
    station: 'NOVA_02',
    startedAt: '2026-10-12T10:04:12',
    lastObservedAt: '2026-10-12T12:16:19',
    repeatCount: 2,
    source: 'Device alarm',
    rule: HL_RULE,
    unread: true,
    recoveryEvidence: {
      at: '2026-10-12T12:16:19',
      summary: 'Status Report received. Supplied screen shows 71.1 in; normalization threshold is 68.0 in.',
      supportingTimestamp: '2026-10-12T12:16:19',
      reliable: true,
    },
    events: [
      event('e-1042-1', '2026-10-12T10:04:12', 'device', 'Alarm Generated (Device)', 'Wet well level reached 70.2 in (threshold: 70 in).', '70.2 in (threshold: 70 in)'),
      event('e-1042-2', '2026-10-12T10:08:45', 'device', 'Repeat Alarm (Device)', 'Wet well level still above 70 in (71.4 in).', '71.4 in'),
      event('e-1042-3', '2026-10-12T11:20:16', 'device', 'Repeat Alarm (Device)', 'Wet well level 71.8 in.', '71.8 in'),
    ],
  },
  {
    id: 'LC-1041',
    name: 'Low Level',
    component: 'Wet Well',
    severity: 'Medium',
    status: 'Completed',
    station: 'NOVA_02',
    startedAt: '2026-10-11T20:18:00',
    lastObservedAt: '2026-10-11T21:42:00',
    resolvedAt: '2026-10-11T21:42:00',
    resolution: 'Auto (Status)',
    repeatCount: 0,
    source: 'Device alarm',
    rule: 'Low Level uses configured threshold (activation 12 in, normalization 16 in).',
    unread: false,
    events: [
      event('e-1041-1', '2026-10-11T20:18:00', 'device', 'Alarm Generated (Device)', 'Low level activation received (11.6 in).', '11.6 in'),
      event('e-1041-2', '2026-10-11T21:42:00', 'system', 'Normalization Evidence', 'Status Report shows level back within normal range (18.4 in).', '18.4 in'),
    ],
  },
  {
    id: 'LC-1040',
    name: 'Pump 1 Fault',
    component: 'Pump 1',
    severity: 'High',
    status: 'Completed',
    station: 'NOVA_02',
    startedAt: '2026-10-10T14:34:00',
    lastObservedAt: '2026-10-10T15:22:00',
    resolvedAt: '2026-10-10T15:22:00',
    resolution: 'Device',
    repeatCount: 0,
    source: 'Device alarm',
    rule: 'Pump fault recovery follows device clear notification.',
    unread: false,
    events: [
      event('e-1040-1', '2026-10-10T14:34:00', 'device', 'Alarm Generated (Device)', 'Pump 1 fault reported by telemetry.', 'Fault state active'),
      event('e-1040-2', '2026-10-10T15:22:00', 'device', 'Device Clear', 'Pump 1 fault clear message received from device.', 'Fault cleared'),
    ],
  },
  {
    id: 'LC-1039',
    name: 'High Level',
    component: 'Wet Well',
    severity: 'High',
    status: 'Completed',
    station: 'NOVA_02',
    startedAt: '2026-10-09T11:16:00',
    lastObservedAt: '2026-10-09T11:52:00',
    resolvedAt: '2026-10-09T11:52:00',
    resolution: 'Auto (Status)',
    repeatCount: 0,
    source: 'Device alarm',
    rule: HL_RULE,
    unread: false,
    events: [
      event('e-1039-1', '2026-10-09T11:16:00', 'device', 'Alarm Generated (Device)', 'Wet well level reached 70.6 in.', '70.6 in'),
      event('e-1039-2', '2026-10-09T11:52:00', 'system', 'Normalization Evidence', 'Status Report shows level normal (64.2 in).', '64.2 in'),
    ],
  },
  {
    id: 'LC-1038',
    name: 'Pump 2 Current Low',
    component: 'Pump 2',
    severity: 'Medium',
    status: 'Stale',
    station: 'NOVA_02',
    startedAt: '2026-10-08T06:20:00',
    lastObservedAt: '2026-10-08T08:05:00',
    repeatCount: 0,
    source: 'Device alarm',
    rule: 'Reporting timeout expired. Condition unconfirmed.',
    unread: false,
    events: [
      event('e-1038-1', '2026-10-08T06:20:00', 'device', 'Alarm Generated (Device)', 'Pump 2 current below lower threshold.', '4.1 A'),
      event('e-1038-2', '2026-10-08T14:05:00', 'system', 'Marked Stale', 'No report received within 6 hours timeout window.'),
    ],
  },
  {
    id: 'LC-1037',
    name: 'High Level',
    component: 'Wet Well',
    severity: 'High',
    status: 'Completed',
    station: 'NOVA_02',
    startedAt: '2026-10-07T21:42:00',
    lastObservedAt: '2026-10-07T22:04:00',
    resolvedAt: '2026-10-07T22:04:00',
    resolution: 'Manual',
    repeatCount: 0,
    source: 'Device alarm',
    rule: HL_RULE,
    unread: false,
    events: [
      event('e-1037-1', '2026-10-07T21:42:00', 'device', 'Alarm Generated (Device)', 'Wet well level reached 72.5 in.', '72.5 in'),
      event('e-1037-2', '2026-10-07T22:04:00', 'user', 'Manually Completed', 'Level returned to normal per Status Report reviewed by Venky Karuppanan.', '63.0 in'),
    ],
  },
  {
    id: 'LC-1036',
    name: 'Generator Fault',
    component: 'Generator',
    severity: 'High',
    status: 'Completed',
    station: 'NOVA_02',
    startedAt: '2026-10-06T16:18:00',
    lastObservedAt: '2026-10-06T20:10:00',
    resolvedAt: '2026-10-06T20:10:00',
    resolution: 'Device',
    repeatCount: 0,
    source: 'Device alarm',
    rule: 'Generator fault clear message confirmed from controller.',
    unread: false,
    events: [
      event('e-1036-1', '2026-10-06T16:18:00', 'device', 'Alarm Generated (Device)', 'Generator fault alarm triggered.', 'Overheat / low pressure'),
      event('e-1036-2', '2026-10-06T20:10:00', 'device', 'Device Clear', 'Generator controller reported normal status.', 'Normal'),
    ],
  },
  {
    id: 'LC-1035',
    name: 'High Level',
    component: 'Wet Well',
    severity: 'Medium',
    status: 'Completed',
    station: 'NOVA_02',
    startedAt: '2026-10-05T10:04:00',
    lastObservedAt: '2026-10-05T11:22:00',
    resolvedAt: '2026-10-05T11:22:00',
    resolution: 'Auto (Status)',
    repeatCount: 0,
    source: 'Device alarm',
    rule: HL_RULE,
    unread: false,
    events: [
      event('e-1035-1', '2026-10-05T10:04:00', 'device', 'Alarm Generated (Device)', 'Wet well level reached 70.8 in.', '70.8 in'),
      event('e-1035-2', '2026-10-05T11:22:00', 'system', 'Normalization Evidence', 'Status Report indicates 62.4 in.', '62.4 in'),
    ],
  },
  {
    id: 'LC-1034',
    name: 'Low Level',
    component: 'Wet Well',
    severity: 'Medium',
    status: 'Completed',
    station: 'NOVA_02',
    startedAt: '2026-10-04T01:28:00',
    lastObservedAt: '2026-10-04T01:50:00',
    resolvedAt: '2026-10-04T01:50:00',
    resolution: 'Auto (Status)',
    repeatCount: 0,
    source: 'Device alarm',
    rule: 'Low Level normalization condition met.',
    unread: false,
    events: [
      event('e-1034-1', '2026-10-04T01:28:00', 'device', 'Alarm Generated (Device)', 'Low level threshold breached (11.8 in).', '11.8 in'),
      event('e-1034-2', '2026-10-04T01:50:00', 'system', 'Normalization Evidence', 'Status Report level normalized to 17.5 in.', '17.5 in'),
    ],
  },
  {
    id: 'LC-1032',
    name: 'Pump 3 OOS',
    component: 'Pump 3',
    severity: 'Low',
    status: 'Completed',
    station: 'NOVA_02',
    startedAt: '2026-10-02T20:14:00',
    lastObservedAt: '2026-10-03T01:20:00',
    resolvedAt: '2026-10-03T01:20:00',
    resolution: 'Device',
    repeatCount: 0,
    source: 'Device alarm',
    rule: 'Out of service condition cleared.',
    unread: false,
    events: [
      event('e-1032-1', '2026-10-02T20:14:00', 'device', 'Alarm Generated (Device)', 'Pump 3 placed out of service switch.', 'OOS active'),
      event('e-1032-2', '2026-10-03T01:20:00', 'device', 'Device Clear', 'Pump 3 restored to automatic service.', 'In service'),
    ],
  },
]

export interface StationRecord {
  n: string
  t: string | null
  rs: string
  lv: number | null
  al: number
  dots: string
  p: Array<{ mode: 'A' | 'H' | 'O' | null; maint: 'ok' | 'soon' | 'overdue'; run: 'on' | 'off' | 'fault' | null } | null>
  cur: Array<number | null>
  hrs: Array<number | null>
  alt: boolean | null
  flag: boolean
  org: number
  acct: number
  grp: number
}

const P = (mode: 'A' | 'H' | 'O' | null, maint: 'ok' | 'soon' | 'overdue', run: 'on' | 'off' | 'fault' | null) => ({ mode, maint, run })
const N = null
const A3 = [P('A', 'ok', 'on'), P('A', 'ok', 'on'), P('A', 'ok', 'on')]

export const allStations: StationRecord[] = [
  { n: 'NOVA_02', t: '2026-10-13T16:08', rs: 'Scheduled Message', lv: 4.0, al: 1, dots: 'r', p: [P('A', 'ok', 'on'), P('A', 'ok', 'fault'), P('A', 'ok', 'on')], cur: [20, 0, 19.8], hrs: [200, 214, 198], alt: true, flag: false, org: 1, acct: 0, grp: 0 },
  { n: '01609327SKYF268', t: '2026-10-13T15:55', rs: 'Scheduled Message', lv: 4.0, al: 0, dots: '', p: A3, cur: [20, 22, 20], hrs: [200, 214, 198], alt: true, flag: true, org: 0, acct: 0, grp: 0 },
  { n: 'NOVA_TEST', t: '2026-10-12T16:46', rs: 'Scheduled Message', lv: 4.0, al: 0, dots: '', p: [P('O', 'ok', 'fault'), P('O', 'ok', 'on'), P('A', 'ok', 'on')], cur: [20, 22, 20], hrs: [200, 214, 198], alt: false, flag: true, org: 1, acct: 1, grp: 2 },
  { n: 'NOVA02', t: '2026-10-12T13:07', rs: 'Scheduled Message', lv: 30.59, al: 0, dots: '', p: [P('A', 'ok', 'off'), P('A', 'ok', 'off'), P('A', 'overdue', 'off')], cur: [0.02, 0, 0], hrs: [79, 82, 61], alt: true, flag: false, org: 1, acct: 1, grp: 0 },
  { n: 'NOVA_LiftIQ_01', t: '2026-10-11T04:45', rs: 'HIGH LEVEL ALARM', lv: 41.44, al: 0, dots: 'g', p: [N, N, N], cur: [N, N, N], hrs: [N, N, N], alt: null, flag: false, org: 0, acct: 0, grp: 2 },
  { n: 'LiftIQ-Asset-001', t: '2026-10-10T20:29', rs: 'PUMP 2 ON', lv: 4.26, al: 2, dots: 'rr', p: [P('A', 'ok', 'off'), P('A', 'ok', 'on'), P('A', 'overdue', 'off')], cur: [N, 15.71, N], hrs: [N, N, N], alt: true, flag: true, org: 0, acct: 0, grp: 0 },
  { n: 'OCT_11_NP_LIQ-1', t: '2026-10-08T18:50', rs: 'Scheduled Message', lv: 116.91, al: 0, dots: '', p: [P('A', 'ok', 'off'), P('A', 'ok', 'off'), P('A', 'overdue', 'off')], cur: [5.27, 4.25, 22], hrs: [10, 12, 0], alt: false, flag: true, org: 0, acct: 2, grp: 1 },
  { n: 'NOVA_LIFTIQ_01', t: '2026-10-07T16:16', rs: 'Scheduled Message', lv: 4.0, al: 0, dots: '', p: [P('A', 'ok', 'off'), P('A', 'ok', 'off'), P('A', 'overdue', 'off')], cur: [20, 22, 20], hrs: [0, 0, 0], alt: true, flag: true, org: 1, acct: 1, grp: 1 },
  { n: 'NOVA03', t: '2026-10-07T15:15', rs: 'Scheduled Message', lv: 4.0, al: 0, dots: 'g', p: [P('A', 'ok', 'on'), P('A', 'ok', 'off'), P('A', 'ok', 'on')], cur: [20, 22, 20], hrs: [0, 0, 0], alt: true, flag: false, org: 1, acct: 1, grp: 1 },
  { n: 'NOVA01', t: '2026-10-07T13:29', rs: 'HIGH LEVEL ALARM CLEARED', lv: 120.0, al: 0, dots: 'g', p: [P('H', 'ok', 'on'), P('A', 'ok', 'on'), N], cur: [N, N, N], hrs: [N, N, N], alt: null, flag: false, org: 0, acct: 0, grp: 0 },
  { n: 'OCT_10_LIQ_WP-1', t: '2026-10-06T12:46', rs: 'LOW LEVEL ALARM CLEARED', lv: 41.44, al: 0, dots: 'g', p: [N, N, N], cur: [N, N, N], hrs: [N, N, N], alt: null, flag: true, org: 0, acct: 2, grp: 1 },
  { n: 'OCT_10_LIQ_WP-1_ORG', t: '2026-10-06T12:45', rs: 'HIGH LEVEL ALARM CLEARED', lv: 41.44, al: 0, dots: 'g', p: [N, N, N], cur: [N, N, N], hrs: [N, N, N], alt: null, flag: true, org: 0, acct: 2, grp: 1 },
  { n: 'OCT_10_LIQ_WP-0', t: '2026-10-06T12:41', rs: 'HIGH LEVEL ALARM', lv: 41.44, al: 0, dots: 'g', p: [P('A', 'overdue', 'off'), P('A', 'overdue', 'off'), P('A', 'overdue', 'off')], cur: [N, N, N], hrs: [N, N, N], alt: true, flag: true, org: 0, acct: 2, grp: 1 },
  { n: 'NOVA_01', t: '2026-10-01T22:30', rs: 'System Configuration Message', lv: null, al: 0, dots: '', p: [N, N, N], cur: [N, N, N], hrs: [N, N, N], alt: null, flag: false, org: 1, acct: 0, grp: 2 },
  { n: 'NOVA_LiftIQ_02', t: '2026-10-01T12:59', rs: '-', lv: 653.54, al: 0, dots: '', p: [P('O', 'overdue', 'off'), P('A', 'ok', 'off'), P(null, 'ok', 'on')], cur: [10.27, 12.85, 16.4], hrs: [3182, 2940, 1210], alt: true, flag: false, org: 1, acct: 0, grp: 0 },
  { n: 'Liftiq-1', t: '2026-09-29T04:41', rs: 'PUMP 1 FAULT ALARM CLEARED', lv: null, al: 0, dots: 'gg', p: [N, N, N], cur: [N, N, N], hrs: [N, N, N], alt: null, flag: true, org: 0, acct: 0, grp: 2 },
  { n: 'TEST-ASSET', t: '2023-01-31T04:39', rs: 'HIGH LEVEL ALARM', lv: 41.44, al: 0, dots: 'g', p: [P('A', 'ok', 'off'), P('A', 'ok', 'off'), N], cur: [N, N, N], hrs: [N, N, N], alt: null, flag: false, org: 0, acct: 0, grp: 2 },
  { n: 'NOVA_Test_1', t: null, rs: '-', lv: null, al: 0, dots: '', p: [N, N, N], cur: [N, N, N], hrs: [N, N, N], alt: null, flag: true, org: 1, acct: 1, grp: 2 },
  { n: 'A25_LIQ_RC-0', t: null, rs: '-', lv: null, al: 0, dots: '', p: [N, N, N], cur: [N, N, N], hrs: [N, N, N], alt: null, flag: true, org: 0, acct: 1, grp: 2 },
  { n: 'HOSUR_WP_04', t: '2026-10-14T09:12', rs: 'Scheduled Message', lv: 18.2, al: 0, dots: '', p: [P('A', 'soon', 'on'), P('A', 'ok', 'off'), N], cur: [14.8, 0, N], hrs: [1264, 1190, N], alt: true, flag: false, org: 1, acct: 1, grp: 0 },
  { n: 'BLR_LIFT_12', t: '2026-10-14T06:30', rs: 'Scheduled Message', lv: 22.75, al: 0, dots: '', p: [P('A', 'ok', 'on'), P('H', 'soon', 'fault'), P('A', 'ok', 'off')], cur: [16.2, 0, 0], hrs: [842, 912, 455], alt: false, flag: false, org: 0, acct: 2, grp: 1 },
  { n: 'NOVA_STN_07', t: '2026-10-13T11:20', rs: 'Scheduled Message', lv: 6.1, al: 0, dots: '', p: [P('A', 'soon', 'on'), P('A', 'soon', 'on'), P('A', 'ok', 'fault')], cur: [19.5, 20.1, 0], hrs: [2210, 2175, 1980], alt: true, flag: false, org: 1, acct: 2, grp: 0 },
  { n: 'CHN_WP_21', t: '2026-10-12T08:05', rs: 'Scheduled Message', lv: 9.8, al: 0, dots: '', p: [P('H', 'ok', 'off'), P('O', 'ok', 'off'), N], cur: [0, 0, N], hrs: [530, 498, N], alt: false, flag: false, org: 0, acct: 1, grp: 1 },
]

export const ORGS = ['All Organizations', 'AssetIQ Demo', 'Nova Water Works']
export const ACCTS = ['All Accounts', 'Chennai Ops', 'Hosur Ops', 'Bengaluru Ops']
export const GRPS = ['All Asset Groups', 'Zone A', 'Zone B', 'Test Assets']

export const initialNotifications: NotificationItem[] = [
  { id: 'NT-101', type: 'Asset change', title: 'Asset owner changed', message: 'NOVA_02 ownership moved from Operations South to Water Services Group.', asset: 'NOVA_02', at: '2026-10-15T08:35:00', unread: false, delivery: [{ channel: 'Email', status: 'Delivered', at: '2026-10-15T08:35:01' }] },
  { id: 'NT-102', type: 'Maintenance', title: 'Pump 1 maintenance due soon', message: 'Routine service is scheduled in five days.', asset: 'NOVA_02 · Pump 1', at: '2026-10-15T08:10:00', unread: false },
  { id: 'NT-103', type: 'System', title: 'User access changed', message: 'An Operator role was assigned for the NOVA_02 station group.', asset: 'Station access', at: '2026-10-14T16:05:00', unread: false, delivery: [{ channel: 'Email', status: 'Queued', at: '2026-10-14T16:05:01' }] },
  { id: 'NT-104', type: 'Asset change', title: 'Asset details updated', message: 'Service contact and station notes were updated on LiftIQ-Asset-001.', asset: 'LiftIQ-Asset-001', at: '2026-10-13T11:20:00', unread: false },
  { id: 'NT-105', type: 'Maintenance', title: 'Maintenance completed', message: 'Inspection for NOVA_02 Pump 2 was marked complete.', asset: 'NOVA_02 · Pump 2', at: '2026-10-12T14:15:00', unread: false, delivery: [{ channel: 'Email', status: 'Delivered', at: '2026-10-12T14:15:02' }] },
  { id: 'NT-106', type: 'Alarm', title: 'High Water Level · repeat', message: 'Repeat alarm within the same unresolved lifecycle (LC-1042). Web push failed.', asset: 'NOVA_02 · Wet Well', at: '2026-10-12T12:16:19', unread: true, lifecycleId: 'LC-1042', delivery: [{ channel: 'Web Push', status: 'Failed', at: '2026-10-12T12:16:20' }] },
  { id: 'NT-107', type: 'Alarm', title: 'Pump 1 Fault', message: 'Pump 1 reported a fault state (LC-1040).', asset: 'NOVA_02 · Pump 1', at: '2026-10-10T14:34:00', unread: true, lifecycleId: 'LC-1040', delivery: [{ channel: 'Web Push', status: 'Delivered', at: '2026-10-10T14:34:02' }] },
]

export const subscriptionCategories = [
  { id: 'wet', name: 'Wet Well Alerts', events: ['Wet Well Level is Low', 'Wet Well Level is High', 'High Level Float Reached', 'Low Level Float Reached', 'Station Flow Alarm is Occurred'] },
  { id: 'pump', name: 'Pump Alerts', events: ['Pump Fault', 'Pump Current Alert'] },
  { id: 'power', name: 'Station Power Alerts', events: ['Station Power Loss', 'Generator Fault'] },
  { id: 'oos', name: 'Out of Service Alerts', events: ['Out of Service'] },
  { id: 'sensor', name: 'Analog/Digital Sensor Alerts', events: ['Configured Sensor Alarm', 'Sensor State Changed'] },
  { id: 'asset', name: 'Asset Changes', events: ['Asset Owner Changed', 'Asset Details Updated'] },
  { id: 'maintenance', name: 'Maintenance Notifications', events: ['Maintenance Due', 'Maintenance Completed'] },
  { id: 'system', name: 'System Notifications', events: ['User Access Changed', 'System Configuration Updated'] },
]

export const initialPreferences = Object.fromEntries(subscriptionCategories.map(c => [c.id, { email: false, push: true, sms: false, recovery: true }])) as Record<string, { email: boolean; push: boolean; sms: boolean; recovery: boolean }>

export interface MaintenanceEvent {
  type: string
  scheduled: string
  maintained: string
  status: 'Completed' | 'Upcoming' | 'Future'
  difference: string
  notes: string
  dueDays?: number
}

export const pumpMaintenanceData: Record<number, MaintenanceEvent[]> = {
  0: [
    { type: 'Routine Service', scheduled: '2026-10-17', maintained: '', status: 'Upcoming', difference: 'Due in 5 days', notes: 'Periodic service and cleaning of pump components.' },
    { type: 'Inspection', scheduled: '2026-07-10', maintained: '2026-07-10', status: 'Completed', difference: '5 days before due', notes: 'Inspection and condition check' },
    { type: 'Routine Service', scheduled: '2026-05-02', maintained: '2026-04-12', status: 'Completed', difference: '20 days before due', notes: 'Cleaning, impeller check' },
    { type: 'Initial Commissioning', scheduled: '2024-01-12', maintained: '2024-01-12', status: 'Completed', difference: '-', notes: 'Installation and initial setup' },
    { type: 'Inspection', scheduled: '2027-04-22', maintained: '', status: 'Future', difference: 'Upcoming', notes: 'Inspection' },
  ],
  1: [
    { type: 'Routine Service', scheduled: '2026-10-30', maintained: '', status: 'Upcoming', difference: 'Due in 18 days', notes: 'Periodic service and cleaning' },
    { type: 'Inspection', scheduled: '2026-07-10', maintained: '2026-07-12', status: 'Completed', difference: '2 days after due', notes: 'Inspection and condition check' },
    { type: 'Routine Service', scheduled: '2026-05-02', maintained: '2026-05-02', status: 'Completed', difference: 'On due date', notes: 'Cleaning, impeller check' },
    { type: 'Initial Commissioning', scheduled: '2024-01-12', maintained: '2024-01-12', status: 'Completed', difference: '-', notes: 'Installation and initial setup' },
  ],
  2: [
    { type: 'Routine Service', scheduled: '2026-10-10', maintained: '', status: 'Upcoming', difference: 'Due in 5 days', notes: 'Periodic service and cleaning' },
    { type: 'Routine Service', scheduled: '2026-04-10', maintained: '2026-04-10', status: 'Completed', difference: 'On due date', notes: 'Cleaning, impeller check' },
    { type: 'Initial Commissioning', scheduled: '2024-03-01', maintained: '2024-03-01', status: 'Completed', difference: '-', notes: 'Installation and initial setup' },
    { type: 'Inspection', scheduled: '2027-04-10', maintained: '', status: 'Future', difference: 'Upcoming', notes: 'Inspection' },
  ],
}

export const maintenance = pumpMaintenanceData[0]

export interface PumpHealthData {
  peak: number
  current: number
  dev: string
  hours: number
  total: string
  series: number[]
}

export const pumpHealthStats: Record<number, PumpHealthData> = {
  0: { peak: 520, current: 480, dev: '-8%', hours: 4.2, total: '2,016', series: [410, 380, 430, 375, 380, 400, 440, 395, 400, 370, 425, 415, 450] },
  1: { peak: 465, current: 421, dev: '-9%', hours: 3.8, total: '1,684', series: [352, 376, 388, 360, 402, 390, 411, 384, 416, 396, 405, 410, 421] },
  2: { peak: 410, current: 386, dev: '-6%', hours: 2.9, total: '1,328', series: [320, 344, 350, 332, 361, 370, 352, 378, 369, 380, 371, 394, 386] },
}

export const capacitySeries = pumpHealthStats[0].series

export const rawMessages = [
  { t: '2026-10-13T16:08:22', rs: 'Scheduled Message', lv: 4.0, al: '[1]', p1: { a: 20, h: 200 }, p2: { a: 0, h: 214 }, p3: { a: 19.8, h: 198 } },
  { t: '2026-10-13T15:08:22', rs: 'Scheduled Message', lv: 3.95, al: '[1]', p1: { a: 20.2, h: 199.2 }, p2: { a: 0, h: 214 }, p3: { a: 20.1, h: 197.1 } },
  { t: '2026-10-13T14:08:22', rs: 'Scheduled Message', lv: 4.1, al: '[1]', p1: { a: 20.1, h: 198.4 }, p2: { a: 0, h: 214 }, p3: { a: 19.9, h: 196.3 } },
  { t: '2026-10-13T13:08:22', rs: 'Scheduled Message', lv: 4.05, al: '[1]', p1: { a: 19.9, h: 197.6 }, p2: { a: 0, h: 214 }, p3: { a: 20.0, h: 195.5 } },
  { t: '2026-10-13T12:08:22', rs: 'Scheduled Message', lv: 3.98, al: '[1]', p1: { a: 20.0, h: 196.8 }, p2: { a: 0, h: 214 }, p3: { a: 19.8, h: 194.7 } },
]

// Sampled values already shown by the station Totalizer chart. Unlisted dates
// represent missing samples; they are not treated as zero-output readings.
export const totalizerReadings = [
  { day: 6, gallons: 300 },
  { day: 7, gallons: 12300 },
  { day: 9, gallons: 1500 },
  { day: 12, gallons: 8300 },
  { day: 13, gallons: 4600 },
]
