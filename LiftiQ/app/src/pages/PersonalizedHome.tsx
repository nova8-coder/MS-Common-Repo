import { useMemo, useState } from 'react'
import type { ActivityEvent, NotificationFilters, PersonalizationState, SavedView } from '../logic/personalization'
import { allStations, pumpMaintenanceData } from '../data/mockData'
import type { StationRecord } from '../data/mockData'
import type { AlarmLifecycle } from '../data/model'
import { Empty, formatDate } from '../components/UI'

type PageId = 'dashboard' | 'stations' | 'alarms' | 'notifications'
type RankedAsset = { assetId: string; pinned: boolean; recent: boolean; frequent: boolean; distinctDays: number; distinctSessions: number; lastViewedAt: string; reason: string }
type NextAction = { id: string; kind: 'operational' | 'recurring' | 'continuation' | 'saved'; title: string; reason: string; action: string; open: () => void; dismissible: boolean }
const openStatuses = ['Active', 'Acknowledged', 'Recovery review']
const reportIsStale = (station: StationRecord, now: number) => !station.t || now - Date.parse(station.t) > 24 * 60 * 60 * 1000
const stationAttention = (station: StationRecord, alarms: AlarmLifecycle[], now: number) => {
  const active = alarms.filter(alarm => alarm.station === station.n && openStatuses.includes(alarm.status))
  if (active.length) return { label: `${active.length} active alarm${active.length === 1 ? '' : 's'}`, tone: 'red' }
  if (reportIsStale(station, now)) return { label: station.t ? 'Report is stale' : 'No report timestamp', tone: 'gray' }
  if (station.p.some(pump => pump?.run === 'fault')) return { label: 'Pump fault in station data', tone: 'amber' }
  return { label: 'No active alarm in source records', tone: 'green' }
}
const filterSummary = (filters: NotificationFilters) => [filters.query && `Search: ${filters.query}`, filters.type && `Type: ${filters.type}`, filters.read && `Status: ${filters.read}`].filter(Boolean).join(' · ') || 'No filters applied'
const friendlyAction = (event: ActivityEvent) => {
  if (event.type === 'asset_viewed') return 'Viewed asset'
  if (event.type === 'asset_tab_viewed') return `Viewed ${event.pageId.replaceAll('-', ' ')}`
  if (event.type === 'filter_applied') return 'Applied notification filters'
  if (event.type === 'saved_view_opened') return 'Opened saved view'
  if (event.type === 'suggestion_opened') return 'Opened suggestion'
  if (event.type === 'shortcut_used') return 'Used workspace shortcut'
  if (event.type === 'home_action') return 'Used a Home shortcut'
  return event.type.replaceAll('_', ' ')
}

