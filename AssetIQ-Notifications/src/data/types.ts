export type Product = 'LiftIQ' | 'TankIQ' | 'FlowIQ' | 'ReeferIQ' | 'CloudIQ'
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'
export type ThreadStatus = 'Active' | 'Acknowledged' | 'Resolved' | 'Snoozed'
export type Channel = 'In-app' | 'Push' | 'Email' | 'SMS'
export type DeliveryStatus = 'Queued' | 'Attempted' | 'Provider accepted' | 'Failed' | 'Retrying'
export type UserRole = 'Platform Administrator' | 'Tenant Administrator' | 'Operations User' | 'Read-only Monitor'

export interface NormalizedEvent {
  eventId: string
  sourceApplication: Product
  tenantId: string
  stationId?: string
  assetId: string
  equipmentId?: string
  eventType: string
  sourceLifecycleId: string
  severity: Severity
  occurredAt: string
  receivedAt?: string
  correlationKey: string
  state: 'active' | 'acknowledged' | 'recovered'
  sourceReference: string
  metadata: { summary: string; value?: string; threshold?: string }
}

export interface TimelineEntry {
  id: string
  time: string
  kind: 'detected' | 'repeat' | 'reminder' | 'acknowledged' | 'escalated' | 'recovered' | 'delivery'
  title: string
  description: string
}

export interface DeliveryAttempt {
  id: string
  time: string
  recipient: string
  channel: Channel
  status: DeliveryStatus
  attempt: number
  response: string
  simulated: true
}

export interface NotificationThread {
  id: string
  event: NormalizedEvent
  title: string
  description: string
  status: ThreadStatus
  firstOccurredAt: string
  lastObservedAt: string
  occurrences: number
  unread: boolean
  escalated: boolean
  acknowledgedBy?: string
  lastReminderAt?: string
  recoveryNote?: string
  recipients: string[]
  timeline: TimelineEntry[]
  deliveries: DeliveryAttempt[]
}

export interface NotificationRule {
  id: string
  name: string
  description: string
  product: Product
  category: string
  eventType: string
  severity: Severity
  scope: string
  recipientGroupId: string
  channels: Channel[]
  cooldownMinutes: number
  reminderMinutes: number
  maxReminders: number
  escalationMinutes: number
  recoveryNotification: boolean
  enabled: boolean
  updatedAt: string
}

export interface Recipient {
  id: string
  name: string
  email: string
  organizationId: string
  products: Product[]
  channels: Channel[]
}

export interface RecipientGroup {
  id: string
  name: string
  organizationId: string
  products: Product[]
  memberIds: string[]
  channels: Channel[]
  enabled: boolean
}

export interface AuditEntry {
  id: string
  time: string
  actor: string
  organizationId: string
  action: string
  target: string
  summary: string
  before?: string
  after?: string
}
