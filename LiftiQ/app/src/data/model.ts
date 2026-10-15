export type LifecycleStatus = 'Active' | 'Acknowledged' | 'Completed' | 'Stale' | 'Recovery review'
export type EvidenceKind = 'device' | 'system' | 'user'
export interface AlarmEvent {
  id: string
  at: string
  kind: EvidenceKind
  title: string
  detail: string
  value?: string
  evidence?: string
}
export interface AlarmLifecycle {
  id: string
  name: string
  component: string
  severity: 'High' | 'Medium' | 'Low'
  status: LifecycleStatus
  station: string
  startedAt: string
  lastObservedAt: string
  resolvedAt?: string
  resolution?: string
  repeatCount: number
  source: string
  rule: string
  events: AlarmEvent[]
  recoveryEvidence?: { at: string; summary: string; supportingTimestamp?: string; reliable?: boolean }
  completion?: { user: string; at: string; note: string; evidenceAt: string }
  unread: boolean
}
export type NoticeType = 'Alarm' | 'Asset change' | 'Maintenance' | 'System'
export interface DeliveryAttempt { channel: 'Email' | 'Web Push' | 'SMS'; status: 'Sent' | 'Delivered' | 'Queued' | 'Failed'; at: string }
export interface NotificationItem {
  id: string
  type: NoticeType
  title: string
  message: string
  asset: string
  at: string
  unread: boolean
  lifecycleId?: string
  delivery?: DeliveryAttempt[]
}
export interface MuteRule {
  id: string
  lifecycleId: string
  station: string
  event: string
  scope: string
  mutedBy: string
  createdAt: string
  expiresAt?: string
  reason: string
}
export interface Pump { id: string; name: string; state: 'On' | 'Fault' | 'Off'; mode: string; role: string; runHours: number }
