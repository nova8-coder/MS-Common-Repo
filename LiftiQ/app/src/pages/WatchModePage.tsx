import { useEffect, useMemo, useState } from 'react'
import { allStations } from '../data/mockData'
import type { StationRecord } from '../data/mockData'
import type { AlarmLifecycle } from '../data/model'
import { Badge, Empty, PageTitle, Panel, SectionHeading, formatDate } from '../components/UI'

type Purpose = 'Maintenance Verification' | 'Operational Monitoring' | 'Post-Command Verification' | 'Field Inspection' | 'Other'
type SessionEvent = { id: string; at: string; title: string; detail: string }
type WatchSession = {
  id: string
  name: string
  assetIds: string[]
  purpose: Purpose
  startedAt: string
  expiresAt: string
  status: 'Active' | 'Ended' | 'Expired'
  events: SessionEvent[]
  endedAt?: string
}

const STORAGE_KEY = 'liftiq-watch-sessions-v1'
const purposes: Purpose[] = ['Maintenance Verification', 'Operational Monitoring', 'Post-Command Verification', 'Field Inspection', 'Other']
const presetDurations: Record<string, number> = { '30 minutes': 30, '2 hours': 120, '4 hours': 240, '8 hours': 480 }
const readSessions = (): WatchSession[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.id === 'string' && Array.isArray(item.assetIds)) : []
  } catch {
    return []
  }
}
const durationLabel = (minutes: number) => minutes < 60 ? `${minutes} min` : `${minutes / 60} hr${minutes === 60 ? '' : 's'}`
const remainingLabel = (expiresAt: string, now: number) => {
  const ms = new Date(expiresAt).getTime() - now
  if (ms <= 0) return 'Expired'
  const mins = Math.ceil(ms / 60000)
  return mins < 60 ? `${mins} min remaining` : `${Math.floor(mins / 60)}h ${mins % 60}m remaining`
}
const logEvent = (title: string, detail: string): SessionEvent => ({ id: `watch-event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), title, detail })
const stationStatus = (station: StationRecord) => station.al > 0 ? `${station.al} active alarm${station.al === 1 ? '' : 's'}` : station.p.some(p => p?.run === 'fault') ? 'Pump fault' : 'No active alarms'
const reportIsStale = (station: StationRecord, now: number) => !station.t || now - new Date(station.t).getTime() > 24 * 60 * 60 * 1000

export function WatchModePage({ alarms, initialAssets, onToast }: { alarms: AlarmLifecycle[]; initialAssets?: string[]; onToast: (message: string) => void }) {
  const [sessions, setSessions] = useState<WatchSession[]>(readSessions)
  const [now, setNow] = useState(Date.now())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<WatchSession | null>(null)
  const [name, setName] = useState('')
  const [assetIds, setAssetIds] = useState<string[]>([])
  const [purpose, setPurpose] = useState<Purpose>('Operational Monitoring')
  const [duration, setDuration] = useState('2 hours')
  const [customMinutes, setCustomMinutes] = useState('60')
  const [search, setSearch] = useState('')
  const [extendBy, setExtendBy] = useState<string>('No extension')

  const commitSessions = (next: WatchSession[], successMessage?: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setSessions(next)
      if (successMessage) onToast(successMessage)
      return true
    } catch {
      onToast('Watch Mode changes could not be saved in this browser.')
      return false
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let changed = false
    const next = sessions.map(session => {
        if (session.status === 'Active' && new Date(session.expiresAt).getTime() <= now) {
          changed = true
          return { ...session, status: 'Expired' as const, endedAt: session.expiresAt, events: [...session.events, logEvent('Session expired', 'The scheduled Watch Mode duration elapsed. Asset monitoring was not changed.')] }
        }
        return session
    })
    if (changed) commitSessions(next)
  }, [now, sessions])

  const activeSessions = sessions.filter(session => session.status === 'Active')
  const history = sessions.filter(session => session.status !== 'Active')
  const selectedSession = sessions.find(session => session.id === selectedId) || null
  const filteredAssets = useMemo(() => allStations.filter(station => station.n.toLowerCase().includes(search.toLowerCase())), [search])
  const availableDuration = duration === 'Custom' ? Number(customMinutes) : presetDurations[duration]
  const validDuration = Number.isInteger(availableDuration) && availableDuration >= 1 && availableDuration <= 1440

  const openStart = (ids: string[] = []) => {
    setName('')
    setAssetIds([...new Set(ids)])
    setPurpose('Operational Monitoring')
    setDuration('2 hours')
    setCustomMinutes('60')
    setSearch('')
    setEditing(false)
    setDraft(null)
    setFormOpen(true)
  }
  const startSession = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !assetIds.length || !validDuration) return
    const startedAt = new Date().toISOString()
    const session: WatchSession = {
      id: `watch-${Date.now()}`, name: name.trim(), assetIds, purpose, startedAt,
      expiresAt: new Date(Date.now() + availableDuration * 60000).toISOString(), status: 'Active',
      events: [logEvent('Session started', `${assetIds.length} asset${assetIds.length === 1 ? '' : 's'} added for ${durationLabel(availableDuration)}.`)],
    }
    if (!commitSessions([session, ...sessions], 'Watch session started and saved in this browser.')) return
    setFormOpen(false)
    setSelectedId(session.id)
  }
  const openEdit = (session: WatchSession) => {
    setDraft({ ...session, assetIds: [...session.assetIds], events: [...session.events] })
    setAssetIds([...session.assetIds])
    setPurpose(session.purpose)
    setExtendBy('No extension')
    setCustomMinutes('60')
    setSearch('')
    setEditing(true)
    setFormOpen(true)
  }
  const closeForm = () => {
    const dirty = editing && !!draft && (draft.assetIds.length !== assetIds.length || draft.assetIds.some(id => !assetIds.includes(id)) || draft.purpose !== purpose || extendBy !== 'No extension')
    if (dirty && !window.confirm('Discard unsaved Watch Mode changes?')) return
    setFormOpen(false)
    setDraft(null)
  }
  const saveEdit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft || !assetIds.length) return
    const extra = extendBy === 'No extension' ? 0 : extendBy === 'Custom' ? Number(customMinutes) : presetDurations[extendBy]
    const extendedExpiry = new Date(new Date(draft.expiresAt).getTime() + extra * 60000).toISOString()
    const changes: string[] = []
    const added = assetIds.filter(id => !draft.assetIds.includes(id))
    const removed = draft.assetIds.filter(id => !assetIds.includes(id))
    if (added.length) changes.push(`Added ${added.join(', ')}`)
    if (removed.length) changes.push(`Removed ${removed.join(', ')}`)
    if (purpose !== draft.purpose) changes.push(`Purpose changed to ${purpose}`)
    if (extra > 0) changes.push(`Duration extended by ${durationLabel(extra)}`)
    const updated: WatchSession = {
      ...draft, assetIds, purpose, expiresAt: extendedExpiry,
      events: changes.length ? [...draft.events, logEvent('Session updated', changes.join(' · '))] : draft.events,
    }
    const next = sessions.map(item => item.id === draft.id ? updated : item)
    if (!commitSessions(next, 'Watch session changes saved.')) return
    setFormOpen(false)
    setDraft(null)
  }
  const endSession = (session: WatchSession) => {
    if (!window.confirm(`End “${session.name}”? This only ends the Watch Mode workspace; asset monitoring and alarms continue.`)) return
    const at = new Date().toISOString()
    const next = sessions.map(item => item.id === session.id ? { ...item, status: 'Ended' as const, endedAt: at, events: [...item.events, logEvent('Session ended', 'Ended by user. Asset monitoring was not changed.')] } : item)
    if (!commitSessions(next, 'Watch session ended and saved to history.')) return
    setSelectedId(null)
  }

  if (selectedSession?.status === 'Active') {
    const session = selectedSession
    const assets = session.assetIds.map(id => allStations.find(station => station.n === id)).filter((item): item is StationRecord => !!item)
    const relatedEvents = alarms.filter(alarm => session.assetIds.includes(alarm.station)).flatMap(alarm => alarm.events.map(event => ({ id: event.id, at: event.at, title: `${alarm.name} · ${event.title}`, detail: `${alarm.station} · ${event.detail}`, status: alarm.status })))
    const timeline = [...relatedEvents, ...session.events.map(event => ({ ...event, status: 'Session' }))].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    return <>
      <PageTitle eyebrow="Temporary monitoring workspace" title={session.name} description={`${session.purpose} · Started ${formatDate(session.startedAt)}`} actions={<><button className="btn" onClick={() => setSelectedId(null)}>← Watch Mode</button><button className="btn soft" onClick={() => openEdit(session)}>Edit Session</button><button className="btn" onClick={() => endSession(session)}>End Session</button></>} />
      <div className="watch-session-summary"><Panel className="watch-summary-card"><span className="muted">Session status</span><Badge tone="good">Active</Badge></Panel><Panel className="watch-summary-card"><span className="muted">Expires</span><b>{formatDate(session.expiresAt)}</b><span className="watch-countdown">{remainingLabel(session.expiresAt, now)}</span></Panel><Panel className="watch-summary-card"><span className="muted">Assets monitored</span><b>{assets.length}</b></Panel></div>
      <SectionHeading title="Selected assets" action={<button className="btn soft" onClick={() => openEdit(session)}>Manage assets</button>} />
      <div className="watch-assets-grid">{assets.map(asset => {
        const stale = reportIsStale(asset, now)
        const lastReported = asset.t ? new Date(asset.t).toISOString() : undefined
        return <Panel className="watch-asset-card" key={asset.n}><div className="watch-asset-heading"><div><h2>{asset.n}</h2><span className="muted">Lift station</span></div><Badge tone={asset.al ? 'high' : asset.p.some(p => p?.run === 'fault') ? 'medium' : 'good'}>{stationStatus(asset)}</Badge></div><div className={`watch-freshness ${stale ? 'stale' : ''}`}>{stale ? 'Stale source data' : 'Source report available'}{lastReported ? ` · ${formatDate(lastReported)}` : ' · Last report unavailable'}</div><div className="watch-telemetry-grid"><div><small>Wet well level</small><b>{stale || asset.lv == null ? 'Unavailable' : `${asset.lv} in`}</b></div>{[0, 1, 2].map(index => <div key={index}><small>Pump {index + 1}</small><b>{stale || !asset.p[index]?.run ? 'Unavailable' : `${asset.p[index]?.run} · ${asset.hrs[index] ?? '—'}h`}</b></div>)}</div>{stale && <p className="watch-data-note">Values are withheld because the supplied demo report is over 24 hours old. This workspace does not receive live updates.</p>}</Panel>
      })}</div>
      {assets.length === 0 && <Panel><Empty title="No assets in this session" detail="Edit the session to add lift stations." /></Panel>}
      <Panel className="watch-events-panel"><SectionHeading title="Recent events" /><p className="muted watch-event-intro">Alarm records are historical source events. Session changes are listed separately.</p>{timeline.length ? <div className="watch-event-list">{timeline.map(event => <div className="watch-event" key={event.id}><span className={`watch-event-dot ${event.status === 'Session' ? 'session' : ''}`} /><div><div className="watch-event-heading"><b>{event.title}</b><Badge tone={event.status === 'Session' ? 'info' : event.status === 'Active' ? 'high' : 'neutral'}>{event.status}</Badge></div><p>{event.detail}</p><small>{formatDate(event.at)}</small></div></div>)}</div> : <Empty title="No events recorded" detail="Relevant alarm events will appear here when available." />}</Panel>
      {formOpen && <EditForm assets={filteredAssets} search={search} setSearch={setSearch} assetIds={assetIds} setAssetIds={setAssetIds} purpose={purpose} setPurpose={setPurpose} extendBy={extendBy} setExtendBy={setExtendBy} customMinutes={customMinutes} setCustomMinutes={setCustomMinutes} draft={draft} onClose={closeForm} onSave={saveEdit} now={now} />}
    </>
  }

  return <>
    <PageTitle eyebrow="Operations" title="Watch Mode" description="Create a temporary workspace to monitor selected lift stations together." actions={<button className="btn primary" onClick={() => openStart(initialAssets || [])}>＋ Start Watch Session</button>} />
    <Panel className="watch-section"><SectionHeading title="Active Watch Sessions" action={activeSessions.length > 0 ? <span className="muted">{activeSessions.length} active</span> : undefined} />{activeSessions.length ? <div className="watch-session-list">{activeSessions.map(session => <div className="watch-session-row" key={session.id}><div className="watch-session-info"><Badge tone="good">Active</Badge><h3>{session.name}</h3><p>{session.assetIds.length} assets · {session.purpose}</p><small>Started {formatDate(session.startedAt)} · Expires {formatDate(session.expiresAt)}</small><b className="watch-countdown">{remainingLabel(session.expiresAt, now)}</b></div><div className="watch-row-actions"><button className="btn primary" onClick={() => setSelectedId(session.id)}>View Session</button><button className="btn" onClick={() => openEdit(session)}>Edit Session</button><button className="btn" onClick={() => endSession(session)}>End Session</button></div></div>)}</div> : <div className="watch-empty"><div className="watch-empty-icon">◷</div><h3>No active watch sessions</h3><p>Create a focused workspace for a maintenance check, field visit, or operational follow-up.</p><button className="btn primary" onClick={() => openStart()}>Start Watch Session</button></div>}</Panel>
    <Panel className="watch-section"><SectionHeading title="Session history" />{history.length ? <div className="watch-history-list">{history.map(session => <div className="watch-history-row" key={session.id}><div><Badge tone={session.status === 'Expired' ? 'stale' : 'neutral'}>{session.status}</Badge><b>{session.name}</b><span>{session.assetIds.length} assets · {session.purpose}</span></div><small>{formatDate(session.startedAt)} – {formatDate(session.endedAt || session.expiresAt)}</small></div>)}</div> : <Empty title="No ended sessions yet" />}</Panel>
    {formOpen && <StartForm assets={filteredAssets} search={search} setSearch={setSearch} name={name} setName={setName} assetIds={assetIds} setAssetIds={setAssetIds} purpose={purpose} setPurpose={setPurpose} duration={duration} setDuration={setDuration} customMinutes={customMinutes} setCustomMinutes={setCustomMinutes} validDuration={validDuration} onClose={closeForm} onSubmit={startSession} />}
  </>
}

function AssetPicker({ assets, search, setSearch, assetIds, setAssetIds }: { assets: StationRecord[]; search: string; setSearch: (value: string) => void; assetIds: string[]; setAssetIds: (value: string[]) => void }) {
  return <div className="watch-picker"><label className="watch-label">Select lift stations <span>({assetIds.length} selected)</span></label><input className="input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search lift stations…" /><div className="watch-picker-list">{assets.map(asset => <label className="watch-picker-item" key={asset.n}><input type="checkbox" checked={assetIds.includes(asset.n)} onChange={event => setAssetIds(event.target.checked ? [...assetIds, asset.n] : assetIds.filter(id => id !== asset.n))} /><span><b>{asset.n}</b><small>{stationStatus(asset)} · {asset.t ? `Last report ${formatDate(new Date(asset.t).toISOString())}` : 'No report timestamp'}</small></span></label>)}{!assets.length && <Empty title="No stations match" />}</div></div>
}
function PurposeSelect({ value, onChange }: { value: Purpose; onChange: (value: Purpose) => void }) { return <label className="watch-label">Monitoring purpose<select className="input" value={value} onChange={event => onChange(event.target.value as Purpose)}>{purposes.map(option => <option key={option}>{option}</option>)}</select></label> }
function StartForm(props: { assets: StationRecord[]; search: string; setSearch: (value: string) => void; name: string; setName: (value: string) => void; assetIds: string[]; setAssetIds: (value: string[]) => void; purpose: Purpose; setPurpose: (value: Purpose) => void; duration: string; setDuration: (value: string) => void; customMinutes: string; setCustomMinutes: (value: string) => void; validDuration: boolean; onClose: () => void; onSubmit: (event: React.FormEvent) => void }) {
  return <div className="watch-modal-backdrop" role="presentation"><form className="watch-modal" onSubmit={props.onSubmit} role="dialog" aria-modal="true" aria-labelledby="watch-modal-title"><div className="watch-modal-header"><div><span className="eyebrow">Temporary workspace</span><h2 id="watch-modal-title">Start a Watch Session</h2></div><button type="button" className="watch-close" aria-label="Close" onClick={props.onClose}>×</button></div><div className="watch-modal-body"><label className="watch-label">Session name<input className="input" required maxLength={80} value={props.name} onChange={event => props.setName(event.target.value)} placeholder="e.g. NOVA weekly inspection" /></label><AssetPicker {...props} /><label className="watch-label">Monitoring duration<select className="input" value={props.duration} onChange={event => props.setDuration(event.target.value)}>{[...Object.keys(presetDurations), 'Custom'].map(option => <option key={option}>{option}</option>)}</select></label>{props.duration === 'Custom' && <label className="watch-label">Custom duration (minutes)<input className="input" type="number" min="1" max="1440" step="1" value={props.customMinutes} onChange={event => props.setCustomMinutes(event.target.value)} /><small>Enter 1 to 1,440 minutes (up to 24 hours).</small></label>}<PurposeSelect value={props.purpose} onChange={props.setPurpose} /></div><div className="watch-modal-footer"><span className="watch-form-error">{!props.validDuration ? 'Enter a valid duration.' : props.assetIds.length === 0 ? 'Select at least one lift station.' : ''}</span><button type="button" className="btn" onClick={props.onClose}>Cancel</button><button className="btn primary" disabled={!props.name.trim() || !props.assetIds.length || !props.validDuration}>Start Watching</button></div></form></div>
}
function EditForm(props: { assets: StationRecord[]; search: string; setSearch: (value: string) => void; assetIds: string[]; setAssetIds: (value: string[]) => void; purpose: Purpose; setPurpose: (value: Purpose) => void; extendBy: string; setExtendBy: (value: string) => void; customMinutes: string; setCustomMinutes: (value: string) => void; draft: WatchSession | null; onClose: () => void; onSave: (event: React.FormEvent) => void; now: number }) {
  const extension = props.extendBy === 'No extension' ? 0 : props.extendBy === 'Custom' ? Number(props.customMinutes) : presetDurations[props.extendBy]
  const expiry = props.draft ? new Date(new Date(props.draft.expiresAt).getTime() + (Number.isInteger(extension) && extension > 0 ? extension : 0) * 60000).toISOString() : ''
  const changes = props.draft ? [props.assetIds.filter(id => !props.draft!.assetIds.includes(id)).length ? `${props.assetIds.filter(id => !props.draft!.assetIds.includes(id)).length} asset(s) added` : '', props.draft.assetIds.filter(id => !props.assetIds.includes(id)).length ? `${props.draft.assetIds.filter(id => !props.assetIds.includes(id)).length} asset(s) removed` : '', props.purpose !== props.draft.purpose ? `Purpose: ${props.purpose}` : '', extension > 0 ? `Extension: ${durationLabel(extension)}` : 'No duration extension'].filter(Boolean) : []
  return <div className="watch-modal-backdrop" role="presentation"><form className="watch-modal" onSubmit={props.onSave} role="dialog" aria-modal="true" aria-labelledby="watch-edit-title"><div className="watch-modal-header"><div><span className="eyebrow">Session settings</span><h2 id="watch-edit-title">Edit Watch Session</h2></div><button type="button" className="watch-close" aria-label="Close" onClick={props.onClose}>×</button></div><div className="watch-modal-body"><AssetPicker assets={props.assets} search={props.search} setSearch={props.setSearch} assetIds={props.assetIds} setAssetIds={props.setAssetIds} /><PurposeSelect value={props.purpose} onChange={props.setPurpose} /><label className="watch-label">Extend duration by<select className="input" value={props.extendBy} onChange={event => props.setExtendBy(event.target.value)}>{[...Object.keys(presetDurations), 'Custom', 'No extension'].map(option => <option key={option} value={option}>{option}</option>)}</select></label>{props.extendBy === 'Custom' && <label className="watch-label">Custom extension (minutes)<input className="input" type="number" min="1" max="1440" step="1" value={props.customMinutes} onChange={event => props.setCustomMinutes(event.target.value)} /></label>}<Panel className="watch-review"><b>Review changes</b>{changes.length ? changes.map((change, index) => <span key={index}>{change}</span>) : <span>No configuration changes yet.</span>}<span>New expiry: {formatDate(expiry)}</span><small>Current expiry: {props.draft ? formatDate(props.draft.expiresAt) : '—'} · {props.draft ? remainingLabel(props.draft.expiresAt, props.now) : ''}</small></Panel></div><div className="watch-modal-footer"><span className="watch-form-error">{props.assetIds.length === 0 ? 'Keep at least one lift station selected.' : ''}</span><button type="button" className="btn" onClick={props.onClose}>Cancel</button><button className="btn primary" disabled={!props.assetIds.length || (props.extendBy === 'Custom' && (!Number.isInteger(Number(props.customMinutes)) || Number(props.customMinutes) < 1 || Number(props.customMinutes) > 1440))}>Save Changes</button></div></form></div>
}
