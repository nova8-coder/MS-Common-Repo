import test from 'node:test'
import assert from 'node:assert/strict'
import { mapLiftIQEventsToThreads, mergeLiftIQThreads } from '../.test-dist/services/liftiqAdapter.js'
import { simulateAcknowledge } from '../.test-dist/services/mockService.js'

const event = (overrides = {}) => ({
  eventId: 'liftiq:LC-1042:opened', incidentId: 'LC-1042',
  eventType: 'liftiq.alarm.wet_well_high_level.v1', tenantId: 'org-city-water',
  stationId: 'NOVA_02', occurredAt: '2026-10-12T10:04:12', sourceState: 'active',
  severity: 'high', summary: 'Wet well high', observations: [
    { eventId: 'device-1', occurredAt: '2026-10-12T10:04:12', summary: 'Activation received.' },
    { eventId: 'device-2', occurredAt: '2026-10-12T10:08:45', summary: 'Repeat received.' },
  ], ...overrides,
})

test('deduplicates an event envelope and groups unique observations by source lifecycle', () => {
  const duplicate = event({
    summary: 'duplicate payload', observations: [
      { eventId: 'device-1', occurredAt: '2026-10-12T10:04:12', summary: 'Activation received.' },
      { eventId: 'device-2', occurredAt: '2026-10-12T10:08:45', summary: 'Repeat received.' },
      { eventId: 'device-3', occurredAt: '2026-10-12T11:20:16', summary: 'Later repeat.' },
    ],
  })
  const update = event({
    eventId: 'liftiq:LC-1042:update-1', occurredAt: '2026-10-12T11:20:16',
    sourceState: 'acknowledged', summary: 'Lifecycle acknowledged.',
    observations: [
      { eventId: 'device-2', occurredAt: '2026-10-12T10:08:45', summary: 'Duplicate repeat.' },
      { eventId: 'device-3', occurredAt: '2026-10-12T11:20:16', summary: 'Later repeat.' },
    ],
  })
  const [thread] = mapLiftIQEventsToThreads([event(), duplicate, update])
  assert.equal(thread.occurrences, 3)
  assert.equal(thread.timeline.length, 3)
  assert.equal(thread.timeline[0].kind, 'detected')
  assert.equal(thread.timeline[2].kind, 'repeat')
  assert.equal(thread.firstOccurredAt, '2026-10-12T10:04:12')
  assert.equal(thread.lastObservedAt, '2026-10-12T11:20:16')
  assert.equal(thread.event.eventId, 'liftiq:LC-1042:opened')
  assert.equal(thread.event.sourceState, 'acknowledged')
})

test('keeps separate source lifecycles separate and rejects invalid envelopes', () => {
  const other = event({ eventId: 'evt-other', incidentId: 'LC-1043' })
  const invalid = event({ eventId: 'evt-invalid', occurredAt: 'not-a-time' })
  assert.deepEqual(mapLiftIQEventsToThreads([event(), other, invalid, null]).map(item => item.event.sourceLifecycleId), ['LC-1042', 'LC-1043'])
})

test('retains a critical lifecycle when optional observation records are malformed', () => {
  const [thread] = mapLiftIQEventsToThreads([event({
    severity: 'critical', observations: [null, { eventId: '', occurredAt: 'invalid', summary: '' }],
  })])
  assert.equal(thread.event.severity, 'Critical')
  assert.equal(thread.occurrences, 1)
  assert.equal(thread.timeline.length, 1)
})

test('does not collide when separate tenants reuse an event and lifecycle identifier', () => {
  const otherTenant = event({ tenantId: 'org-other', summary: 'Other tenant event.' })
  const threads = mapLiftIQEventsToThreads([event(), otherTenant])
  assert.equal(threads.length, 2)
  assert.deepEqual(new Set(threads.map(thread => thread.event.tenantId)), new Set(['org-city-water', 'org-other']))
})

test('merges fixture details without changing the existing row identity or read state', () => {
  const existing = {
    ...mapLiftIQEventsToThreads([event()])[0], id: 'existing-row', unread: false,
  }
  const [merged] = mergeLiftIQThreads([existing], [event({ observations: [
    { eventId: 'device-1', occurredAt: '2026-10-12T10:04:12', summary: 'Activation received.' },
    { eventId: 'device-2', occurredAt: '2026-10-12T10:08:45', summary: 'Repeat received.' },
    { eventId: 'device-3', occurredAt: '2026-10-12T11:20:16', summary: 'Later repeat.' },
  ] })])
  assert.equal(merged.id, 'existing-row')
  assert.equal(merged.unread, false)
  assert.equal(merged.occurrences, 3)
})

test('notification acknowledgement changes thread workflow state, not source alarm state', () => {
  const source = mapLiftIQEventsToThreads([event()])[0]
  const acknowledged = simulateAcknowledge(source, 'Operator')
  assert.equal(acknowledged.status, 'Acknowledged')
  assert.equal(acknowledged.event.sourceState, 'active')
  assert.equal(source.event.sourceState, 'active')
})
