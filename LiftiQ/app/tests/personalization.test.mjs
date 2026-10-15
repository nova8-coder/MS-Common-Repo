import test from 'node:test'
import assert from 'node:assert/strict'
import * as personalization from '../.test-dist/personalization.js'
const now = new Date('2026-10-15T12:00:00.000Z')
const event = (type, pageId, daysAgo, sessionId, assetId, metadata) => ({
  id: `${type}-${daysAgo}-${sessionId}-${assetId || ''}`,
  type,
  pageId,
  at: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  sessionId,
  ...(assetId ? { assetId } : {}),
  ...(metadata ? { metadata } : {}),
})

test('a short burst does not establish a frequently viewed asset', () => {
  const events = [0, 1, 2, 3].map(day => event('asset_viewed', 'station-overview', day, 'one-session', 'NOVA_02'))
  const [rank] = personalization.rankAssets(events, ['NOVA_02'], [], now)
  assert.equal(rank.recent, true)
  assert.equal(rank.frequent, false)
  assert.equal(rank.distinctSessions, 1)
})

test('repeated use across days and sessions establishes a gradual frequent ranking', () => {
  const events = [
    event('asset_viewed', 'station-overview', 1, 'session-a', 'NOVA_02'),
    event('asset_viewed', 'station-overview', 5, 'session-b', 'NOVA_02'),
    event('asset_viewed', 'station-overview', 9, 'session-a', 'NOVA_02'),
  ]
  const [rank] = personalization.rankAssets(events, ['NOVA_02'], [], now)
  assert.equal(rank.frequent, true)
  assert.equal(rank.distinctDays, 3)
  assert.equal(rank.distinctSessions, 2)
})

test('rank excludes assets outside the accessible asset set and retains explicit pins', () => {
  const events = [event('asset_viewed', 'station-overview', 0, 'session-a', 'NOVA_02')]
  assert.deepEqual(personalization.rankAssets(events, [], [], now), [])
  const [pinned] = personalization.rankAssets([], ['NOVA_02'], ['NOVA_02'], now)
  assert.equal(pinned.pinned, true)
  assert.match(pinned.reason, /Pinned/)
})

test('last-used notification filters validate against the existing filter options', () => {
  assert.deepEqual(personalization.validateNotificationFilters({ query: 'NOVA_02', type: 'Alarm', read: 'Unread', secret: 'omit' }), { query: 'NOVA_02', type: 'Alarm', read: 'Unread' })
  assert.deepEqual(personalization.validateNotificationFilters({ query: 'x'.repeat(140), type: 'Unknown', read: 'Archived' }), { query: 'x'.repeat(120), type: '', read: '' })
})

test('frequent filters require repeated use across separate sessions and are offered as suggestions', () => {
  const filters = { query: '', type: 'Alarm', read: 'Unread' }
  const events = [
    event('filter_applied', 'notifications', 1, 'session-a', undefined, filters),
    event('filter_applied', 'notifications', 2, 'session-b', undefined, filters),
    event('filter_applied', 'notifications', 3, 'session-a', undefined, filters),
  ]
  const suggestion = personalization.suggestFrequentFilter(events, [], now)
  assert.equal(suggestion.count, 3)
  assert.equal(suggestion.sessions, 2)
  assert.equal(personalization.suggestFrequentFilter(events, [{ id: 'saved', pageId: 'notifications', name: 'My alarms', filters, updatedAt: now.toISOString() }], now), null)
})

test('landing-page suggestion needs sustained meaningful use and never changes the default itself', () => {
  const sparse = [1, 2, 3, 4, 5].map((day, index) => event('home_action', 'personalized-home', day, index < 4 ? 'session-a' : 'session-b'))
  assert.equal(personalization.shouldSuggestPersonalizedDefault(sparse, now), false)
  const sustained = [
    event('home_action', 'personalized-home', 1, 's1'),
    event('home_action', 'personalized-home', 2, 's2'),
    event('home_action', 'personalized-home', 4, 's3'),
    event('home_action', 'personalized-home', 6, 's4'),
    event('home_action', 'personalized-home', 8, 's5'),
  ]
  assert.equal(personalization.shouldSuggestPersonalizedDefault(sustained, now), true)
  assert.equal(personalization.DEFAULT_PERSONALIZATION.defaultLanding, 'dashboard')
})

test('refresh-like duplicate events in one session do not add repeated usage evidence', () => {
  const first = event('asset_viewed', 'station-overview', 0, 'session-a', 'NOVA_02')
  const state = { events: [first] }
  const duplicate = { ...first, id: 'refresh', at: new Date(Date.parse(first.at) + 10_000).toISOString() }
  assert.equal(personalization.appendActivity(state, duplicate), state)
})
