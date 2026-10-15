import type { AlarmLifecycle, NotificationItem, Pump } from './model'

const event = (id: string, at: string, kind: 'device' | 'system' | 'user', title: string, detail: string, value?: string, evidence?: string) => ({ id, at, kind, title, detail, value, evidence })
export const station = { id: 'NOVA_02', location: 'Hosur, Tamil Nadu', type: 'Pump Station', liquid: 'Waste Water', lastReported: '2026-10-12T15:36:00', reporting: 'Stale' as const }
export const pumps: Pump[] = [
  { id: 'P1', name: 'Pump 1', state: 'On', mode: 'Auto', role: 'Lead', runHours: 4.2 },
  { id: 'P2', name: 'Pump 2', state: 'Fault', mode: 'Auto', role: 'Lag', runHours: 0 },
  { id: 'P3', name: 'Pump 3', state: 'On', mode: 'Auto', role: 'Lag-Lag', runHours: 3.8 },
]

export const initialAlarms: AlarmLifecycle[] = [
  { id:'LC-1042',name:'High Level',component:'Wet Well',severity:'High',status:'Recovery review',station:'NOVA_02',startedAt:'2026-10-12T10:04:12',lastObservedAt:'2026-10-12T12:16:19',repeatCount:2,source:'Device alarm',rule:'The supplied screen shows a 71.1 in status report, but the applicable normalization threshold is not present here. Review configuration and evidence before completing.',unread:true,recoveryEvidence:{at:'2026-10-12T12:16:19',summary:'Status Report received. Supplied screen shows 71.1 in; threshold comparison is unavailable in this prototype.',supportingTimestamp:'2026-10-12T12:16:19'},events:[
    event('e-1042-1','2026-10-12T10:04:12','device','Alarm generated','Wet well level reached 70.2 in (threshold 70 in).','70.2 in · threshold 70 in'),
    event('e-1042-2','2026-10-12T10:08:45','device','Repeat activation','Level still above 70 in (71.4 in). Same lifecycle: no normalization evidence in between.','71.4 in'),
    event('e-1042-3','2026-10-12T11:20:16','device','Repeat activation','Level 71.8 in. Scheduled status reports are omitted from this concise timeline.','71.8 in'),
    event('e-1042-4','2026-10-12T12:16:19','system','Status Report needs review','A recent status report exists, but the supplied material does not establish whether this reading meets the normalization rule.','71.1 in'),
  ]},
  { id:'LC-1041',name:'Low Level',component:'Wet Well',severity:'Medium',status:'Completed',station:'NOVA_02',startedAt:'2026-10-11T20:18:00',lastObservedAt:'2026-10-11T21:42:00',resolvedAt:'2026-10-11T21:42:00',resolution:'Device clear',repeatCount:0,source:'Device alarm',rule:'Low-level alarm completed by an explicit device clear.',unread:false,events:[event('e-1041-1','2026-10-11T20:18:00','device','Alarm generated','Low-level activation received.'),event('e-1041-2','2026-10-11T21:42:00','device','Clear received','Device-generated clear message.') ]},
  { id:'LC-1040',name:'Pump 1 Fault',component:'Pump 1',severity:'High',status:'Completed',station:'NOVA_02',startedAt:'2026-10-10T14:34:00',lastObservedAt:'2026-10-10T15:22:00',resolvedAt:'2026-10-10T15:22:00',resolution:'Device clear',repeatCount:0,source:'Device alarm',rule:'Pump fault recovery follows the device clear state.',unread:false,events:[event('e-1040-1','2026-10-10T14:34:00','device','Alarm generated','Pump 1 fault activation received.'),event('e-1040-2','2026-10-10T15:22:00','device','Clear received','Pump 1 fault cleared by device.') ]},
  { id:'LC-1039',name:'High Level',component:'Wet Well',severity:'High',status:'Completed',station:'NOVA_02',startedAt:'2026-10-09T11:16:00',lastObservedAt:'2026-10-09T11:52:00',resolvedAt:'2026-10-09T11:52:00',resolution:'Auto (Status Report)',repeatCount:0,source:'Device alarm',rule:'High Level uses wet-well level ≥ 70 in activation and ≤ 68 in normalization. Illustrative values.',unread:false,events:[event('e-1039-1','2026-10-09T11:16:00','device','Alarm generated','Wet well level reached 70.6 in.','70.6 in'),event('e-1039-2','2026-10-09T11:52:00','system','Normalization evidence','Device clear was not received. Status Report level returned to normal.','64.2 in (≤ 68 in)','First Status Report satisfying the configured normalization condition after activation.') ]},
  { id:'LC-1038',name:'Pump 2 Current Low',component:'Pump 2',severity:'Medium',status:'Stale',station:'NOVA_02',startedAt:'2026-10-08T06:20:00',lastObservedAt:'2026-10-08T08:05:00',repeatCount:0,source:'Device alarm',rule:'Reporting timeout is illustrative (6 hours). Stale indicates missing evidence, not a confirmed continuing condition.',unread:false,events:[event('e-1038-1','2026-10-08T06:20:00','device','Alarm generated','Pump 2 current below configured low limit.'),event('e-1038-2','2026-10-08T14:05:00','system','Marked stale','Reporting timeout expired; recent evidence is unavailable.') ]},
  { id:'LC-1037',name:'High Level',component:'Wet Well',severity:'High',status:'Completed',station:'NOVA_02',startedAt:'2026-10-07T21:42:00',lastObservedAt:'2026-10-07T22:04:00',resolvedAt:'2026-10-07T22:04:00',resolution:'System detected · Status Report',repeatCount:0,source:'System-detected',rule:'No activation message was received; the Status Report satisfied the illustrative activation rule.',unread:false,events:[event('e-1037-1','2026-10-07T21:42:00','system','Alarm detected from Status Report','No activation message received. Report level exceeded the activation threshold.','72.5 in (≥ 70 in)','A Status Report satisfied the activation rule; lifecycle started by the system.'),event('e-1037-2','2026-10-07T22:04:00','system','Normalization evidence','Status Report showed level back within normal range.','63.0 in (≤ 68 in)') ]},
  { id:'LC-1034',name:'High Level',component:'Wet Well',severity:'High',status:'Completed',station:'NOVA_02',startedAt:'2026-10-05T10:00:00',lastObservedAt:'2026-10-05T10:10:00',resolvedAt:'2026-10-05T10:10:00',resolution:'Auto (Status Report)',repeatCount:0,source:'Device alarm',rule:'Normalization evidence ended this lifecycle; the 10:20 activation was a separate lifecycle.',unread:false,events:[event('e-1034-1','2026-10-05T10:00:00','device','Alarm generated','Wet well level reached 70.4 in.','70.4 in'),event('e-1034-2','2026-10-05T10:10:00','system','Normalization evidence','Level back to normal. This ends the lifecycle; a later activation starts a new one.','66.8 in (≤ 68 in)','Reliable normalization evidence. Later activations are new lifecycles.') ]},
  { id:'LC-1035',name:'High Level',component:'Wet Well',severity:'High',status:'Completed',station:'NOVA_02',startedAt:'2026-10-05T10:20:00',lastObservedAt:'2026-10-05T11:38:00',resolvedAt:'2026-10-05T11:38:00',resolution:'Device clear',repeatCount:0,source:'Device alarm',rule:'A normalization report ended the prior lifecycle before this activation, so this is a new occurrence.',unread:false,events:[event('e-1035-1','2026-10-05T10:20:00','device','New lifecycle started','Level exceeded 70 in again at 71.0 in after LC-1034 ended at 10:10.','71.0 in'),event('e-1035-2','2026-10-05T11:38:00','device','Clear received','Device-generated clear message.') ]},
]

