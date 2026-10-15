import type { AlarmEvent, AlarmLifecycle } from '../data/model'

export interface IncomingAlarmEvent {
  id: string
  station: string
  name: string
  component: string
  severity: AlarmLifecycle['severity']
  at: string
  detail: string
  value?: string
  normalizationConfirmed?: boolean
  activationConfirmed?: boolean
}

const unresolved = (alarm: AlarmLifecycle) => ['Active','Acknowledged','Recovery review','Stale'].includes(alarm.status)
const openMatch = (items: AlarmLifecycle[], event: IncomingAlarmEvent) => items.find((item) => unresolved(item) && !item.recoveryEvidence?.reliable && item.station === event.station && item.name === event.name && item.component === event.component)

export function applyAlarmGeneration(items: AlarmLifecycle[], incoming: IncomingAlarmEvent): AlarmLifecycle[] {
  const prior = openMatch(items, incoming)
  if (prior) {
    return items.map((alarm) => alarm.id === prior.id ? {
      ...alarm,
      repeatCount: alarm.repeatCount + 1,
      lastObservedAt: incoming.at,
      unread: true,
      events: [...alarm.events, { id:incoming.id,at:incoming.at,kind:'device',title:'Repeat activation',detail:`${incoming.detail} Existing unresolved lifecycle retained.` ,value:incoming.value }],
    } : alarm)
  }
  const created: AlarmLifecycle = {
    id:`LC-${incoming.id}`,name:incoming.name,component:incoming.component,severity:incoming.severity,
    status:'Active',station:incoming.station,startedAt:incoming.at,lastObservedAt:incoming.at,repeatCount:0,
    source:'Device alarm',rule:'Lifecycle created from a device alarm event.',unread:true,
    events:[{id:incoming.id,at:incoming.at,kind:'device',title:'Alarm generated',detail:incoming.detail,value:incoming.value}],
  }
  return [created,...items]
}

export function applyDeviceClear(items: AlarmLifecycle[], incoming: IncomingAlarmEvent): AlarmLifecycle[] {
  const prior = items.find((item) => unresolved(item) && item.station === incoming.station && item.name === incoming.name && item.component === incoming.component)
  if (!prior) return items
  const clear: AlarmEvent = {id:incoming.id,at:incoming.at,kind:'device',title:'Clear received',detail:incoming.detail,value:incoming.value}
  return items.map((alarm) => alarm.id === prior.id ? {...alarm,status:'Completed',resolvedAt:incoming.at,lastObservedAt:incoming.at,resolution:'Device clear',recoveryEvidence:undefined,events:[...alarm.events,clear]} : alarm)
}

export function applyStatusReport(items: AlarmLifecycle[], incoming: IncomingAlarmEvent): AlarmLifecycle[] {
  const prior = openMatch(items,incoming)
  if (prior && incoming.normalizationConfirmed) {
    const evidence: AlarmEvent = {id:incoming.id,at:incoming.at,kind:'system',title:'Recovery evidence needs review',detail:'Status Report indicates normalization but no device clear event arrived. Authorized user review is required.',value:incoming.value,evidence:incoming.detail}
    return items.map((alarm) => alarm.id === prior.id ? {
      ...alarm,status:'Recovery review',lastObservedAt:incoming.at,recoveryEvidence:{at:incoming.at,summary:incoming.detail,supportingTimestamp:incoming.at,reliable:true},events:[...alarm.events,evidence],
    } : alarm)
  }
  if (!prior && incoming.activationConfirmed) {
    const detected: AlarmLifecycle = {id:`SYS-${incoming.id}`,name:incoming.name,component:incoming.component,severity:incoming.severity,status:'Active',station:incoming.station,startedAt:incoming.at,lastObservedAt:incoming.at,repeatCount:0,source:'System-detected from Status Report',rule:'The Status Report met the configured activation criteria; lifecycle detected by the system.',unread:true,events:[{id:incoming.id,at:incoming.at,kind:'system',title:'Alarm detected from Status Report',detail:incoming.detail,value:incoming.value,evidence:'No corresponding alarm-generation event was received.'}]}
    return [detected,...items]
  }
  return items
}

export function markLifecycleStale(items: AlarmLifecycle[], id: string, at: string): AlarmLifecycle[] {
  return items.map((alarm) => alarm.id === id && ['Active','Acknowledged'].includes(alarm.status) ? {
    ...alarm,status:'Stale',lastObservedAt:at,events:[...alarm.events,{id:`stale-${id}-${at}`,at,kind:'system',title:'Marked stale',detail:'Reporting timeout expired. The condition during the gap is unknown; no clear time is assumed.'}],
  } : alarm)
}

export function acknowledgeLifecycle(items: AlarmLifecycle[], id: string, user: string, at: string): AlarmLifecycle[] {
  return items.map((alarm) => alarm.id === id && alarm.status === 'Active'
    ? {...alarm,status:'Acknowledged',events:[...alarm.events,{id:`ack-${id}-${at}`,at,kind:'user',title:'Alarm acknowledged',detail:`Acknowledged by ${user}. The lifecycle remains unresolved.`}]}
    : alarm)
}

export function manuallyCompleteLifecycle(items: AlarmLifecycle[], input: {id:string;user:string;at:string;evidenceAt:string;note:string;confirmed:boolean}): AlarmLifecycle[] {
  const note=input.note.trim()
  if (!input.confirmed || !input.evidenceAt || !note) throw new Error('Review the supporting Status Report, enter its timestamp and add a completion note.')
  return items.map((alarm) => alarm.id === input.id && alarm.recoveryEvidence ? {
    ...alarm,status:'Completed',resolvedAt:input.at,lastObservedAt:input.at,resolution:'Manual completion · telemetry evidence',
    completion:{user:input.user,at:input.at,evidenceAt:input.evidenceAt,note},
    events:[...alarm.events,{id:`manual-${alarm.id}-${input.at}`,at:input.at,kind:'user',title:'Manually completed from telemetry evidence',detail:note,evidence:`Status Report evidence time: ${input.evidenceAt}. No device clear event was received.`}],
  } : alarm)
}