export function PersonalizedHome({
  state, alarms, onNavigate, onOpenStation, onOpenAlarm, onOpenView, onDeleteView, onMakeDefault, onPin, onActivity, onSetSuggestions, onResetInferred,
}: {
  state: PersonalizationState
  alarms: AlarmLifecycle[]
  onNavigate: (page: PageId) => void
  onOpenStation: (tab?: string) => void
  onOpenAlarm: (id: string) => void
  onOpenView: (filters: NotificationFilters, viewId?: string) => void
  onDeleteView: (viewId: string) => void
  onMakeDefault: (page: 'dashboard' | 'personalized') => void
  onPin: (assetId: string) => void
  onActivity: (type: ActivityEvent['type'], page: string, metadata?: Record<string, string | number | boolean>, assetId?: string) => void
  onSetSuggestions: (enabled: boolean) => void
  onResetInferred: () => void
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [learnMoreOpen, setLearnMoreOpen] = useState(false)
  const [manageViewsOpen, setManageViewsOpen] = useState(false)
  const now = Date.now()
  const inferenceEvents = useMemo(() => state.events.filter(event => !state.inferenceResetAt || event.at >= state.inferenceResetAt), [state.events, state.inferenceResetAt])
  const ranks = useMemo<RankedAsset[]>(() => rankAssets(inferenceEvents, allStations.map(station => station.n), state.pinnedAssetIds), [inferenceEvents, state.pinnedAssetIds])
  const activeAlarms = alarms.filter(alarm => openStatuses.includes(alarm.status))
  const staleCount = allStations.filter(station => reportIsStale(station, now)).length
  const normalCount = allStations.filter(station => !reportIsStale(station, now) && !activeAlarms.some(alarm => alarm.station === station.n) && !station.p.some(pump => pump?.run === 'fault')).length
  const maintenanceDue = Object.values(pumpMaintenanceData).flat().filter(item => !item.maintained && Date.parse(`${item.scheduled}T23:59:59`) <= now + 30 * 86400000).length
  const attentionIds = [...new Set(activeAlarms.map(alarm => alarm.station))]
  const priorityIds = [...new Set([...state.pinnedAssetIds, ...attentionIds, ...ranks.filter(rank => rank.recent || rank.frequent).map(rank => rank.assetId)])].filter(id => allStations.some(station => station.n === id)).slice(0, 5)
  const recentActivity = state.events.filter(event => ['asset_viewed', 'asset_tab_viewed', 'filter_applied', 'saved_view_opened', 'suggestion_opened', 'shortcut_used', 'home_action'].includes(event.type)).slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
  const latestNavigation = inferenceEvents.filter(event => ['asset_viewed', 'asset_tab_viewed'].includes(event.type) && event.assetId && now - Date.parse(event.at) <= 7 * 86400000).slice().sort((a, b) => b.at.localeCompare(a.at))[0]
  const nextActions = useMemo<NextAction[]>(() => {
    const actions: NextAction[] = []
    const openAlarm = activeAlarms[0]
    if (openAlarm) actions.push({ id: `alarm-${openAlarm.id}`, kind: 'operational', title: `Review ${openAlarm.name} at ${openAlarm.station}`, reason: `${openAlarm.severity} priority · ${openAlarm.status} lifecycle · ${openAlarm.events.length} recorded event(s).`, action: 'Open alarm details', open: () => onOpenAlarm(openAlarm.id), dismissible: false })
    if (state.suggestionsEnabled !== false) {
      const recurring = ranks.find(rank => rank.frequent && !rank.pinned && !attentionIds.includes(rank.assetId))
      if (recurring && actions.length < 3) {
        const lastTab = inferenceEvents.filter(event => event.type === 'asset_tab_viewed' && event.assetId === recurring.assetId).slice().sort((a, b) => b.at.localeCompare(a.at))[0]
        const tab = lastTab?.pageId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Pump Health'
        actions.push({ id: `recurring-${recurring.assetId}`, kind: 'recurring', title: recurring.assetId === 'NOVA_02' ? `Resume ${tab} on ${recurring.assetId}` : `Revisit ${recurring.assetId} in Lift Stations`, reason: `Recurring activity across ${recurring.distinctDays} days and ${recurring.distinctSessions} sessions. This indicates a regular workflow, not a maintenance condition.`, action: recurring.assetId === 'NOVA_02' ? `Open ${tab}` : 'Open Lift Stations', open: () => recurring.assetId === 'NOVA_02' ? onOpenStation(tab) : onNavigate('stations'), dismissible: true })
      }
      const continuation = latestNavigation
      if (continuation?.assetId && !state.pinnedAssetIds.includes(continuation.assetId) && !attentionIds.includes(continuation.assetId) && !actions.some(action => action.kind === 'recurring' && action.title.includes(continuation.assetId!)) && actions.length < 3) {
        const tab = continuation.type === 'asset_tab_viewed' ? continuation.pageId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Overview'
        actions.push({ id: `continue-${continuation.id}`, kind: 'continuation', title: continuation.assetId === 'NOVA_02' ? `Return to ${continuation.assetId} ${tab}` : `Return to ${continuation.assetId} in Lift Stations`, reason: `You viewed this ${continuation.assetId === 'NOVA_02' ? 'page' : 'asset'} ${formatDate(continuation.at)}. This is a recent-view shortcut, not an unfinished investigation.`, action: continuation.assetId === 'NOVA_02' ? 'Continue' : 'Open Lift Stations', open: () => continuation.assetId === 'NOVA_02' ? onOpenStation(tab) : onNavigate('stations'), dismissible: true })
      }
      const unusedView = state.savedViews.find(view => !state.dismissedSuggestions.includes(`saved-${view.id}`) && (!view.lastUsedAt || now - Date.parse(view.lastUsedAt) > 14 * 86400000))
      if (unusedView && actions.length < 3) actions.push({ id: `saved-${unusedView.id}`, kind: 'saved', title: `Return to ${unusedView.name}`, reason: `Saved workflow · ${filterSummary(unusedView.filters)}.`, action: 'Open saved view', open: () => onOpenView(unusedView.filters, unusedView.id), dismissible: true })
    }
    return actions
  }, [activeAlarms, state.suggestionsEnabled, state.savedViews, state.dismissedSuggestions, state.pinnedAssetIds, ranks, attentionIds.join('|'), inferenceEvents, latestNavigation, now])

  const openPriority = (id: string) => {
    onActivity('home_action', 'personalized-home', { destination: id }, id)
    if (activeAlarms.some(alarm => alarm.station === id && openStatuses.includes(alarm.status))) onNavigate('alarms')
    else if (id === 'NOVA_02') onOpenStation('Pump Health')
    else onNavigate('stations')
  }
  const openActivity = (event: ActivityEvent) => {
    if (event.type === 'saved_view_opened' && typeof event.metadata?.viewId === 'string') {
      const view = state.savedViews.find(item => item.id === event.metadata?.viewId)
      if (view) return onOpenView(view.filters, view.id)
    }
    if (event.assetId && event.type === 'asset_tab_viewed') {
      const tab = event.pageId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      return event.assetId === 'NOVA_02' ? onOpenStation(tab) : onNavigate('stations')
    }
    if (event.assetId) return openPriority(event.assetId)
    const target = String(event.metadata?.destination || '')
    if (target === 'alarms') return onNavigate('alarms')
    if (target === 'notifications' || event.pageId === 'notifications') return onNavigate('notifications')
    if (target === 'trends' || target === 'pump-health') return onOpenStation('Trends')
    if (target === 'station-maintenance' || target === 'maintenance') return onOpenStation('Maintenance')
    onNavigate('stations')
  }
  const dismissSuggestion = (id: string) => onActivity('suggestion_dismissed', 'personalized-home', { suggestionId: id })
  const counts = [
    { title: 'Active Alarms', value: String(activeAlarms.length), note: 'Current alarm lifecycle records', tone: 'red', action: () => onNavigate('alarms') },
    { title: 'Stations Not Reporting', value: String(staleCount), note: 'No report or last report over 24 hours old', tone: 'amber', action: () => onNavigate('stations') },
    { title: 'Stations Operating Normally', value: String(normalCount), note: 'Fresh report, no active alarm or pump fault', tone: 'green', action: () => onNavigate('stations') },
    { title: 'Maintenance Due', value: String(maintenanceDue), note: 'NOVA_02 schedule entries due in 30 days', tone: 'blue', action: () => onOpenStation('Maintenance') },
    { title: 'Assigned Stations', value: '—', note: 'Assignment data is not available in this prototype', tone: 'purple', action: () => onNavigate('stations') },
  ]

  return <div className="home-container">
    <div className="home-top-row"><div className="home-greeting-wrap"><div className="home-greeting">Operations workspace</div><h1 className="home-title">Personalized Home</h1><p className="home-subtitle">Current operations first, with shortcuts based on your saved choices and recorded activity.</p></div><div className="home-top-actions"><div className="personalized-callout-card"><div className="personalized-callout-icon">✦</div><div className="personalized-callout-text"><strong>Local prototype personalization</strong><span>Suggestions use this browser’s recorded actions and mock records.</span><button className="link-btn" onClick={() => setLearnMoreOpen(true)}>How this works</button></div></div><button className="btn-personalization-settings" onClick={() => setSettingsOpen(true)}>⚙ Personalization Settings</button></div></div>

    <section aria-label="Operational attention"><div className="home-section-label">Operational attention <span>Not ranked by personal usage</span></div><div className="home-kpi-row">{counts.map(item => <button className="home-kpi-card" key={item.title} onClick={item.action}><span className={`kpi-number text-${item.tone}`}>{item.value}</span><span className="kpi-content"><b className="kpi-label">{item.title}</b><small>{item.note}</small></span><span className="kpi-arrow">›</span></button>)}</div>{activeAlarms.length > 0 && <div className="home-critical-strip"><b>{activeAlarms.length} open alarm record{activeAlarms.length === 1 ? '' : 's'}</b><button onClick={() => onNavigate('alarms')}>Open alarm list →</button><span>Operational attention stays visible regardless of personalization.</span></div>}</section>

    <section className="home-next-actions"><div className="home-next-heading"><div><h2>Your Next Best Actions</h2><p>Operational needs, recurring work, and recent views are shown for different reasons.</p></div><span className="subtle-chip-blue">Local prototype data</span></div>{nextActions.length ? <div className="next-action-list">{nextActions.map(action => <article className={`next-action-row next-action-${action.kind}`} key={action.id}><span className="next-action-marker">{action.kind === 'operational' ? '!' : action.kind === 'recurring' ? '↻' : action.kind === 'continuation' ? '◷' : '▤'}</span><div className="next-action-copy"><span className="next-action-kind">{action.kind === 'operational' ? 'Operational priority' : action.kind === 'recurring' ? 'Recurring workflow' : action.kind === 'continuation' ? 'Recent view' : 'Saved workflow'}</span><b>{action.title}</b><p>{action.reason}</p></div><button className="btn-open-blue" onClick={() => { onActivity(action.dismissible ? 'suggestion_opened' : 'home_action', 'personalized-home', { destination: action.id }); action.open() }}>{action.action} →</button>{action.dismissible && <button className="btn-dismiss-x" aria-label={`Dismiss ${action.title}`} onClick={() => dismissSuggestion(action.id)}>✕</button>}</article>)}</div> : <div className="next-action-empty"><b>No suggested next actions right now</b><span>Open alarm records remain visible above. Personal suggestions appear when local activity or saved views provide a clear reason.</span>{state.suggestionsEnabled === false && <button className="link-btn" onClick={() => setSettingsOpen(true)}>Turn on suggestions</button>}</div>}</section>

    <div className="home-main-grid">
      <section className="home-content-card"><div className="card-header-line"><div className="card-title-group"><h2 className="card-title">Priority Assets</h2><span className="subtle-chip-blue">Pinned, recent, frequent, or needs attention</span></div><button className="card-action-link" onClick={() => onNavigate('stations')}>View stations</button></div><div className="home-table-wrap"><table className="home-table"><thead><tr><th>Station / Asset</th><th>Current source status</th><th>Why shown</th><th>Actions</th></tr></thead><tbody>{priorityIds.map(id => { const asset = allStations.find(item => item.n === id)!; const rank = ranks.find(item => item.assetId === id); const attention = stationAttention(asset, alarms, now); const reason = state.pinnedAssetIds.includes(id) ? 'Pinned by you' : attentionIds.includes(id) ? 'Has an open alarm record' : rank?.frequent ? `Used across ${rank.distinctDays} days` : rank?.recent ? 'Recently opened' : 'Current station record'; return <tr key={id}><td><b>{id}</b><small className="home-row-sub">Lift station · local demo record</small></td><td><span className={`home-status home-status-${attention.tone}`}>{attention.label}</span></td><td>{reason}</td><td><div className="home-row-actions"><button className="btn-open-blue" onClick={() => openPriority(id)}>{id === 'NOVA_02' ? 'Open Pump Health' : 'Open stations'}</button><button className="home-pin-button" aria-label={state.pinnedAssetIds.includes(id) ? `Unpin ${id}` : `Pin ${id}`} onClick={() => onPin(id)}>{state.pinnedAssetIds.includes(id) ? '★ Pinned' : '☆ Pin'}</button></div></td></tr> })}{priorityIds.length === 0 && <tr><td colSpan={4}><Empty title="No priority assets yet" detail="Pinned assets, recent activity, and open alarm records will appear here. Browse Lift Stations to get started." /></td></tr>}</tbody></table></div></section>

      <section className="home-content-card"><div className="card-header-line"><h2 className="card-title">Recent Activity</h2><span className="muted text-xs">User actions · local browser history</span></div>{recentActivity.length ? <div className="home-activity-list">{recentActivity.map(event => <button className="home-activity-row" key={event.id} onClick={() => openActivity(event)}><span className="home-activity-icon">◷</span><span><b>{friendlyAction(event)}</b><small>{event.assetId || event.metadata?.name || event.pageId.replaceAll('-', ' ')}</small></span><time>{formatDate(event.at)}</time></button>)}</div> : <Empty title="No recent actions in this browser" detail="Assets and views you open will appear here for quick continuation." />}</section>

      <section className="home-content-card"><div className="card-header-line"><h2 className="card-title">Saved Views</h2><button className="card-action-link" onClick={() => setManageViewsOpen(true)}>Manage Views</button></div>{state.savedViews.length ? <div className="home-saved-list">{state.savedViews.slice(0, 4).map(view => <SavedViewRow key={view.id} view={view} onOpen={() => { onActivity('saved_view_opened', 'personalized-home', { viewId: view.id, name: view.name }); onOpenView(view.filters, view.id) }} />)}</div> : <div className="home-inline-empty"><b>No saved views yet</b><span>Save a filter in Notifications to return to that workflow here.</span><button className="btn soft" onClick={() => onNavigate('notifications')}>Open Notifications</button></div>}</section>

    </div>

    {settingsOpen && <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}><div className="modal-window home-settings-window" role="dialog" aria-modal="true" aria-labelledby="home-settings-title" onClick={event => event.stopPropagation()}><div className="modal-header"><h2 id="home-settings-title">Personalization Settings</h2><button className="btn-close" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>✕</button></div><div className="modal-body"><p className="text-muted text-sm mb-4">Settings affect this browser’s Home workspace. Operational alarm visibility remains independent of personalization.</p><div className="setting-group mb-4"><label className="font-semibold block mb-2 text-sm">Default Landing Page</label><div className="radio-option"><label><input type="radio" name="landing" checked={state.defaultLanding === 'personalized'} onChange={() => onMakeDefault('personalized')} /> Personalized Home</label></div><div className="radio-option mt-1"><label><input type="radio" name="landing" checked={state.defaultLanding === 'dashboard'} onChange={() => onMakeDefault('dashboard')} /> Standard Operations Dashboard</label></div></div><div className="home-settings-toggle"><label><span><b>Personalized suggestions</b><small>Show suggestions from recent asset activity and saved views.</small></span><input type="checkbox" checked={state.suggestionsEnabled !== false} onChange={event => onSetSuggestions(event.target.checked)} /></label></div><div className="home-settings-pins"><b>Pinned station shortcuts</b><small>Pins are explicit preferences and are not removed when inferred history is reset.</small>{allStations.map(asset => <label key={asset.n}><input type="checkbox" checked={state.pinnedAssetIds.includes(asset.n)} onChange={() => onPin(asset.n)} /><span>{asset.n}</span></label>)}</div><div className="border-t border-slate-200 pt-4"><button className="btn-danger-outline" onClick={() => { if (window.confirm('Clear inferred Home recommendations and recent activity? Saved views and pinned stations will be kept.')) { onResetInferred() } }}>Reset inferred personalization</button></div></div><div className="modal-footer"><button className="btn-open-blue" onClick={() => setSettingsOpen(false)}>Done</button></div></div></div>}
    {manageViewsOpen && <div className="modal-backdrop" onClick={() => setManageViewsOpen(false)}><div className="modal-window" role="dialog" aria-modal="true" aria-labelledby="manage-views-title" onClick={event => event.stopPropagation()}><div className="modal-header"><h2 id="manage-views-title">Manage Saved Views</h2><button className="btn-close" aria-label="Close" onClick={() => setManageViewsOpen(false)}>✕</button></div><div className="modal-body">{state.savedViews.length ? state.savedViews.map(view => <div className="manage-saved-view" key={view.id}><span><b>{view.name}</b><small>{filterSummary(view.filters)}</small></span><button className="btn-danger-outline" onClick={() => { if (window.confirm(`Delete saved view “${view.name}”?`)) onDeleteView(view.id) }}>Delete</button></div>) : <Empty title="No saved views" detail="Create a saved filter from Notifications." />}<button className="btn soft mt-3" onClick={() => { setManageViewsOpen(false); onNavigate('notifications') }}>Open Notifications</button></div></div></div>}
    {learnMoreOpen && <div className="modal-backdrop" onClick={() => setLearnMoreOpen(false)}><div className="modal-window" role="dialog" aria-modal="true" aria-labelledby="home-about-title" onClick={event => event.stopPropagation()}><div className="modal-header"><h2 id="home-about-title">About Personalized Home</h2><button className="btn-close" aria-label="Close" onClick={() => setLearnMoreOpen(false)}>✕</button></div><div className="modal-body text-sm space-y-3"><p>Operational counts come from the current alarm and station demo records. Pinned shortcuts are explicit choices. Frequency shortcuts require visits across at least three distinct days and multiple sessions; repeated visits in one short session do not count as a stable preference.</p><p>Station records and measurement timestamps are local mock data. This page does not receive live telemetry or access-control updates.</p></div><div className="modal-footer"><button className="btn-open-blue" onClick={() => setLearnMoreOpen(false)}>Got it</button></div></div></div>}
  </div>
}