export const initialNotifications: NotificationItem[] = [
  {id:'NT-101',type:'Alarm',title:'Pump 1 Fault',message:'Pump 1 reported a fault state.',asset:'NOVA_02 · Pump 1',at:'2026-10-10T14:34:05',unread:true,lifecycleId:'LC-1040',delivery:[{channel:'Web Push',status:'Delivered',at:'2026-10-10T14:34:07'},{channel:'Email',status:'Queued',at:'2026-10-10T14:34:10'}]},
  {id:'NT-102',type:'Alarm',title:'High Water Level',message:'Wet well level remains above its configured activation band. Repeat messages belong to lifecycle LC-1042.',asset:'NOVA_02 · Wet Well',at:'2026-10-12T11:20:16',unread:true,lifecycleId:'LC-1042',delivery:[{channel:'Web Push',status:'Failed',at:'2026-10-12T11:20:18'}]},
  {id:'NT-109',type:'Alarm',title:'High Water Level · repeat',message:'A repeat alarm message was received within the same unresolved lifecycle.',asset:'NOVA_02 · Wet Well',at:'2026-10-12T12:16:19',unread:true,lifecycleId:'LC-1042'},
  {id:'NT-103',type:'Asset change',title:'Asset owner changed',message:'Ownership for NOVA_02 changed from Operations South to Water Services Group.',asset:'NOVA_02',at:'2026-10-15T08:35:00',unread:true},
  {id:'NT-104',type:'Maintenance',title:'Pump 1 maintenance due soon',message:'Routine service is scheduled in five days. Review the schedule and assigned technician.',asset:'NOVA_02 · Pump 1',at:'2026-10-15T08:10:00',unread:false},
  {id:'NT-105',type:'System',title:'User access changed',message:'An Operator role was assigned for the NOVA_02 station group.',asset:'Station access',at:'2026-10-14T16:05:00',unread:false,delivery:[{channel:'Email',status:'Queued',at:'2026-10-14T16:05:01'}]},
  {id:'NT-106',type:'Asset change',title:'Asset details updated',message:'The service contact and station notes were updated.',asset:'LiftIQ-Asset-001',at:'2026-10-13T11:20:00',unread:false},
  {id:'NT-107',type:'Maintenance',title:'Maintenance completed',message:'Inspection for NOVA_02 Pump 2 was marked complete.',asset:'NOVA_02 · Pump 2',at:'2026-10-12T14:15:00',unread:false,delivery:[{channel:'Email',status:'Sent',at:'2026-10-12T14:15:02'}]},
  {id:'NT-108',type:'System',title:'Notification rule changed',message:'A station notification rule was updated by an administrator.',asset:'Notification settings',at:'2026-10-11T08:45:00',unread:false},
]

