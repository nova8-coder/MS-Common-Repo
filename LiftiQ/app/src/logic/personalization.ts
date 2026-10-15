/**
 * Browser-only personalization model for the local LiftIQ prototype.
 * Production identity, authorization, activity storage, and ranking must be server-backed.
 */
export const PERSONALIZATION_CONTEXT = { userKey: 'venky-karuppanan', tenantKey: 'sample-workspace' } as const
export const PERSONALIZATION_STORAGE_KEY = `liftiq.personalization.v1.${PERSONALIZATION_CONTEXT.tenantKey}.${PERSONALIZATION_CONTEXT.userKey}`

export type ActivityType = 'page_viewed' | 'asset_viewed' | 'asset_tab_viewed' | 'filter_applied' | 'saved_view_created' | 'saved_view_opened' | 'shortcut_used' | 'suggestion_opened' | 'suggestion_dismissed' | 'home_layout_changed' | 'home_action' | 'asset_opened_from_home' | 'asset_opened_from_dashboard'
export interface ActivityEvent { id:string; type:ActivityType; at:string; sessionId:string; pageId:string; assetId?:string; metadata?:Record<string,string|number|boolean> }
export interface SavedView { id:string; pageId:'notifications'; name:string; filters:NotificationFilters; updatedAt:string }
export interface NotificationFilters { query:string; type:string; read:string }
export interface PersonalizationState { version:1; events:ActivityEvent[]; pinnedAssetIds:string[]; savedViews:SavedView[]; lastNotificationFilters:NotificationFilters; defaultLanding:'dashboard'|'personalized'; landingPromptDismissed:boolean; sectionOrder:string[]; dismissedSuggestions:string[] }
export const DEFAULT_NOTIFICATION_FILTERS:NotificationFilters={query:'',type:'',read:''}
export const DEFAULT_PERSONALIZATION:PersonalizationState={version:1,events:[],pinnedAssetIds:[],savedViews:[],lastNotificationFilters:DEFAULT_NOTIFICATION_FILTERS,defaultLanding:'dashboard',landingPromptDismissed:false,sectionOrder:['recent','frequent','pages','views'],dismissedSuggestions:[]}
export const PERSONALIZATION_WINDOWS={recentDays:3,sustainedDays:28,longTermDays:90} as const
export const LANDING_RECOMMENDATION_THRESHOLD={homeSessions:5,distinctDays:3} as const

export function loadPersonalization():PersonalizationState{
  try{
    const raw=localStorage.getItem(PERSONALIZATION_STORAGE_KEY)
    if(!raw)return structuredClone(DEFAULT_PERSONALIZATION)
    const parsed=JSON.parse(raw) as Partial<PersonalizationState>
    if(parsed.version!==1||!Array.isArray(parsed.events))return structuredClone(DEFAULT_PERSONALIZATION)
    return {...structuredClone(DEFAULT_PERSONALIZATION),...parsed,
      events:parsed.events.filter(isActivityEvent).slice(-2000),
      pinnedAssetIds:Array.isArray(parsed.pinnedAssetIds)?parsed.pinnedAssetIds.filter((x):x is string=>typeof x==='string'):[],
      savedViews:Array.isArray(parsed.savedViews)?parsed.savedViews.filter(isSavedView):[],
      lastNotificationFilters:validateNotificationFilters(parsed.lastNotificationFilters),
      sectionOrder:validateSectionOrder(parsed.sectionOrder),
      dismissedSuggestions:Array.isArray(parsed.dismissedSuggestions)?parsed.dismissedSuggestions.filter((x):x is string=>typeof x==='string'):[],
      defaultLanding:parsed.defaultLanding==='personalized'?'personalized':'dashboard',
      landingPromptDismissed:parsed.landingPromptDismissed===true,
    }
  }catch{return structuredClone(DEFAULT_PERSONALIZATION)}
}

