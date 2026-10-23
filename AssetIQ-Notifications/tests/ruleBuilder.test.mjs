import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNotificationRule, summarizeNotificationRule } from '../.test-dist/services/ruleBuilder.js'

const base = {
  id: 'base', name: 'Base', description: '', product: 'LiftIQ', category: 'condition', eventType: 'pump.fault',
  severity: 'Critical', scope: 'All assets', recipientGroupId: 'g-ops', channels: ['In-app'], cooldownMinutes: 10,
  reminderMinutes: 0, maxReminders: 0, escalationMinutes: 0, recoveryNotification: false, enabled: true, updatedAt: '',
}
const draft = (overrides = {}) => ({
  name: 'Pump faults', product: 'LiftIQ', eventType: 'pump.fault', severity: 'Critical', scope: 'Asset: NOVA_02',
  recipientGroupId: 'g-ops', channels: ['In-app', 'Push'], repeatHandling: 'group', repeatIntervalMinutes: 30, ...overrides,
})

test('builds a local grouping rule from the selected choices', () => {
  const rule = buildNotificationRule(draft(), base, undefined, '2026-10-23T10:00:00.000Z')
  assert.equal(rule.repeatHandling, 'group')
  assert.equal(rule.scope, 'Asset: NOVA_02')
  assert.deepEqual(rule.channels, ['In-app', 'Push'])
  assert.equal(rule.cooldownMinutes, 0)
  assert.equal(rule.enabled, true)
})

test('requires a name, recipients, channels, and a valid reminder interval', () => {
  assert.throws(() => buildNotificationRule(draft({ name: ' ' }), base), /rule name/)
  assert.throws(() => buildNotificationRule(draft({ channels: [] }), base), /at least one channel/)
  assert.throws(() => buildNotificationRule(draft({ recipientGroupId: '' }), base), /recipient group/)
  assert.throws(() => buildNotificationRule(draft({ repeatHandling: 'remind', repeatIntervalMinutes: 2 }), base), /at least 5 minutes/)
})

test('labels reminder and every-occurrence settings as not enforced in the review summary', () => {
  const remind = buildNotificationRule(draft({ repeatHandling: 'remind', repeatIntervalMinutes: 45 }), base)
  assert.equal(remind.reminderMinutes, 45)
  assert.match(summarizeNotificationRule(remind, 'LiftIQ Operations Team'), /not enforced/)
  const every = buildNotificationRule(draft({ repeatHandling: 'every' }), base)
  assert.match(summarizeNotificationRule(every, 'LiftIQ Operations Team'), /every occurrence.*not enforced/)
})