export const subscriptionCategories = [
  {id:'wet',name:'Wet Well Alerts',events:['Wet Well Level is Low','Wet Well Level is High','High Level Float Reached','Low Level Float Reached','Station Flow Alarm is Occurred']},
  {id:'pump',name:'Pump Alerts',events:['Pump Fault','Pump Current Alert']},
  {id:'power',name:'Station Power Alerts',events:['Station Power Loss','Generator Fault']},
  {id:'oos',name:'Out of Service Alerts',events:['Out of Service']},
  {id:'sensor',name:'Analog/Digital Sensor Alerts',events:['Configured Sensor Alarm','Sensor State Changed']},
  {id:'asset',name:'Asset Changes',events:['Asset Owner Changed','Asset Details Updated']},
  {id:'maintenance',name:'Maintenance Notifications',events:['Maintenance Due','Maintenance Completed']},
  {id:'system',name:'System Notifications',events:['User Access Changed','System Configuration Updated']},
]
export const initialPreferences = Object.fromEntries(subscriptionCategories.map((category) => [category.id,{email:false,push:true,sms:false,recovery:true}])) as Record<string,{email:boolean;push:boolean;sms:boolean;recovery:boolean}>

export const maintenance = [
  {type:'Routine Service',scheduled:'2026-10-17',maintained:'',status:'Upcoming',difference:'Due in 5 days',notes:'Periodic service and cleaning'},
  {type:'Inspection',scheduled:'2026-10-07',maintained:'2026-10-07',status:'Completed',difference:'5 days before due',notes:'Inspection and condition check'},
  {type:'Routine Service',scheduled:'2026-05-02',maintained:'2026-04-12',status:'Completed',difference:'20 days before due',notes:'Cleaning, impeller check'},
  {type:'Initial Commissioning',scheduled:'2024-01-12',maintained:'2024-01-12',status:'Completed',difference:'—',notes:'Installation and initial setup'},
  {type:'Inspection',scheduled:'2027-04-22',maintained:'',status:'Upcoming',difference:'Future schedule',notes:'Upcoming inspection'},
]
export const capacitySeries = [410,380,425,378,382,401,437,399,402,381,435,480]
