import type { NotificationThread } from '../data/types'

/** Frontend-only service boundary. Replace these implementations with tenant-scoped APIs later. */
export function visibleThreads(threads: NotificationThread[], organizationId: string) {
  return threads.filter(thread => thread.event.tenantId === organizationId)
}

export function updateThread(threads: NotificationThread[], id: string, patch: Partial<NotificationThread>) {
  return threads.map(thread => thread.id === id ? { ...thread, ...patch } : thread)
}

export function simulateAcknowledge(thread: NotificationThread, actor: string): NotificationThread {
  const time = new Date().toISOString()
  return {
    ...thread,
    status: 'Acknowledged',
    acknowledgedBy: actor,
    event: { ...thread.event, state: 'acknowledged' },
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
