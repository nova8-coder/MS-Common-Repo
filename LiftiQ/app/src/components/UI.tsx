import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import type { AlarmLifecycle } from '../data/model'

export function PageTitle({eyebrow,title,description,actions}:{eyebrow?:ReactNode;title:string;description?:string;actions?:ReactNode}){return <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div>{eyebrow&&<div className="eyebrow mb-1">{eyebrow}</div>}<h1 className="page-title">{title}</h1>{description&&<p className="muted mt-1">{description}</p>}</div>{actions&&<div className="flex flex-wrap gap-2">{actions}</div>}</div>}
export function Panel({children,className='',...props}:HTMLAttributes<HTMLElement>){return <section {...props} className={`surface ${className}`}>{children}</section>}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:string}){return <span className={`badge ${tone}`}>{children}</span>}
export function Metric({label,value,note,tone}:{label:string;value:string|number;note?:string;tone?:string}){return <Panel className="metric"><span className="muted text-xs">{label}</span><strong className={tone||''}>{value}</strong>{note&&<span className="muted text-xs">{note}</span>}</Panel>}
export function Empty({title,detail}:{title:string;detail?:string}){return <div className="empty"><b className="block text-slate-700">{title}</b>{detail&&<span className="mt-1 block">{detail}</span>}</div>}
export const formatDate=(value?:string)=>value?new Date(value).toLocaleString('en-US',{month:'short',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}):'—'
export const formatShort=(value:string)=>new Date(value).toLocaleString('en-US',{month:'short',day:'2-digit',hour:'numeric',minute:'2-digit'})
export function alarmTone(status:AlarmLifecycle['status']){return status==='Completed'?'completed':status==='Stale'?'stale':status==='Recovery review'?'review':status==='Acknowledged'?'acknowledged':'active'}
export function Severity({value}:{value:string}){return <Badge tone={value==='High'?'high':value==='Medium'?'medium':'info'}>{value}</Badge>}
export function AlarmStatus({value}:{value:AlarmLifecycle['status']}){return <Badge tone={alarmTone(value)}>{value}</Badge>}
export function SectionHeading({title,action}:{title:string;action?:ReactNode}){return <div className="mb-3 flex items-center justify-between gap-3"><h2 className="section-title">{title}</h2>{action}</div>}
export function FilterInput(props:InputHTMLAttributes<HTMLInputElement>){return <input {...props} className={`input ${props.className||''}`}/>}
export function SourceLabel({kind}:{kind:'device'|'system'|'user'}){const name={device:'Device reported',system:'System inferred',user:'User action'}[kind];return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${kind==='device'?'bg-sky-50 text-sky-800':kind==='system'?'bg-violet-50 text-violet-800':'bg-amber-50 text-amber-800'}`}>{name}</span>}
