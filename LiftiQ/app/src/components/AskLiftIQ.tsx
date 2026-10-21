import { useMemo, useState } from 'react'
import type { AlarmLifecycle } from '../data/model'
import type { NotificationFilters, SavedView } from '../logic/personalization'
import { allStations } from '../data/mockData'
import { formatDate } from './UI'

type Route = 'dashboard' | 'personalized' | 'stations' | 'watch' | 'alarms' | 'notifications' | 'reports'
type Answer = { title: string; detail: string; rows?: Array<{ label: string; detail: string }>; actions?: Array<{ label: string; run: () => void }> }

export function AskLiftIQ({ alarms, savedViews, onNavigate, onOpenStation, onOpenSavedView }: {
  alarms: AlarmLifecycle[]
  savedViews: SavedView[]
  onNavigate: (route: Route) => void
  onOpenStation: (tab?: string) => void
  onOpenSavedView: (filters: NotificationFilters, id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)
  const alarmByStation = useMemo(() => alarms.filter(alarm => ['Active', 'Acknowledged', 'Recovery review'].includes(alarm.status)), [alarms])

  const ask = (text = question) => {
    setQuestion(text)
    const normalized = text.trim().toLowerCase()
    if (!normalized) return setAnswer({ title: 'Ask about existing LiftIQ records', detail: 'Enter a question or choose one of the supported examples below.' })
    if (normalized.includes('active') && (normalized.includes('alarm') || normalized.includes('station'))) {
      const stations = [...new Set(alarmByStation.map(alarm => alarm.station))]
      return setAnswer({ title: `${alarmByStation.length} open alarm record${alarmByStation.length === 1 ? '' : 's'}`, detail: 'Based on alarm lifecycle records loaded in this local prototype. This is not a live device query.', rows: alarmByStation.slice(0, 5).map(alarm => ({ label: `${alarm.station} · ${alarm.name}`, detail: `${alarm.severity} · ${alarm.status} · ${formatDate(alarm.startedAt)}` })), actions: [{ label: 'Open Alarms', run: () => { onNavigate('alarms'); setOpen(false) } }, ...(stations.length === 1 && stations[0] === 'NOVA_02' ? [{ label: 'Open NOVA_02 Pump Health', run: () => { onOpenStation('Pump Health'); setOpen(false) } }] : [])] })
    }
    const asset = allStations.find(station => normalized.includes(station.n.toLowerCase()))
    if ((normalized.includes('recent') || normalized.includes('changed') || normalized.includes('event') || normalized.includes('history')) && asset) {
      const records = alarms.filter(alarm => alarm.station === asset.n).flatMap(alarm => alarm.events.map(event => ({ at: event.at, label: `${alarm.name} · ${event.title}`, detail: event.value || event.detail }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
      return setAnswer({ title: `Alarm history for ${asset.n}`, detail: records.length ? 'These are the available alarm events for this asset. Other station activity may not be represented in this local data.' : 'No alarm event records are available for this asset in the loaded dataset.', rows: records.map(record => ({ label: record.label, detail: `${formatDate(record.at)} · ${record.detail}` })), actions: [{ label: 'Open Events & History', run: () => { onNavigate('reports'); setOpen(false) } }] })
    }
    if ((normalized.includes('open') || normalized.includes('show') || normalized.includes('go')) && normalized.includes('pump health') && !normalized.includes('saved view')) {
      return setAnswer({ title: 'Pump Health is available for NOVA_02', detail: 'The detailed Pump Health view in this prototype is backed by illustrative local sample data.', actions: [{ label: 'Open Pump Health', run: () => { onOpenStation('Pump Health'); setOpen(false) } }] })
    }
    if (normalized.includes('saved view') || normalized.includes('saved pump health')) {
      if (!savedViews.length) return setAnswer({ title: 'No saved views found', detail: 'This browser has no saved notification views. The current saved view model supports Notifications filters only; it does not contain a saved Pump Health view.' })
      return setAnswer({ title: 'Saved notification views', detail: 'Saved views in this prototype contain Notifications filters.', rows: savedViews.slice(0, 5).map(view => ({ label: view.name, detail: view.filters.type || view.filters.read || view.filters.query ? `Filters: ${[view.filters.type, view.filters.read, view.filters.query].filter(Boolean).join(' · ')}` : 'No filters' })), actions: savedViews.slice(0, 3).map(view => ({ label: `Open ${view.name}`, run: () => { onOpenSavedView(view.filters, view.id); setOpen(false) } })) })
    }
    return setAnswer({ title: 'I can’t answer that from the available data', detail: 'This local helper supports open alarm records, alarm event history for a named asset, Pump Health navigation, and saved notification views. It does not compare time periods, diagnose root causes, or query live devices.' })
  }

  return <>
    <button className="ask-liftiq-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog">Ask LiftIQ</button>
    {open && <div className="ask-backdrop" onClick={() => setOpen(false)}><section className="ask-panel" role="dialog" aria-modal="true" aria-labelledby="ask-title" onClick={event => event.stopPropagation()}><div className="ask-header"><div><span className="eyebrow">Local data helper · no AI service</span><h2 id="ask-title">Ask LiftIQ</h2></div><button className="btn-close" aria-label="Close Ask LiftIQ" onClick={() => setOpen(false)}>✕</button></div><p className="ask-disclosure">Answers are looked up from records already loaded in this browser. No operational actions are performed.</p><form className="ask-form" onSubmit={event => { event.preventDefault(); ask() }}><input className="input" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about alarms, events, or navigation" aria-label="Your question" /><button className="btn primary">Ask</button></form><div className="ask-examples"><small>Try a supported question</small><div><button onClick={() => ask('Which stations have active alarms?')}>Stations with active alarms</button><button onClick={() => ask('Show recent events for NOVA_02')}>Recent NOVA_02 events</button><button onClick={() => ask('Open Pump Health')}>Open Pump Health</button></div></div>{answer && <div className="ask-answer" aria-live="polite"><b>{answer.title}</b><p>{answer.detail}</p>{answer.rows?.map((row, index) => <div className="ask-answer-row" key={`${row.label}-${index}`}><strong>{row.label}</strong><small>{row.detail}</small></div>)}{answer.actions?.length ? <div className="ask-actions">{answer.actions.map(action => <button key={action.label} className="btn soft" onClick={action.run}>{action.label}</button>)}</div> : null}</div>}</section></div>}
  </>
}
