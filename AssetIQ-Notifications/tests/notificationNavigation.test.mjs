import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveDeepLinkedThread } from '../.test-dist/services/mockService.js'

const threads = [
  { id: 'city-thread', event: { tenantId: 'tenant-city', sourceLifecycleId: 'LC-1' } },
  { id: 'county-thread', event: { tenantId: 'tenant-county', sourceLifecycleId: 'LC-1' } },
]

test('resolves source lifecycle context using both tenant and lifecycle identity', () => {
  assert.equal(resolveDeepLinkedThread(threads, { tenantId: 'tenant-county', lifecycleId: 'LC-1' }).id, 'county-thread')
  assert.equal(resolveDeepLinkedThread(threads, { tenantId: 'unknown', lifecycleId: 'LC-1' }), undefined)
  assert.equal(resolveDeepLinkedThread(threads, { lifecycleId: 'LC-1' }), undefined)
})

test('resolves local thread links within the already scoped thread list', () => {
  assert.equal(resolveDeepLinkedThread(threads, { threadId: 'city-thread' }).id, 'city-thread')
  assert.equal(resolveDeepLinkedThread(threads, { threadId: 'missing-thread' }), undefined)
})
