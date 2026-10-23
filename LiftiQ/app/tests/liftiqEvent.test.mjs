import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLiftIQStationUrl,
  buildNotificationThreadUrl,
  LIFTIQ_EVENT_TYPES,
  mapAlarmToLiftIQEvent,
  mapAlarmsToLiftIQEvents,
} from '../.test-dist/integrations/notifications/liftiqEvent.js'

const alarm = (overrides = {}) => ({
  id: 'LC-1042', name: 'High Level', component: 'Wet Well', severity: 'High',
  status: 'Active', station: 'NOVA_02', startedAt: '2026-10-12T10:04:12',
  lastObservedAt: '2026-10-12T12:16:19', repeatCount: 2, source: 'Device alarm',
  rule: 'High level', events: [{ id: 'e-1', at: '2026-10-12T10:04:12', kind: 'device', title: 'Alarm Generated', detail: 'Wet well level reached 70.2 in.' }],
  unread: true, ...overrides,
})

test('maps an active supported alarm to a stable versioned event and station URL', () => {
  const mapped = mapAlarmToLiftIQEvent(alarm())
  assert.equal(mapped.eventId, 'liftiq:LC-1042:opened')
  assert.equal(mapped.incidentId, 'LC-1042')
  assert.equal(mapped.eventType, LIFTIQ_EVENT_TYPES.wetWellHighLevel)
  assert.equal(mapped.tenantId, 'org-city-water')
  assert.equal(mapped.stationId, 'NOVA_02')
  assert.equal(mapped.occurredAt, '2026-10-12T10:04:12')
  assert.equal(mapped.sourceState, 'active')
  assert.equal(mapped.observations.length, 1)
  assert.deepEqual(new URL(mapped.detailsUrl).searchParams.get('station'), 'NOVA_02')
  assert.deepEqual(new URL(mapped.detailsUrl).searchParams.get('tab'), 'Alarms')
})

test('does not export completed lifecycle records or unsupported communication states', () => {
  assert.equal(mapAlarmToLiftIQEvent(alarm({ status: 'Completed' })), null)
  assert.equal(mapAlarmToLiftIQEvent(alarm({ name: 'Communication Lost', component: 'Station' })), null)
})

test('repeated records for one lifecycle keep one stable event ID', () => {
  const first = alarm()
  const repeatedObservation = {
    ...first, lastObservedAt: '2026-10-12T12:16:19', repeatCount: 3,
    events: [...first.events, { id: 'e-2', at: '2026-10-12T10:08:45', kind: 'device', title: 'Repeat', detail: 'Still high.' }],
  }
  const mapped = mapAlarmsToLiftIQEvents([first, repeatedObservation])
  assert.equal(mapped.length, 1)
  assert.equal(mapped[0].eventId, 'liftiq:LC-1042:opened')
  assert.deepEqual(mapped[0].observations.map(item => item.eventId), ['e-1', 'e-2'])
})

test('preserves device repeat history and reports source acknowledgement separately', () => {
  const mapped = mapAlarmToLiftIQEvent(alarm({
    status: 'Acknowledged',
    events: [
      { id: 'e-1', at: '2026-10-12T10:04:12', kind: 'device', title: 'Activated', detail: 'Level high.' },
      { id: 'e-2', at: '2026-10-12T10:08:45', kind: 'device', title: 'Repeat', detail: 'Still high.' },
      { id: 'ack-1', at: '2026-10-12T10:10:00', kind: 'user', title: 'Acknowledged', detail: 'Operator acknowledgement.' },
    ],
  }))
  assert.equal(mapped.sourceState, 'acknowledged')
  assert.deepEqual(mapped.observations.map(item => item.eventId), ['e-1', 'e-2'])
})

test('builds a routable notification inbox URL', () => {
  const url = new URL(buildLiftIQStationUrl('NOVA_02', 'Alarms'))
  assert.equal(url.origin, 'http://localhost:5173')
  assert.equal(url.searchParams.get('station'), 'NOVA_02')
  assert.equal(url.searchParams.get('tab'), 'Alarms')
})

test('builds a contextual notifications link with lifecycle and tenant identifiers', () => {
  const url = new URL(buildNotificationThreadUrl({ tenantId: 'org-city-water', incidentId: 'LC-1042' }))
  assert.equal(url.origin, 'http://localhost:5174')
  assert.equal(url.pathname, '/inbox')
  assert.equal(url.searchParams.get('source'), 'LiftIQ')
  assert.equal(url.searchParams.get('tenantId'), 'org-city-water')
  assert.equal(url.searchParams.get('lifecycleId'), 'LC-1042')
})
