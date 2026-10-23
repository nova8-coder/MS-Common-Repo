import type { Channel, NotificationRule, Product, RepeatHandling, Severity } from '../data/types'

export interface RuleDraft {
  name: string
  product: Product
  eventType: string
  severity: Severity
  scope: string
  recipientGroupId: string
  channels: Channel[]
  repeatHandling: RepeatHandling
  repeatIntervalMinutes: number
}

export function getRepeatHandling(rule: NotificationRule): RepeatHandling {
  return rule.repeatHandling ?? (rule.reminderMinutes > 0 ? 'remind' : 'group')
}

export function buildNotificationRule(
  draft: RuleDraft,
  base: NotificationRule,
  existing?: NotificationRule,
  now = new Date().toISOString(),
): NotificationRule {
  const name = draft.name.trim()
  if (!name) throw new Error('Enter a rule name.')
  if (!draft.eventType.trim()) throw new Error('Choose an event type.')
  if (!draft.scope.trim()) throw new Error('Choose an organization asset scope.')
  if (!draft.recipientGroupId) throw new Error('Choose a recipient group.')
  if (!draft.channels.length) throw new Error('Select at least one channel available to the recipient group.')
  if (draft.repeatHandling === 'remind' && (!Number.isInteger(draft.repeatIntervalMinutes) || draft.repeatIntervalMinutes < 5)) {
    throw new Error('Choose a reminder interval of at least 5 minutes.')
  }

  return {
    ...base,
    id: existing?.id ?? `r-${Date.now()}`,
    name,
    description: existing?.description ?? 'Organization notification intent configured in the prototype.',
    product: draft.product,
    category: draft.eventType,
    eventType: draft.eventType,
    severity: draft.severity,
    scope: draft.scope,
    recipientGroupId: draft.recipientGroupId,
    channels: [...draft.channels],
    repeatHandling: draft.repeatHandling,
    cooldownMinutes: 0,
    reminderMinutes: draft.repeatHandling === 'remind' ? draft.repeatIntervalMinutes : 0,
    maxReminders: draft.repeatHandling === 'remind' ? 3 : 0,
    escalationMinutes: 0,
    recoveryNotification: false,
    enabled: existing?.enabled ?? true,
    updatedAt: now,
  }
}

export function summarizeNotificationRule(rule: NotificationRule, groupName: string) {
  const repeat = getRepeatHandling(rule)
  const repeatText = repeat === 'group'
    ? 'Group repeated observations in one thread.'
    : repeat === 'remind'
      ? `Reminder interval set to ${rule.reminderMinutes} minutes (not enforced).`
      : 'Notify for every occurrence (not enforced).'
  return `When a ${rule.severity.toLowerCase()} ${rule.eventType} occurs in ${rule.scope}, notify ${groupName} through ${rule.channels.join(', ')}. ${repeatText}`
}
