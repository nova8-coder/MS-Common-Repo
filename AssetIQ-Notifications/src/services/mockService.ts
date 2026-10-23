import type { NotificationThread } from '../data/types'

/** Frontend-only service boundary. Replace these implementations with tenant-scoped APIs later. */
export function visibleThreads(threads: NotificationThread[], organizationId: string) {
  return threads.filter(thread => thread.event.tenantId === organizationId)
}

export function updateThread(threads: NotificationThread[], id: string, patch: Partial<NotificationThread>) {
  return threads.map(thread => thread.id === id ? { ...thread, ...patch } : thread)
}

export function resolveDeepLinkedThread(
  threads: NotificationThread[],
  context: { threadId?: string | null; tenantId?: string | null; lifecycleId?: string | null },
) {
  if (context.threadId) return threads.find(thread => thread.id === context.threadId)
  if (!context.tenantId || !context.lifecycleId) return undefined
  return threads.find(thread => thread.event.tenantId === context.tenantId && thread.event.sourceLifecycleId === context.lifecycleId)
}

export function simulateAcknowledge(thread: NotificationThread, actor: string): NotificationThread {
  const time = new Date().toISOString()
  return {
    ...thread,
    status: 'Acknowledged',
    acknowledgedBy: actor,
    timeline: [...thread.timeline, { id: `ack-${Date.now()}`, time, kind: 'acknowledged', title: `Acknowledged by ${actor}`, description: 'This acknowledges the notification thread only. The source alarm and equipment state are unchanged.' }],
  }
}

export function simulateSnooze(thread: NotificationThread): NotificationThread {
  const time = new Date().toISOString()
  return {
    ...thread,
    status: 'Snoozed',
    timeline: [...thread.timeline, { id: `snooze-${Date.now()}`, time, kind: 'reminder', title: 'Notification snoozed (simulated)', description: 'This local prototype hides the thread from the Active view; no delivery policy is changed.' }],
  }
}