export function persistPersonalization(state:PersonalizationState){try{localStorage.setItem(PERSONALIZATION_STORAGE_KEY,JSON.stringify(state))}catch{/* Storage may be disabled; app remains usable for this session. */}}
export function getSessionId(){try{const key=`${PERSONALIZATION_STORAGE_KEY}.session`;let id=sessionStorage.getItem(key);if(!id){id=makeId('session');sessionStorage.setItem(key,id)}return id}catch{return 'temporary-session'}}
export function createActivity(type:ActivityType,pageId:string,metadata?:Record<string,string|number|boolean>,assetId?:string,now=new Date(),sessionId=getSessionId()):ActivityEvent{return{id:makeId('evt'),type,pageId,at:now.toISOString(),sessionId,...(metadata?{metadata}:{}),...(assetId?{assetId}:{})}}
export function appendActivity(state:PersonalizationState,event:ActivityEvent){
  // Refreshes and repeated route callbacks within five minutes in one tab do not add frequency weight.
  if((event.type==='asset_viewed'||event.type==='asset_tab_viewed'||event.type==='page_viewed'||event.type==='filter_applied')&&state.events.some(old=>old.type===event.type&&old.pageId===event.pageId&&old.assetId===event.assetId&&old.sessionId===event.sessionId&&JSON.stringify(old.metadata||{})===JSON.stringify(event.metadata||{})&&Math.abs(Date.parse(event.at)-Date.parse(old.at))<5*60_000))return state
  return {...state,events:[...state.events,event].slice(-2000)}
}

export interface AssetRank { assetId:string;score:number;recent:boolean;frequent:boolean;pinned:boolean;distinctDays:number;distinctSessions:number;lastViewedAt:string;reason:string }
export function rankAssets(events:ActivityEvent[],accessibleAssetIds:string[],pinnedAssetIds:string[],now=new Date()):AssetRank[]{
  const allowed=new Set(accessibleAssetIds),pins=new Set(pinnedAssetIds),assetIds=new Set(events.filter(e=>e.type==='asset_viewed'&&e.assetId&&allowed.has(e.assetId)&&ageDays(e.at,now)<=PERSONALIZATION_WINDOWS.longTermDays).map(e=>e.assetId!));for(const id of pins)if(allowed.has(id))assetIds.add(id)
  return [...assetIds].map(assetId=>{
    const assetEvents=events.filter(e=>e.type==='asset_viewed'&&e.assetId===assetId&&ageDays(e.at,now)<=PERSONALIZATION_WINDOWS.longTermDays)
    const recentEvents=assetEvents.filter(e=>ageDays(e.at,now)<=PERSONALIZATION_WINDOWS.recentDays)
    const sustained=assetEvents.filter(e=>ageDays(e.at,now)<=PERSONALIZATION_WINDOWS.sustainedDays)
    const days=distinctDays(sustained),sessions=new Set(sustained.map(e=>e.sessionId)).size
    const longDays=distinctDays(assetEvents).length
    const recency=recentEvents.length?Math.max(0,1-ageDays(assetEvents.sort((a,b)=>b.at.localeCompare(a.at))[0].at,now)/PERSONALIZATION_WINDOWS.recentDays):0
    const frequency=Math.min(1,days.length/8)
    const longTerm=Math.min(1,longDays/16)
    const score=Math.round((.45*recency+.35*frequency+.20*longTerm)*100)
    const frequent=days.length>=3&&sessions>=2
    return{assetId,score,recent:recentEvents.length>0,frequent,pinned:pins.has(assetId),distinctDays:days.length,distinctSessions:sessions,lastViewedAt:assetEvents.sort((a,b)=>b.at.localeCompare(a.at))[0]?.at||'',reason:pins.has(assetId)?'Pinned by you':frequent?`Viewed across ${days.length} days and ${sessions} sessions`:recentEvents.length?'Recently opened':'Not enough repeated activity yet'}
  }).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.score-a.score)
}

export function rankPageUsage(events:ActivityEvent[],now=new Date()){
  const eligible=events.filter(e=>['page_viewed','asset_tab_viewed'].includes(e.type)&&ageDays(e.at,now)<=PERSONALIZATION_WINDOWS.longTermDays)
  const grouped=new Map<string,ActivityEvent[]>();for(const e of eligible){const key=`${e.assetId||''}|${e.pageId}`;grouped.set(key,[...(grouped.get(key)||[]),e])}
  return [...grouped.entries()].map(([key,items])=>{const recent=items.filter(e=>ageDays(e.at,now)<=PERSONALIZATION_WINDOWS.sustainedDays),days=distinctDays(recent),sessions=new Set(recent.map(e=>e.sessionId)).size;return{key,assetId:items[0].assetId,pageId:items[0].pageId,days:days.length,sessions,lastViewedAt:items.sort((a,b)=>b.at.localeCompare(a.at))[0].at,frequent:days.length>=2&&sessions>=2}}).sort((a,b)=>b.lastViewedAt.localeCompare(a.lastViewedAt))
}