function SavedViewRow({ view, onOpen }: { view: SavedView; onOpen: () => void }) {
  return <div className="home-saved-row"><span className="home-saved-icon">▤</span><span className="home-saved-main"><b>{view.name}</b><small>{filterSummary(view.filters)}</small></span><span className="home-saved-used">{view.lastUsedAt ? `Used ${formatDate(view.lastUsedAt)}` : `Saved ${formatDate(view.updatedAt)}`}</span><button className="btn-open-blue" onClick={onOpen}>Open</button></div>
}

function rankAssets(events: ActivityEvent[], accessibleIds: string[], pinnedIds: string[]): RankedAsset[] {
  const now = Date.now(), accessible = new Set(accessibleIds)
  const ids = [...new Set([...pinnedIds, ...events.filter(event => event.type === 'asset_viewed' && event.assetId && accessible.has(event.assetId) && now - Date.parse(event.at) <= 90 * 86400000).map(event => event.assetId!)])]
  return ids.map(assetId => {
    const history = events.filter(event => event.type === 'asset_viewed' && event.assetId === assetId && now - Date.parse(event.at) <= 28 * 86400000)
    const days = new Set(history.map(event => event.at.slice(0, 10)))
    const sessions = new Set(history.map(event => event.sessionId))
    const latest = history.slice().sort((a, b) => b.at.localeCompare(a.at))[0]?.at || ''
    const recent = !!latest && now - Date.parse(latest) <= 3 * 86400000
    const frequent = days.size >= 3 && sessions.size >= 2
    const pinned = pinnedIds.includes(assetId)
    return { assetId, pinned, recent, frequent, distinctDays: days.size, distinctSessions: sessions.size, lastViewedAt: latest, reason: pinned ? 'Pinned by you' : frequent ? `Viewed across ${days.size} days` : recent ? 'Recently opened' : 'Recorded asset activity' }
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.frequent) - Number(a.frequent) || Date.parse(b.lastViewedAt || '1970-01-01') - Date.parse(a.lastViewedAt || '1970-01-01'))
}
