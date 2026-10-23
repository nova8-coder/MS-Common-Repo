import test from 'node:test'
import assert from 'node:assert/strict'
import { processLiftIQIntake } from '../.test-dist/services/eventIntelligence.js'

const event = (overrides = {}) => ({
  eventId: 'evt-1', incidentId: 'LC-1', eventType: 'liftiq.alarm.pump_fault.v1',
  tenantId: 'tenant-a', stationId: 'ST-1', occurredAt: '2026-10-12T10:00:00',
  sourceState: 'active', severity: 'high', summary: 'Pump fault.',
  observations: [{ eventId: 'obs-1', occurredAt: '2026-10-12T10:00:00', summary: 'Pump fault.', sourceState: 'active' }],
  ...overrides,
})

test('accepts first observation and groups later stable observations while retaining each row', () => {
  const result = processLiftIQIntake([event({ observations: [
    { eventId: 'obs-1', occurredAt: '2026-10-12T10:00:00', summary: 'Activated.', sourceState: 'active' },
    { eventId: 'obs-2', occurredAt: '2026-10-12T10:04:00', summary: 'Repeated.', sourceState: 'active' },
  ] })], Date.parse('2026-10-12T10:10:00'))
  assert.deepEqual(result.observations.map(item => item.disposition), ['Accepted', 'Grouped'])
  assert.equal(result.assessments[0].uniqueObservations, 2)
  assert.equal(result.observations.length, 2)
})

test('reports stable duplicate IDs without discarding duplicate history rows', () => {
  const original = event({ observations: [
    { eventId: 'obs-1', occurredAt: '2026-10-12T10:00:00', summary: 'Activated.' },
    { eventId: 'obs-2', occurredAt: '2026-10-12T10:04:00', summary: 'Repeated.' },
  ] })
  const duplicateEnvelope = { ...original, eventId: 'evt-2' }
  const result = processLiftIQIntake([original, duplicateEnvelope], Date.parse('2026-10-12T10:10:00'))
  assert.deepEqual(result.observations.map(item => item.disposition), ['Accepted', 'Grouped', 'Duplicate', 'Duplicate'])
  assert.equal(result.assessments[0].duplicateObservations, 2)
  assert.equal(result.observations.length, 4)
})

test('classifies persistence only from active lifecycle state and a reliable start time', () => {
  const persistent = processLiftIQIntake([event()], Date.parse('2026-10-12T10:31:00'))
  const short = processLiftIQIntake([event()], Date.parse('2026-10-12T10:29:00'))
  const recovered = processLiftIQIntake([event({ sourceState: 'recovered' })], Date.parse('2026-10-12T11:00:00'))
  assert.ok(persistent.assessments[0].findings.includes('Persistent active alarm'))
  assert.ok(!short.assessments[0].findings.includes('Persistent active alarm'))
  assert.ok(!recovered.assessments[0].findings.includes('Persistent active alarm'))
})

test('detects a potential flap only from four explicit alternating transitions in a 15-minute window', () => {
  const states = ['active', 'recovered', 'active', 'recovered', 'active']
  const observations = states.map((sourceState, index) => ({
    eventId: `obs-${index}`, occurredAt: `2026-10-12T10:${String(index * 2).padStart(2, '0')}:00`,
    summary: `State ${sourceState}`, sourceState,
  }))
  const result = processLiftIQIntake([event({ occurredAt: '2026-10-12T10:08:00', sourceState: 'active', observations })], Date.parse('2026-10-12T10:09:00'))
  assert.ok(result.assessments[0].findings.includes('Potentially flapping'))
  assert.match(result.assessments[0].evidence.join(' '), /pattern classification/)
  const noStates = processLiftIQIntake([event({ observations: observations.map(({ sourceState, ...rest }) => rest) })], Date.parse('2026-10-12T10:09:00'))
  assert.ok(!noStates.assessments[0].findings.includes('Potentially flapping'))
})

test('rejects malformed envelope without matching unrelated events by summary text', () => {
  const sameText = event({ eventId: 'evt-2', incidentId: 'LC-2', observations: [{ eventId: 'obs-other', occurredAt: '2026-10-12T10:00:00', summary: 'Pump fault.' }] })
  const result = processLiftIQIntake([event(), sameText, { ...event(), occurredAt: 'not-a-time' }], Date.parse('2026-10-12T10:01:00'))
  assert.equal(result.observations.at(-1).disposition, 'Rejected')
  assert.equal(result.assessments.length, 2)
})