export function shouldSuggestPersonalizedDefault(events:ActivityEvent[],now=new Date()){
  const meaningful=events.filter(e=>e.type==='home_action'&&ageDays(e.at,now)<=30)
  return new Set(meaningful.map(e=>e.sessionId)).size>=LANDING_RECOMMENDATION_THRESHOLD.homeSessions&&distinctDays(meaningful).length>=LANDING_RECOMMENDATION_THRESHOLD.distinctDays
}
export function suggestFrequentFilter(events:ActivityEvent[],savedViews:SavedView[],now=new Date()){
  const filters=new Map<string,{value:NotificationFilters;events:ActivityEvent[]}>()
  for(const event of events){if(event.type!=='filter_applied'||event.pageId!=='notifications'||ageDays(event.at,now)>14)continue;const value=validateNotificationFilters(event.metadata),key=JSON.stringify(value);if(!hasActiveFilters(value))continue;const entry=filters.get(key)||{value,events:[]};entry.events.push(event);filters.set(key,entry)}
  return [...filters.entries()].map(([key,entry])=>({key,filters:entry.value,count:entry.events.length,sessions:new Set(entry.events.map(e=>e.sessionId)).size,lastUsedAt:entry.events.map(e=>e.at).sort().at(-1)||''})).filter(item=>item.count>=3&&item.sessions>=2&&!savedViews.some(view=>JSON.stringify(view.filters)===item.key)).sort((a,b)=>b.lastUsedAt.localeCompare(a.lastUsedAt))[0]||null
}
export function validateNotificationFilters(value:unknown):NotificationFilters{
  if(!value||typeof value!=='object')return{...DEFAULT_NOTIFICATION_FILTERS}
  const v=value as Record<string,unknown>
  return{query:typeof v.query==='string'?v.query.slice(0,120):'',type:['','Alarm','Asset change','Maintenance','System'].includes(String(v.type))?String(v.type):'',read:['','Read','Unread'].includes(String(v.read))?String(v.read):''}
}
export function hasActiveFilters(value:NotificationFilters){return !!(value.query||value.type||value.read)}
export function validateSectionOrder(value:unknown){const valid=['recent','frequent','pages','views'];if(!Array.isArray(value))return [...valid];const kept=value.filter((x):x is string=>typeof x==='string'&&valid.includes(x));return [...new Set([...kept,...valid])]}
export function taskSpeedSummary(events:ActivityEvent[]){const results=events.filter(e=>(e.type==='asset_opened_from_home'||e.type==='asset_opened_from_dashboard')&&typeof e.metadata?.seconds==='number');const summarize=(type:ActivityType)=>{const vals=results.filter(e=>e.type===type).map(e=>Number(e.metadata?.seconds)).sort((a,b)=>a-b);return{count:vals.length,median:vals.length?vals[Math.floor((vals.length-1)/2)]:null}};return{home:summarize('asset_opened_from_home'),dashboard:summarize('asset_opened_from_dashboard')}}

function distinctDays(events:ActivityEvent[]){return [...new Set(events.map(e=>e.at.slice(0,10)))]}
function ageDays(at:string,now:Date){return Math.max(0,(now.getTime()-Date.parse(at))/86_400_000)}
function makeId(prefix:string){return `${prefix}-${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,9)}`}`}
function isActivityEvent(value:unknown):value is ActivityEvent{if(!value||typeof value!=='object')return false;const v=value as ActivityEvent;return typeof v.id==='string'&&typeof v.type==='string'&&typeof v.at==='string'&&typeof v.sessionId==='string'&&typeof v.pageId==='string'}
function isSavedView(value:unknown):value is SavedView{if(!value||typeof value!=='object')return false;const v=value as SavedView;return typeof v.id==='string'&&v.pageId==='notifications'&&typeof v.name==='string'&&!!validateNotificationFilters(v.filters)&&typeof v.updatedAt==='string'}
