import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, Outlet, Route, Routes, useOutletContext, useSearchParams } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowRight, Bell, BellRing, Building2, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clock3, FileClock, Inbox, ListChecks, Mail, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react'
import { initialAudit, initialGroups, initialRules, initialThreads, organizations, recipients, sourceEventCatalog } from './data/mock'
import type { AuditEntry, Channel, EventObservation, LifecycleAssessment, NotificationRule, NotificationThread, Product, RecipientGroup, RepeatHandling, Severity, UserRole } from './data/types'
import { resolveDeepLinkedThread, simulateAcknowledge, simulateSnooze, updateThread, visibleThreads } from './services/mockService'
import { liftIQMockEvents } from './integrations/liftiq/mockEvents'
import { mergeLiftIQThreads } from './services/liftiqAdapter'
import { processLiftIQIntake } from './services/eventIntelligence'
import { buildNotificationRule, getRepeatHandling } from './services/ruleBuilder'
import { Drawer, EmptyState, Modal, PageHeading, SeverityBadge, StatusBadge, Toast, Toggle } from './components/ui'

type Context = {
  threads: NotificationThread[]; setThreads: React.Dispatch<React.SetStateAction<NotificationThread[]>>
  rules: NotificationRule[]; setRules: React.Dispatch<React.SetStateAction<NotificationRule[]>>
  groups: RecipientGroup[]; setGroups: React.Dispatch<React.SetStateAction<RecipientGroup[]>>
  audit: AuditEntry[]; addAudit: (action: string, target: string, summary: string, before?: string, after?: string) => void
  organizationId: string; role: UserRole; toast: (message: string) => void
  intakeObservations: EventObservation[]; assessments: LifecycleAssessment[]
}
const useApp = () => useOutletContext<Context>()
const products: Product[] = ['LiftIQ', 'TankIQ', 'FlowIQ', 'ReeferIQ', 'CloudIQ']
const severities: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Informational']
const roles: UserRole[] = ['Platform Administrator', 'Tenant Administrator', 'Operations User', 'Read-only Monitor']
const tabs: Array<{ value: 'All' | 'Unread' | 'Active' | 'Acknowledged' | 'Resolved' | 'Snoozed'; label: string }> = [
  { value: 'All', label: 'All' }, { value: 'Unread', label: 'Unread' }, { value: 'Active', label: 'Active' }, { value: 'Acknowledged', label: 'Acknowledged' }, { value: 'Resolved', label: 'Resolved' }, { value: 'Snoozed', label: 'Snoozed' },
]

const nav = [
  { to: '/', label: 'Overview', icon: Building2 },
  { to: '/inbox', label: 'Notification Inbox', icon: Inbox },
  { to: '/events', label: 'Incoming Events', icon: Activity },
  { to: '/rules', label: 'Notification Rules', icon: ListChecks },
  { to: '/recipients', label: 'Recipients & Groups', icon: Users },
  { to: '/preferences', label: 'Preferences', icon: SlidersHorizontal },
  { to: '/delivery', label: 'Delivery History', icon: Mail },
  { to: '/audit', label: 'Audit Log', icon: FileClock },
  { to: '/administration', label: 'Administration', icon: Settings2 },
]

export default function App() {
  const [threads, setThreads] = useState(() => mergeLiftIQThreads(initialThreads, liftIQMockEvents))
  const [rules, setRules] = useState(initialRules)
  const [groups, setGroups] = useState(initialGroups)
  const [audit, setAudit] = useState(initialAudit)
  const [organizationId, setOrganizationId] = useState(organizations[0].id)
  const [role, setRole] = useState<UserRole>('Tenant Administrator')
  const [toastMessage, setToastMessage] = useState('')
  const intake = processLiftIQIntake(liftIQMockEvents)
  const toast = useCallback((message: string) => setToastMessage(message), [])
  const addAudit = useCallback((action: string, target: string, summary: string, before?: string, after?: string) => {
    const entry: AuditEntry = { id: `audit-${Date.now()}`, time: new Date().toISOString(), actor: role === 'Platform Administrator' ? 'Platform admin (prototype)' : 'Subashini K (prototype)', organizationId, action, target, summary, before, after }
    setAudit(current => [entry, ...current])
  }, [organizationId, role])
  const context: Context = { threads, setThreads, rules, setRules, groups, setGroups, audit, addAudit, organizationId, role, toast, intakeObservations: intake.observations, assessments: intake.assessments }

  return <div className="app-shell">
    <aside className="sidebar">
      <Link to="/" className="brand"><span className="brand-mark">A<span>IQ</span></span><span><b>AssetIQ</b><small>NOTIFICATION PLATFORM</small></span></Link>
      <div className="sidebar-caption">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {nav.filter(item => item.to !== '/administration' || role === 'Platform Administrator' || role === 'Tenant Administrator').map(item => {
          const Icon = item.icon
          return <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{item.label}</span>{item.to === '/inbox' && <span className="side-count">{visibleThreads(threads, organizationId).filter(t => t.unread).length}</span>}</NavLink>
        })}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note"><span className="prototype-dot" /> Prototype workspace<br /><small>Mock data · no live delivery</small></div>
      <button className="sidebar-help" onClick={() => toast('Help and integration documentation are prototype placeholders.')}><CircleHelp size={16} /> Help & documentation</button>
    </aside>

    <div className="main-column">
      <header className="topbar">
        <div className="crumb"><span>AssetIQ</span><ChevronRight size={14} /><b>Notifications</b></div>
        <div className="topbar-controls">
          <label className="org-select"><Building2 size={15} /><select value={organizationId} disabled={role !== 'Platform Administrator'} onChange={e => setOrganizationId(e.target.value)} aria-label="Current organization">{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select><ChevronDown size={13} /></label>
          <span className="environment-pill"><i /> Prototype only</span>
          <button className="topbar-icon" aria-label="Help" onClick={() => toast('Help center is a prototype placeholder.')}><CircleHelp size={17} /></button>
          <div className="profile-select"><span className="avatar">S</span><select value={role} onChange={e => setRole(e.target.value as UserRole)} aria-label="Simulated user role">{roles.map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={13} /></div>
        </div>
      </header>
      <main className="page-content">
        <Routes>
          <Route element={<Outlet context={context} />}>
            <Route index element={<OrganizationDashboard />} />
            <Route path="dashboard" element={<OrganizationDashboard />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="events" element={<EventActivityPage />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="recipients" element={<GroupsPage />} />
            <Route path="preferences" element={<PreferencesPage />} />
            <Route path="delivery" element={<DeliveryPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="administration" element={<AdministrationPage />} />
            <Route path="*" element={<InboxPage />} />
          </Route>
        </Routes>
      </main>
      <footer className="app-footer"><span>AssetIQ Notification Platform · Prototype</span><span>Mock data only · Server authorization not connected</span></footer>
    </div>
    {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
  </div>
}

function OrganizationDashboard() {
  const { threads, intakeObservations, assessments, organizationId } = useApp()
  const scoped = visibleThreads(threads, organizationId)
  const unresolved = scoped.filter(thread => thread.event.sourceState !== 'recovered')
  const criticalCount = unresolved.filter(thread => thread.event.severity === 'Critical').length
  const otherCount = unresolved.filter(thread => thread.event.severity !== 'Critical').length
  const noisyCount = unresolved.filter(thread => thread.occurrences > 1 || assessments.some(item => item.tenantId === organizationId && item.incidentId === thread.event.sourceLifecycleId && item.findings.includes('Potentially flapping'))).length
  const deliveryIssues = scoped.flatMap(thread => thread.deliveries
    .filter(delivery => delivery.status === 'Failed' || delivery.status === 'Retrying')
    .map(delivery => ({ thread, delivery })))
    .sort((a, b) => Date.parse(b.delivery.time) - Date.parse(a.delivery.time))
  const attention = unresolved.slice().sort((a, b) => {
    const severityOrder: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Informational: 4 }
    return severityOrder[a.event.severity] - severityOrder[b.event.severity]
      || Number(b.occurrences > 1) - Number(a.occurrences > 1)
      || Date.parse(b.lastObservedAt) - Date.parse(a.lastObservedAt)
  }).slice(0, 5)
  const latestEvents = intakeObservations.filter(item => item.tenantId === organizationId)
    .slice().sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 4)

  return <>
    <PageHeading eyebrow="Organization overview" title="Notification health" description="See which source conditions need attention, how events are being grouped, and where delivery attempts need review." action={<span className="simulated-note"><Activity size={15} /> Sample data · prototype</span>} />
    <div className="admin-metrics">
      <MetricTile label="Active critical alerts" value={criticalCount} detail="Source state is active or acknowledged" tone="critical" />
      <MetricTile label="Other unresolved alerts" value={otherCount} detail="Source condition has not recovered" tone="warning" />
      <MetricTile label="Repeated / noisy groups" value={noisyCount} detail="Grouped observations or supported flap finding" tone="neutral" />
      <MetricTile label="Failed deliveries" value={deliveryIssues.filter(item => item.delivery.status === 'Failed').length} detail={`${deliveryIssues.filter(item => item.delivery.status === 'Retrying').length} retrying · simulated`} tone="delivery" />
    </div>

    <section className="admin-section">
      <div className="admin-section-heading"><div><h2>Needs attention</h2><p>Open source conditions, prioritized by severity.</p></div><Link className="text-link" to="/inbox">Open inbox <ArrowRight size={15} /></Link></div>
      <div className="panel attention-list">
        {attention.length ? attention.map(thread => {
          const assessment = assessments.find(item => item.tenantId === thread.event.tenantId && item.incidentId === thread.event.sourceLifecycleId)
          const hasFlap = assessment?.findings.includes('Potentially flapping') ?? false
          return <div className="attention-row" key={thread.id}>
            <span className={`severity-bar ${thread.event.severity.toLowerCase()}`} />
            <div className="attention-main"><div className="attention-title"><b>{thread.title}</b><SeverityBadge severity={thread.event.severity} /></div><div className="attention-meta"><span>{thread.event.sourceApplication} · {thread.event.assetId}</span><span className={`source-state-label source-${thread.event.sourceState}`}>Source {thread.event.sourceState}</span>{thread.occurrences > 1 && <span>{thread.occurrences} observations grouped</span>}{hasFlap && <span className="pattern-chip">Potentially flapping</span>}<span>Last observed {formatDate(thread.lastObservedAt)}</span></div></div>
            <Link className="button button-small" to={`/inbox?thread=${encodeURIComponent(thread.id)}`}>Review</Link>
          </div>
        }) : <EmptyState title="No unresolved alerts" detail="New source conditions will appear here when they need review." />}
      </div>
    </section>

    <div className="admin-lower-grid">
      <section className="panel admin-panel">
        <div className="admin-section-heading"><div><h2>Incoming event activity</h2><p>{latestEvents.length} recent source observations</p></div><Link className="text-link" to="/events">View events <ArrowRight size={15} /></Link></div>
        {latestEvents.length ? <div className="compact-event-list">{latestEvents.map(item => <div className="compact-event-row" key={item.id}><span className={`processing-dot ${item.disposition.toLowerCase()}`} /><div><b>{item.summary}</b><small>{item.sourceApplication} · {item.stationId} · {formatDate(item.occurredAt)}</small></div><span className="processing-label">{item.disposition}</span></div>)}</div> : <EmptyState title="No incoming observations" detail="Event activity will appear here when a source is connected." />}
      </section>
      <section className="panel admin-panel">
        <div className="admin-section-heading"><div><h2>Delivery issues</h2><p>Failed or retrying attempts from available records</p></div><Link className="text-link" to="/delivery">Delivery history <ArrowRight size={15} /></Link></div>
        {deliveryIssues.length ? <div className="compact-event-list">{deliveryIssues.slice(0, 4).map(({ thread, delivery }) => <div className="compact-event-row delivery-issue-row" key={delivery.id}><AlertTriangle size={16} className={delivery.status === 'Failed' ? 'delivery-icon-failed' : 'delivery-icon-retry'} /><div><b>{thread.title}</b><small>{delivery.recipient} · {delivery.channel} · {formatDate(delivery.time)}</small></div><Link className={`delivery-state ${delivery.status === 'Failed' ? 'failed' : 'retry'}`} to={`/delivery?thread=${encodeURIComponent(thread.id)}`}>{delivery.status}</Link></div>)}</div> : <EmptyState title="No delivery issues" detail="No failed or retrying attempts in the selected organization." />}
      </section>
    </div>
  </>
}

function MetricTile({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <div className={`admin-metric ${tone}`}><span>{label}</span><b>{value}</b><small>{detail}</small></div>
}

function EventActivityPage() {
  const { intakeObservations, assessments, threads, organizationId } = useApp()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sourceApplication, setSourceApplication] = useState('All applications')
  const [eventType, setEventType] = useState('All event types')
  const [processing, setProcessing] = useState('All processing states')
  const [period, setPeriod] = useState('Any time')
  useEffect(() => {
    const lifecycleId = searchParams.get('lifecycleId')
    if (lifecycleId) setQuery(lifecycleId)
  }, [])
  const scoped = intakeObservations.filter(item => item.tenantId === organizationId)
  const applications = [...new Set(scoped.map(item => item.sourceApplication))]
  const eventTypes = [...new Set(scoped.map(item => item.eventType))]
  const filtered = scoped.filter(item => {
    const q = query.trim().toLowerCase()
    if (q && ![item.sourceApplication, item.stationId, item.eventType, item.incidentId, item.tenantId, item.summary, item.sourceObservationId].some(value => value.toLowerCase().includes(q))) return false
    if (sourceApplication !== 'All applications' && item.sourceApplication !== sourceApplication) return false
    if (eventType !== 'All event types' && item.eventType !== eventType) return false
    if (processing !== 'All processing states' && item.disposition !== processing) return false
    if (period === 'Last 24 hours' && Date.now() - Date.parse(item.occurredAt) > 86_400_000) return false
    if (period === 'Last 7 days' && Date.now() - Date.parse(item.occurredAt) > 7 * 86_400_000) return false
    return true
  }).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
  const scopeThreads = visibleThreads(threads, organizationId)

  return <>
    <PageHeading eyebrow="Event intake" title="Incoming Events" description="Source observations remain visible when grouped or identified as duplicates." action={<span className="simulated-note"><Activity size={15} /> Fixture data · no live intake</span>} />
    <div className="event-processing-note">Processing result describes this observation. Intelligence describes the source lifecycle pattern. They are separate classifications; tenant filtering is a prototype UI only.</div>
    <section className="panel">
      <div className="filter-bar">
        <label className="search-field"><Search size={15} /><input placeholder="Search event, asset, or lifecycle" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <select value={sourceApplication} onChange={event => setSourceApplication(event.target.value)} aria-label="Filter by source application"><option>All applications</option>{applications.map(value => <option key={value}>{value}</option>)}</select>
        <select value={eventType} onChange={event => setEventType(event.target.value)} aria-label="Filter by event type"><option>All event types</option>{eventTypes.map(value => <option key={value}>{value}</option>)}</select>
        <select value={processing} onChange={event => setProcessing(event.target.value)} aria-label="Filter by processing status"><option>All processing results</option>{['Accepted', 'Grouped', 'Duplicate', 'Rejected'].map(value => <option key={value}>{value}</option>)}</select>
        <select value={period} onChange={event => setPeriod(event.target.value)} aria-label="Filter by source time"><option>Any time</option><option>Last 24 hours</option><option>Last 7 days</option></select>
        <button className="button button-quiet" onClick={() => { setQuery(''); setSourceApplication('All applications'); setEventType('All event types'); setProcessing('All processing results'); setPeriod('Any time') }}><X size={14} /> Clear</button>
      </div>
      <div className="results-caption">{filtered.length} source observations <span>· Received time is unavailable in the fixture</span></div>
      <div className="table-wrap"><table className="event-activity-table"><thead><tr><th>Event</th><th>Asset / lifecycle</th><th>Source time</th><th>Processing result</th><th>Alert / notification</th></tr></thead><tbody>{filtered.map(item => {
        const assessment = assessments.find(value => value.tenantId === item.tenantId && value.incidentId === item.incidentId)
        const thread = scopeThreads.find(value => value.event.tenantId === item.tenantId && value.event.sourceLifecycleId === item.incidentId)
        return <tr key={item.id}><td><span className="product-chip">{item.sourceApplication}</span><b className="event-type-name">{item.eventType}</b><small>{item.summary}</small><small>ID {item.sourceObservationId}</small></td><td><b>{item.stationId}</b><small>Lifecycle {item.incidentId}</small><small>Source {item.sourceState}</small></td><td>{formatDate(item.occurredAt)}<small>Received time not supplied</small></td><td><span className={`processing-label ${item.disposition.toLowerCase()}`}>{item.disposition}</span><small>{item.reason}</small></td><td>{assessment?.findings.length ? <>{assessment.findings.map(finding => <span className="pattern-chip" key={finding}>{finding}</span>)}<small>{assessment.evidence[0]}</small></> : <span className="intelligence-none">No supported pattern</span>}{thread && <Link className="event-thread-link" to={`/inbox?thread=${encodeURIComponent(thread.id)}`}>Open thread <ArrowRight size={13} /></Link>}</td></tr>
      })}</tbody></table>{filtered.length === 0 && <EmptyState title="No source observations match these filters" detail="Clear the filters or select another organization." />}</div>
    </section>
  </>
}

function InboxPage() {
  const { threads, setThreads, organizationId, addAudit, role, toast, assessments } = useApp()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<(typeof tabs)[number]['value']>('All')
  const [query, setQuery] = useState('')
  const [product, setProduct] = useState('All applications')
  const [severity, setSeverity] = useState('All severities')
  const [period, setPeriod] = useState('Any time')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const scoped = visibleThreads(threads, organizationId)
  const selected = scoped.find(t => t.id === selectedId)
  useEffect(() => {
    const linked = resolveDeepLinkedThread(scoped, {
      threadId: searchParams.get('thread'),
      lifecycleId: searchParams.get('lifecycleId'),
      tenantId: searchParams.get('tenantId'),
    })
    if (linked) setSelectedId(linked.id)
  }, [])
  const counts = {
    unread: scoped.filter(t => t.unread).length,
    active: scoped.filter(t => t.status === 'Active').length,
    critical: scoped.filter(t => t.event.severity === 'Critical' && t.status !== 'Resolved').length,
    failed: scoped.flatMap(t => t.deliveries).filter(d => d.status === 'Failed').length,
  }
  const filtered = scoped.filter(t => {
    const q = query.trim().toLowerCase()
    if (q && ![t.title, t.description, t.event.assetId, t.event.sourceApplication, t.event.equipmentId ?? ''].some(value => value.toLowerCase().includes(q))) return false
    if (product !== 'All applications' && t.event.sourceApplication !== product) return false
    if (severity !== 'All severities' && t.event.severity !== severity) return false
    if (tab === 'Unread' && !t.unread) return false
    if (tab === 'Active' && t.status !== 'Active') return false
    if (tab === 'Acknowledged' && t.status !== 'Acknowledged') return false
    if (tab === 'Resolved' && t.status !== 'Resolved') return false
    if (tab === 'Snoozed' && t.status !== 'Snoozed') return false
    if (period === 'Last 24 hours' && Date.now() - Date.parse(t.lastObservedAt) > 86_400_000) return false
    if (period === 'Last 7 days' && Date.now() - Date.parse(t.lastObservedAt) > 7 * 86_400_000) return false
    return true
  }).sort((a, b) => Date.parse(b.lastObservedAt) - Date.parse(a.lastObservedAt))

  const update = (thread: NotificationThread, patch: Partial<NotificationThread>, action: string) => {
    setThreads(current => updateThread(current, thread.id, patch))
    addAudit(action, `${thread.title} · ${thread.event.assetId}`, `${action} in notification inbox.`)
    toast(`${action} updated in this prototype.`)
  }
  const markRead = (thread: NotificationThread, unread: boolean) => update(thread, { unread }, unread ? 'Marked unread' : 'Marked read')
  const acknowledge = (thread: NotificationThread) => {
    if (role === 'Read-only Monitor') return toast('Read-only Monitor cannot acknowledge notifications.')
    setThreads(current => current.map(t => t.id === thread.id ? simulateAcknowledge(t, 'Subashini K') : t))
    addAudit('Notification acknowledged', thread.title, 'Acknowledged notification only; source event was not changed.')
    toast('Notification acknowledged. Source equipment state is unchanged.')
  }

  return <>
    <PageHeading eyebrow="Shared operations" title="Notification Inbox" description="Triage important notifications from across AssetIQ applications." action={<span className="simulated-note"><BellRing size={15} /> Simulated events · no live delivery</span>} />
    <div className="inbox-overview"><b>{counts.unread} unread</b><span>{counts.active} active notification threads</span><span>{counts.critical} critical</span><span>{counts.failed} failed simulated attempts</span></div>
    <section className="panel inbox-panel">
      <div className="inbox-toolbar">
        <div className="tabs">{tabs.map(item => <button key={item.value} className={tab === item.value ? 'active' : ''} onClick={() => setTab(item.value)}>{item.label}{item.value === 'Unread' && counts.unread > 0 && <b>{counts.unread}</b>}</button>)}</div>
        <div className="view-label"><ShieldCheck size={14} /> Scoped to {organizations.find(o => o.id === organizationId)?.name}</div>
      </div>
      <div className="filter-bar">
        <label className="search-field"><Search size={15} /><input placeholder="Search notifications or assets" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <select value={product} onChange={e => setProduct(e.target.value)} aria-label="Filter by application"><option>All applications</option>{products.map(p => <option key={p}>{p}</option>)}</select>
        <select value={severity} onChange={e => setSeverity(e.target.value)} aria-label="Filter by severity"><option>All severities</option>{severities.map(s => <option key={s}>{s}</option>)}</select>
        <select value={period} onChange={e => setPeriod(e.target.value)} aria-label="Filter by time"><option>Any time</option><option>Last 24 hours</option><option>Last 7 days</option></select>
        <button className="button button-quiet" onClick={() => { setQuery(''); setProduct('All applications'); setSeverity('All severities'); setPeriod('Any time'); setTab('All') }}><X size={14} /> Clear</button>
      </div>
      <div className="results-caption">{filtered.length} notification {filtered.length === 1 ? 'thread' : 'threads'} <span>· Repeated observations are grouped into a single thread</span></div>
      <div className="notification-list">
        {filtered.map(thread => <NotificationRow key={thread.id} thread={thread} selected={selectedId === thread.id} onSelect={() => { setSelectedId(thread.id); if (thread.unread) markRead(thread, false) }} />)}
        {filtered.length === 0 && <EmptyState title="No notifications match these filters" detail="Change a filter or clear the current search." />}
      </div>
    </section>
    {selected && <NotificationDetails thread={selected} assessment={assessments.find(item => item.tenantId === selected.event.tenantId && item.incidentId === selected.event.sourceLifecycleId)} onClose={() => setSelectedId(null)} onAcknowledge={() => acknowledge(selected)} onRead={() => markRead(selected, !selected.unread)} onSnooze={() => { setThreads(current => current.map(t => t.id === selected.id ? simulateSnooze(t) : t)); addAudit('Notification snoozed', selected.title, 'Snoozed in local prototype.'); toast('Notification snoozed in this prototype.') }} toast={toast} role={role} />}
  </>
}

function RulesPage() {
  const { rules, setRules, groups, threads, organizationId, role, addAudit, toast } = useApp()
  const [query, setQuery] = useState('')
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [step, setStep] = useState(1)
  const [formError, setFormError] = useState('')
  const [name, setName] = useState('')
  const [productChoice, setProductChoice] = useState<Product>('LiftIQ')
  const [eventTypeChoice, setEventTypeChoice] = useState(sourceEventCatalog.LiftIQ[0])
  const [severityChoice, setSeverityChoice] = useState<Severity>('High')
  const [scopeMode, setScopeMode] = useState<'all' | 'asset'>('all')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [recipientGroupChoice, setRecipientGroupChoice] = useState('')
  const [channelChoice, setChannelChoice] = useState<Channel[]>([])
  const [repeatHandling, setRepeatHandling] = useState<RepeatHandling>('group')
  const [repeatInterval, setRepeatInterval] = useState(30)
  const organizationName = organizations.find(org => org.id === organizationId)?.name ?? 'this organization'
  const assets = [...new Set(visibleThreads(threads, organizationId).map(thread => thread.event.assetId))]
  const productsInScope = products.filter(product => sourceEventCatalog[product]?.length && groups.some(group => group.organizationId === organizationId && group.enabled && group.products.includes(product)))
  const eligibleGroups = groups.filter(group => group.organizationId === organizationId && group.enabled && group.products.includes(productChoice))
  const selectedGroup = eligibleGroups.find(group => group.id === recipientGroupChoice)
  const scoped = rules.filter(rule => {
    const group = groups.find(item => item.id === rule.recipientGroupId)
    return group?.organizationId === organizationId
  }).filter(rule => `${rule.name} ${rule.eventType} ${rule.product}`.toLowerCase().includes(query.toLowerCase()))
  const canEdit = role !== 'Read-only Monitor'

  const closeForm = () => { setShowForm(false); setFormError('') }
  const startNewRule = () => {
    const product = productsInScope.includes('LiftIQ') ? 'LiftIQ' : productsInScope[0] ?? 'LiftIQ'
    const group = groups.find(item => item.organizationId === organizationId && item.enabled && item.products.includes(product))
    setEditingRule(null); setStep(1); setFormError(''); setName(''); setProductChoice(product)
    setEventTypeChoice(sourceEventCatalog[product]?.[0] ?? ''); setSeverityChoice(product === 'LiftIQ' ? 'Critical' : 'High')
    setScopeMode('all'); setSelectedAssetId(assets[0] ?? ''); setRecipientGroupChoice(group?.id ?? '')
    setChannelChoice(group?.channels.includes('In-app') ? ['In-app', ...group.channels.filter(channel => channel !== 'In-app')] : group?.channels ?? [])
    setRepeatHandling('group'); setRepeatInterval(30); setShowForm(true)
  }
  const startEditRule = (rule: NotificationRule) => {
    const group = groups.find(item => item.id === rule.recipientGroupId)
    const assetMatch = rule.scope.match(/^Asset: (.+)$/)
    setEditingRule(rule); setStep(1); setFormError(''); setName(rule.name); setProductChoice(rule.product)
    setEventTypeChoice(sourceEventCatalog[rule.product]?.includes(rule.eventType) ? rule.eventType : sourceEventCatalog[rule.product]?.[0] ?? '')
    setSeverityChoice(rule.severity); setScopeMode(assetMatch ? 'asset' : 'all')
    setSelectedAssetId(assetMatch?.[1] ?? assets[0] ?? ''); setRecipientGroupChoice(group?.id ?? '')
    setChannelChoice(rule.channels.filter(channel => group?.channels.includes(channel)))
    setRepeatHandling(getRepeatHandling(rule)); setRepeatInterval(rule.reminderMinutes || 30); setShowForm(true)
  }
  const nextStep = () => {
    let error = ''
    if (step === 1 && (!name.trim() || !eventTypeChoice || !sourceEventCatalog[productChoice]?.includes(eventTypeChoice))) error = 'Add a rule name and choose an available event type.'
    if (step === 2 && scopeMode === 'asset' && (!selectedAssetId || !assets.includes(selectedAssetId))) error = 'Choose an asset from this organization’s available fixture data.'
    if (step === 3 && (!selectedGroup || channelChoice.length === 0 || channelChoice.some(channel => !selectedGroup.channels.includes(channel)))) error = 'Choose an eligible recipient group and at least one available channel.'
    if (step === 4 && repeatHandling === 'remind' && (!Number.isInteger(repeatInterval) || repeatInterval < 5)) error = 'Reminder interval must be at least 5 minutes.'
    setFormError(error)
    if (!error) setStep(current => Math.min(5, current + 1))
  }
  const saveRule = (event: FormEvent) => {
    event.preventDefault()
    if (step < 5) return nextStep()
    const group = eligibleGroups.find(item => item.id === recipientGroupChoice)
    if (!group) { setFormError('Choose an eligible recipient group.'); return }
    try {
      const rule = buildNotificationRule({
        name, product: productChoice, eventType: eventTypeChoice, severity: severityChoice,
        scope: scopeMode === 'asset' ? `Asset: ${selectedAssetId}` : 'All assets in organization',
        recipientGroupId: group.id, channels: channelChoice, repeatHandling, repeatIntervalMinutes: repeatInterval,
      }, initialRules[0], editingRule ?? undefined)
      setRules(current => editingRule ? current.map(item => item.id === editingRule.id ? rule : item) : [rule, ...current])
      addAudit(editingRule ? 'Rule updated' : 'Rule created', rule.name, 'Saved notification intent in local prototype; event evaluation and delivery are not connected.')
      closeForm(); toast(`Rule ${editingRule ? 'updated' : 'saved'} locally. It is not enforced.`)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this rule.')
    }
  }
  const toggleRule = (id: string) => {
    const rule = scoped.find(item => item.id === id)
    if (!rule || !canEdit) return
    setRules(current => current.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item))
    addAudit(rule.enabled ? 'Rule disabled' : 'Rule enabled', rule.name, `Notification rule ${rule.enabled ? 'disabled' : 'enabled'}.`)
    toast(`Rule ${rule.enabled ? 'disabled' : 'enabled'} in this prototype.`)
  }
  const repeatText = (rule: NotificationRule) => {
    const mode = getRepeatHandling(rule)
    return mode === 'group' ? 'Group repeats' : mode === 'remind' ? `Remind after ${rule.reminderMinutes} min · not enforced` : 'Every occurrence · not enforced'
  }
  return <>
    <PageHeading eyebrow="Organization configuration" title="Notification Rules" description="Choose which source events matter, who should know, and how repeats should be handled." action={<button className="button button-primary" disabled={!canEdit || productsInScope.length === 0} onClick={startNewRule}><Plus size={15} /> New rule</button>} />
    <div className="rule-prototype-note"><ShieldCheck size={16} /><span><b>Configuration only.</b> Rules are saved locally and are not evaluated against incoming events or connected to delivery. Source lifecycle grouping remains available in event history.</span></div>
    <section className="panel rules-panel"><div className="panel-toolbar rules-toolbar"><label className="search-field"><Search size={15} /><input placeholder="Find a rule" value={query} onChange={event => setQuery(event.target.value)} /></label><span className="view-label">{scoped.length} rules · {organizationName}</span></div>
      <div className="table-wrap"><table className="rules-table"><thead><tr><th>Rule name</th><th>When it triggers</th><th>Applies to</th><th>Who gets notified</th><th>Repeat handling</th><th>Status</th></tr></thead><tbody>{scoped.map(rule => { const group = groups.find(item => item.id === rule.recipientGroupId); return <tr key={rule.id}><td><b>{rule.name}</b></td><td><span className="product-chip">{rule.product}</span><small>{humanizeEventType(rule.eventType)} · {rule.severity}</small></td><td>{rule.scope}</td><td>{group?.name ?? 'Unavailable'}<small>{rule.channels.join(', ') || 'No channel selected'}</small></td><td>{repeatText(rule)}</td><td><div className="rule-status-cell"><span className={`rule-enabled ${rule.enabled ? 'on' : 'off'}`}>{rule.enabled ? 'Enabled' : 'Disabled'}</span><div><button className="text-button" disabled={!canEdit} onClick={() => startEditRule(rule)}>Edit</button><Toggle checked={rule.enabled} onChange={() => toggleRule(rule.id)} label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`} disabled={!canEdit} /></div></div></td></tr> })}</tbody></table>{scoped.length === 0 && <EmptyState title="No rules found" detail="Try a different search or create a rule for this organization." />}</div>
    </section>
    {showForm && <Modal title={editingRule ? 'Edit notification rule' : 'Create notification rule'} onClose={closeForm} wide footer={<><button className="button" type="button" onClick={closeForm}>Cancel</button>{step > 1 && <button className="button" type="button" onClick={() => { setFormError(''); setStep(current => current - 1) }}>Back</button>}{step < 5 ? <button className="button button-primary" type="button" onClick={nextStep}>Continue</button> : <button className="button button-primary" form="rule-form" type="submit">{editingRule ? 'Save changes' : 'Save rule'}</button>}</>}>
      <form id="rule-form" onSubmit={saveRule} className="rule-wizard">
        <div className="wizard-steps" aria-label={`Step ${step} of 5`}>{['Event', 'Scope', 'Recipients', 'Repeats', 'Review'].map((label, index) => <div key={label} className={step === index + 1 ? 'current' : step > index + 1 ? 'complete' : ''}><span>{index + 1}</span><small>{label}</small></div>)}</div>
        {step === 1 && <section className="wizard-content"><h3>Choose the event</h3><p>Pick a model or fixture event type and the severity this rule should match.</p><label className="form-field">Rule name<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Critical pump fault" /></label><div className="wizard-two-col"><label className="form-field">Application<select value={productChoice} onChange={event => { const next = event.target.value as Product; const nextGroup = groups.find(group => group.organizationId === organizationId && group.enabled && group.products.includes(next)); setProductChoice(next); setEventTypeChoice(sourceEventCatalog[next]?.[0] ?? ''); setRecipientGroupChoice(nextGroup?.id ?? ''); setChannelChoice(nextGroup?.channels ?? []) }}>{productsInScope.map(product => <option key={product}>{product}</option>)}</select></label><label className="form-field">Event type<select value={eventTypeChoice} onChange={event => setEventTypeChoice(event.target.value)}>{(sourceEventCatalog[productChoice] ?? []).map(value => <option key={value} value={value}>{humanizeEventType(value)}</option>)}</select></label></div><label className="form-field">Severity<select value={severityChoice} onChange={event => setSeverityChoice(event.target.value as Severity)}>{severities.filter(value => value !== 'Informational').map(value => <option key={value}>{value}</option>)}</select></label><p className="wizard-helper">Event choices come from the repository's model/fixture catalog. This does not confirm live source ingestion.</p></section>}
        {step === 2 && <section className="wizard-content"><h3>Choose the scope</h3><p>Limit the rule to this organization's sample assets.</p><label className={`scope-choice ${scopeMode === 'all' ? 'selected' : ''}`}><input type="radio" checked={scopeMode === 'all'} onChange={() => setScopeMode('all')} />All assets in {organizationName}<small>Applies within the selected organization in this prototype.</small></label><label className={`scope-choice ${scopeMode === 'asset' ? 'selected' : ''}`}><input type="radio" checked={scopeMode === 'asset'} disabled={assets.length === 0} onChange={() => setScopeMode('asset')} />One asset</label>{scopeMode === 'asset' && <label className="form-field">Asset<select value={selectedAssetId} onChange={event => setSelectedAssetId(event.target.value)}>{assets.map(asset => <option key={asset}>{asset}</option>)}</select></label>}{assets.length === 0 && <p className="wizard-helper">No asset records are available for this organization. Use all-organization scope.</p>}</section>}
        {step === 3 && <section className="wizard-content"><h3>Choose recipients</h3><p>Select an existing group and the channels that group supports.</p><label className="form-field">Recipient group<select value={recipientGroupChoice} onChange={event => { const group = eligibleGroups.find(item => item.id === event.target.value); setRecipientGroupChoice(event.target.value); setChannelChoice(group?.channels ?? []) }}>{eligibleGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>{selectedGroup ? <><span className="field-label">Available channels</span><div className="channel-pills">{selectedGroup.channels.map(channel => <label className="check-pill" key={channel}><input type="checkbox" checked={channelChoice.includes(channel)} onChange={event => setChannelChoice(current => event.target.checked ? [...current, channel] : current.filter(value => value !== channel))} />{channel}</label>)}</div></> : <EmptyState title="No eligible recipient group" detail="Add an enabled group for this application in Recipients & Groups." />}<Link className="text-link manage-groups-link" to="/recipients">Manage recipient groups <ArrowRight size={14} /></Link></section>}
        {step === 4 && <section className="wizard-content"><h3>Decide how repeats should be handled</h3><p>The source history keeps its individual events regardless of notification preference.</p>{([{ id: 'group', label: 'Group repeats', description: 'Keep repeated observations in the same notification thread.' }, { id: 'remind', label: 'Remind me later', description: 'Save a reminder interval while the source condition stays active. No scheduler is connected.' }, { id: 'every', label: 'Notify for every occurrence', description: 'Save this intent; per-occurrence delivery is not implemented.' }] as const).map(option => <label className={`repeat-choice ${repeatHandling === option.id ? 'selected' : ''}`} key={option.id}><input type="radio" checked={repeatHandling === option.id} onChange={() => setRepeatHandling(option.id)} /><span><b>{option.label}</b><small>{option.description}</small></span></label>)}{repeatHandling === 'remind' && <label className="form-field reminder-field">Reminder interval<select value={repeatInterval} onChange={event => setRepeatInterval(Number(event.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option></select></label>}<p className="wizard-helper">Grouping is available in the prototype event history. Reminder and every-occurrence settings are stored as configuration only.</p></section>}
        {step === 5 && <section className="wizard-content"><h3>Review and save</h3><p>Check who this rule is intended to notify.</p><div className="rule-review-summary">When a <b>{severityChoice.toLowerCase()} {humanizeEventType(eventTypeChoice)}</b> occurs for <b>{scopeMode === 'asset' ? selectedAssetId || 'the selected asset' : `all assets in ${organizationName}`}</b>, notify <b>{selectedGroup?.name ?? 'the selected group'}</b> through <b>{channelChoice.join(', ') || 'no channels selected'}</b>. {repeatHandling === 'group' ? 'Group repeated observations into the same thread.' : repeatHandling === 'remind' ? `Set a reminder after ${repeatInterval} minutes (not enforced).` : 'Notify for every occurrence (not enforced).'}</div><div className="rule-save-note"><b>Saved locally only.</b> This rule is not matched against incoming events and does not trigger delivery. The source application remains responsible for alarm state.</div></section>}
        {formError && <p className="form-error" role="alert">{formError}</p>}
      </form>
    </Modal>}
  </>
}

function humanizeEventType(value: string) {
  return value.replaceAll('.', ' ').replace(/\b\w/g, character => character.toUpperCase())
}

function GroupsPage() {
  const { groups, setGroups, organizationId, role, addAudit } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(initialGroups[0]?.id ?? null)
  const scoped = groups.filter(group => role === 'Platform Administrator' || group.organizationId === organizationId)
  const selected = scoped.find(group => group.id === selectedId) ?? scoped[0]
  const people = recipients.filter(person => person.organizationId === organizationId)
  const canEdit = role !== 'Read-only Monitor'
  const updateGroup = (group: RecipientGroup, patch: Partial<RecipientGroup>, action: string) => {
    if (!canEdit) return
    setGroups(current => current.map(item => item.id === group.id ? { ...item, ...patch } : item))
    addAudit(action, group.name, 'Recipient group configuration changed in the prototype.')
  }
  return <>
    <PageHeading eyebrow="People & routing" title="Recipients & Groups" description="Manage who can receive notifications for the selected organization." action={<span className="simulated-note"><Users size={15} /> {people.length} sample recipients</span>} />
    <div className="group-layout"><section className="panel group-list"><div className="panel-heading"><div><h2>Recipient groups</h2><p>Group membership and channels are illustrative.</p></div></div>{scoped.map(group => <button key={group.id} className={`group-option ${selectedId === group.id ? 'selected' : ''}`} onClick={() => setSelectedId(group.id)}><span className="group-avatar"><Users size={17} /></span><span><b>{group.name}</b><small>{group.memberIds.length} members · {group.products.join(', ')}</small></span><ChevronRight size={16} /></button>)}</section>
      <section className="panel group-detail">{selected ? <><div className="panel-heading"><div><div className="eyebrow">Recipient group</div><h2>{selected.name}</h2><p>{selected.products.join(' · ')} applications</p></div><div className="status-control"><span>{selected.enabled ? 'Enabled' : 'Disabled'}</span><Toggle checked={selected.enabled} onChange={value => updateGroup(selected, { enabled: value }, value ? 'Group enabled' : 'Group disabled')} label="Enable recipient group" disabled={!canEdit} /></div></div><div className="detail-section"><SectionHeading title="Delivery channels" detail="Channels available to this group"/><div className="channel-pills">{(['In-app', 'Push', 'Email', 'SMS'] as Channel[]).map(channel => <label className="check-pill" key={channel}><input type="checkbox" checked={selected.channels.includes(channel)} disabled={!canEdit} onChange={event => updateGroup(selected, { channels: event.target.checked ? [...selected.channels, channel] : selected.channels.filter(item => item !== channel) }, 'Group channels changed')} />{channel}</label>)}</div></div><div className="detail-section"><SectionHeading title="Members" detail="Recipients are limited to this organization in the prototype."/>{people.map(person => <label className="member-row" key={person.id}><span className="avatar">{person.name.charAt(0)}</span><span><b>{person.name}</b><small>{person.email} · {person.products.join(', ')}</small></span><input type="checkbox" checked={selected.memberIds.includes(person.id)} disabled={!canEdit} onChange={event => updateGroup(selected, { memberIds: event.target.checked ? [...selected.memberIds, person.id] : selected.memberIds.filter(id => id !== person.id) }, 'Group membership changed')} /></label>)}</div><div className="ack-note"><ShieldCheck size={15} /> Membership here is sample configuration. Production delivery must resolve recipients against authenticated tenant membership and current permissions.</div></> : <EmptyState title="Select a recipient group" detail="Choose a group to view its members and delivery channels."/>}</section></div>
  </>
}

function PreferencesPage() {
  const { role, toast, addAudit } = useApp()
  const [channels, setChannels] = useState<Channel[]>(['In-app', 'Push', 'Email'])
  const [quietHours, setQuietHours] = useState(true)
  const [digest, setDigest] = useState(false)
  const [zone, setZone] = useState('Asia/Kolkata')
  const update = (message: string) => { addAudit('Preferences changed', 'Personal preferences', message); toast('Preferences saved in this prototype.') }
  const canEdit = role !== 'Read-only Monitor'
  return <>
    <PageHeading eyebrow="Personal settings" title="Preferences" description="Choose how this sample user receives notifications and reminders." action={<span className="badge status-acknowledged">Personal to this browser session</span>} />
    <div className="preferences-grid"><section className="panel settings-card"><div className="panel-heading"><div><h2>Delivery channels</h2><p>Choose the channels you want to use when available.</p></div></div>{(['In-app', 'Push', 'Email', 'SMS'] as Channel[]).map(channel => <div className="setting-row" key={channel}><span><b>{channel}</b><small>{channel === 'In-app' ? 'Notification inbox' : `${channel} delivery is simulated`}</small></span><Toggle checked={channels.includes(channel)} disabled={!canEdit} label={`${channel} notifications`} onChange={value => { setChannels(current => value ? [...current, channel] : current.filter(item => item !== channel)); update(`${channel} channel ${value ? 'enabled' : 'disabled'}.`) }} /></div>)}</section>
      <section className="panel settings-card"><div className="panel-heading"><div><h2>Timing & summaries</h2><p>Control quiet hours and lower-priority digests.</p></div></div><div className="setting-row"><span><b>Quiet hours</b><small>10:00 PM – 7:00 AM local time</small></span><Toggle checked={quietHours} disabled={!canEdit} label="Quiet hours" onChange={value => { setQuietHours(value); update(`Quiet hours ${value ? 'enabled' : 'disabled'}.`) }} /></div><div className="setting-row"><span><b>Daily summary</b><small>Bundle low-priority notifications once a day</small></span><Toggle checked={digest} disabled={!canEdit} label="Daily summary" onChange={value => { setDigest(value); update(`Daily summary ${value ? 'enabled' : 'disabled'}.`) }} /></div><label className="form-field">Preferred time zone<select value={zone} disabled={!canEdit} onChange={event => { setZone(event.target.value); update(`Preferred time zone set to ${event.target.value}.`) }}><option>Asia/Kolkata</option><option>UTC</option><option>America/Chicago</option><option>America/New_York</option></select></label></section></div>
    <div className="ack-note"><ShieldCheck size={15} /> These are personal delivery preferences. Organization-wide event rules are managed separately under Notification Rules. Preferences affect only this local prototype; critical source events remain visible in the inbox regardless of quiet hours.</div>
  </>
}

function DeliveryPage() {
  const { threads, organizationId, role } = useApp()
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState('All outcomes')
  const [threadFilter, setThreadFilter] = useState<string | null>(null)
  useEffect(() => {
    const threadId = searchParams.get('thread')
    if (threadId) setThreadFilter(threadId)
  }, [])
  const scoped = visibleThreads(threads, organizationId)
  const selectedThread = scoped.find(thread => thread.id === threadFilter)
  const records = scoped.flatMap(thread => thread.deliveries.map(delivery => ({ ...delivery, thread })))
    .filter(record => (!threadFilter || record.thread.id === threadFilter) && (filter === 'All outcomes' || record.status === filter))
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
  return <><PageHeading eyebrow="Operations" title="Delivery History" description="Review each attempt, recipient, channel, and outcome. Provider acceptance does not confirm recipient receipt." action={<span className="simulated-note"><Activity size={15} /> Simulated outcomes</span>} /><section className="panel"><div className="panel-toolbar"><span className="view-label"><ShieldCheck size={14}/> {role === 'Platform Administrator' ? 'Platform view' : `Scoped to ${organizations.find(org => org.id === organizationId)?.name}`}{selectedThread && <> · {selectedThread.title}<button className="inline-clear" onClick={() => setThreadFilter(null)}>Clear thread filter</button></>}</span><select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filter delivery outcome"><option>All outcomes</option>{['Provider accepted', 'Failed', 'Retrying', 'Queued', 'Attempted'].map(value => <option key={value}>{value}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Notification</th><th>Recipient / channel</th><th>Attempt</th><th>Outcome</th></tr></thead><tbody>{records.map(record => <tr key={record.id}><td>{formatDate(record.time)}</td><td><b>{record.thread.title}</b><small>{record.thread.event.assetId} · {record.thread.event.sourceApplication}</small></td><td>{record.recipient}<small>{record.channel}</small></td><td>#{record.attempt}</td><td><span className={`delivery-state ${record.status === 'Failed' ? 'failed' : record.status === 'Retrying' ? 'retry' : 'accepted'}`}>{record.status}</span><small>{record.response}</small></td></tr>)}</tbody></table>{records.length === 0 && <EmptyState title="No delivery attempts" detail="No matching attempts exist in the selected organization." />}</div></section></>
}

function AuditPage() {
  const { audit, organizationId, role } = useApp()
  const [query, setQuery] = useState('')
  const records = audit.filter(entry => role === 'Platform Administrator' || entry.organizationId === organizationId).filter(entry => `${entry.actor} ${entry.action} ${entry.target} ${entry.summary}`.toLowerCase().includes(query.toLowerCase()))
  return <><PageHeading eyebrow="Governance" title="Audit Log" description="Review configuration changes and notification actions recorded by this prototype." action={<span className="badge status-acknowledged">Illustrative audit records</span>} /><section className="panel"><div className="panel-toolbar"><label className="search-field"><Search size={15}/><input placeholder="Search audit events" value={query} onChange={event => setQuery(event.target.value)}/></label><span className="view-label"><FileClock size={14}/> {records.length} records</span></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Summary</th></tr></thead><tbody>{records.map(entry => <tr key={entry.id}><td>{formatDate(entry.time)}</td><td>{entry.actor}</td><td><span className="product-chip">{entry.action}</span></td><td><b>{entry.target}</b></td><td>{entry.summary}{entry.before && <small>{entry.before} → {entry.after}</small>}</td></tr>)}</tbody></table>{records.length === 0 && <EmptyState title="No audit records found" detail="Try a different search term."/>}</div></section></>
}

function AdministrationPage() {
  const { organizationId, role } = useApp()
  const organization = organizations.find(org => org.id === organizationId)?.name ?? 'Organization'
  return <><PageHeading eyebrow="Workspace controls" title="Administration" description="Review the selected organization and the connections this prototype depends on." action={<span className="badge status-active">{role}</span>} />
    <div className="preferences-grid"><section className="panel settings-card"><div className="panel-heading"><div><h2>Organization context</h2><p>The organization selector in the header controls this workspace view.</p></div></div><div className="info-grid"><Info label="Organization" value={organization}/><Info label="Organization ID" value={organizationId}/><Info label="Current role" value={role}/><Info label="Environment" value="Local prototype"/></div><div className="ack-note"><ShieldCheck size={15}/> Role and organization selection are simulated in the browser. Production access must be enforced by the identity and tenant services.</div></section>
      <section className="panel settings-card"><div className="panel-heading"><div><h2>Connected services</h2><p>These connections are required for production notification operations.</p></div></div><div className="integration-status-list"><IntegrationStatus title="Identity and tenant access" detail="Role and organization authorization"/><IntegrationStatus title="LiftIQ event source" detail="Incoming equipment lifecycle events"/><IntegrationStatus title="Email and SMS providers" detail="External message delivery"/><IntegrationStatus title="Persistent notification store" detail="Rules, inbox, and audit history"/></div></section></div>
    <section className="panel integration-panel"><div className="panel-heading"><div><h2>Prototype behavior</h2><p>This dashboard demonstrates the intended organization administrator workflow.</p></div></div><p className="admin-explainer">Notification Rules store local configuration for review. They do not subscribe to live events or send messages. Incoming Events and delivery outcomes use supplied sample records; browser changes are not shared between users.</p></section>
  </>
}

function IntegrationStatus({ title, detail }: { title: string; detail: string }) {
  return <div className="integration-status-row"><span className="integration-dot off"/><span><b>{title}</b><small>{detail}</small></span><span className="integration-state">Not connected</span></div>
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(date)
}

function NotificationRow({ thread, selected, onSelect }: { thread: NotificationThread; selected: boolean; onSelect: () => void }) {
  const hasLiftIQLink = thread.event.sourceApplication === 'LiftIQ' && /^https?:\/\//.test(thread.event.sourceReference)
  return <div className={`notification-row ${thread.unread ? 'unread' : ''} ${selected ? 'selected' : ''}`}>
    <span className={`severity-bar ${thread.event.severity.toLowerCase()}`} />
    <span className="notification-main"><button type="button" className="notification-main-button" onClick={onSelect}><span className="notification-title-line"><b>{thread.title}</b><SeverityBadge severity={thread.event.severity} />{thread.escalated && <span className="badge status-escalated">Escalated</span>}</span><span className="notification-description">{thread.description}</span></button><span className="notification-meta"><span className="product-chip">{thread.event.sourceApplication}</span><span className={`source-state-label source-${thread.event.sourceState}`}>Source {thread.event.sourceState}</span>{hasLiftIQLink && thread.event.stationId ? <a className="notification-asset-link" href={thread.event.sourceReference}>{thread.event.stationId}{thread.event.equipmentId ? ` · ${thread.event.equipmentId}` : ''}</a> : <span>{thread.event.assetId}{thread.event.equipmentId ? ` · ${thread.event.equipmentId}` : ''}</span>}<span>First {formatDate(thread.firstOccurredAt)}</span>{thread.occurrences > 1 && <span>{thread.occurrences} observations</span>}</span></span>
    <button type="button" className="notification-end" onClick={onSelect} aria-label={`Open ${thread.title}`}><StatusBadge status={thread.status} /><span>Last {formatDate(thread.lastObservedAt)}</span><ChevronRight size={17} /></button>
    {thread.unread && <span className="unread-dot" aria-label="Unread" />}
  </div>
}

function NotificationDetails({ thread, assessment, onClose, onAcknowledge, onRead, onSnooze, toast, role }: { thread: NotificationThread; assessment?: LifecycleAssessment; onClose: () => void; onAcknowledge: () => void; onRead: () => void; onSnooze: () => void; toast: (msg: string) => void; role: UserRole }) {
  const eventHistoryUrl = `/events?tenantId=${encodeURIComponent(thread.event.tenantId)}&lifecycleId=${encodeURIComponent(thread.event.sourceLifecycleId)}`
  const deliveryUrl = `/delivery?thread=${encodeURIComponent(thread.id)}`
  return <Drawer title="Notification details" subtitle={`Thread ${thread.id.toUpperCase()} · ${thread.event.sourceApplication}`} onClose={onClose} wide>
    <div className="detail-title"><div><SeverityBadge severity={thread.event.severity} /></div><h3>{thread.title}</h3><p>{thread.description}</p><div className="detail-state-summary"><span><small>Notification</small><StatusBadge status={thread.status} /></span><span><small>Source alarm</small><b className={`source-state-label source-${thread.event.sourceState}`}>{thread.event.sourceState}</b></span></div></div>
    <div className="detail-actions"><button className="button button-primary" disabled={role === 'Read-only Monitor' || thread.status === 'Acknowledged' || thread.status === 'Resolved'} onClick={onAcknowledge}><CheckCheck size={15} /> Acknowledge</button><button className="button" onClick={onSnooze} disabled={role === 'Read-only Monitor' || thread.status === 'Resolved'}><Clock3 size={15} /> Snooze 1 hour</button><button className="button button-quiet" onClick={onRead}>{thread.unread ? 'Mark read' : 'Mark unread'}</button></div>
    <div className="info-grid"><Info label="Organization" value={organizations.find(o => o.id === thread.event.tenantId)?.name ?? 'Organization'} /><Info label="Asset / station" value={thread.event.assetId} /><Info label="Equipment" value={thread.event.equipmentId ?? '—'} /><Info label="Source event" value={thread.event.eventType} /><Info label="First detected" value={formatDate(thread.firstOccurredAt)} /><Info label="Last observed" value={formatDate(thread.lastObservedAt)} /><Info label="Occurrences" value={`${thread.occurrences} grouped observations`} /></div>
    <div className="related-links"><Link to={eventHistoryUrl}>View source event history <ArrowRight size={14} /></Link>{thread.deliveries.length > 0 && <Link to={deliveryUrl}>View delivery attempts <ArrowRight size={14} /></Link>}</div>
    <section className="detail-section intelligence-section"><SectionHeading title="Alert intelligence" detail="Prototype assessment from supplied source history; no equipment diagnosis." />{assessment?.findings.length ? <div className="intelligence-findings">{assessment.findings.map(finding => <span className="badge status-acknowledged" key={finding}>{finding}</span>)}</div> : <p className="intelligence-none">No supported pattern detected.</p>}{(assessment?.evidence ?? ['No source history assessment is available for this thread.']).map((item, index) => <p className="intelligence-evidence" key={index}>{item}</p>)}{assessment && <p className="intelligence-evidence">{assessment.uniqueObservations} unique observations · {assessment.duplicateObservations} duplicates · current source state: {assessment.currentSourceState}</p>}</section>
    <div className="source-callout"><div><b>Source lifecycle</b><span>{thread.event.sourceLifecycleId} · {thread.event.sourceState}</span>{thread.event.stationId && <span>Station {thread.event.stationId}</span>}</div>{thread.event.sourceApplication === 'LiftIQ' && /^https?:\/\//.test(thread.event.sourceReference) ? <a className="button button-small" href={thread.event.sourceReference}>Open in LiftIQ</a> : <button className="button button-small" onClick={() => toast(`Source link placeholder: ${thread.event.sourceReference}`)}>Open in {thread.event.sourceApplication}</button>}</div>
    <section className="detail-section"><SectionHeading title="Lifecycle timeline" detail="Meaningful changes and grouped evidence" />{thread.timeline.map(item => <div className="timeline-row" key={item.id}><span className={`timeline-dot ${item.kind}`} /><span className="timeline-time">{formatDate(item.time)}</span><span className="timeline-copy"><b>{item.title}</b><small>{item.description}</small></span></div>)}</section>
    <section className="detail-section"><SectionHeading title="Delivery attempts" detail="Simulated channel/provider outcomes · receipt is not verified" />{thread.deliveries.map(item => <div className="delivery-attempt" key={item.id}><span className="channel-icon"><ChannelIcon channel={item.channel} /></span><div><b>{item.channel} · {item.recipient}</b><small>{formatDate(item.time)} · Attempt {item.attempt}</small><small>{item.response}</small></div><span className={`delivery-state ${item.status === 'Failed' ? 'failed' : item.status === 'Retrying' ? 'retry' : 'accepted'}`}>{item.status}</span></div>)}</section>
    <div className="ack-note"><ShieldCheck size={15} /> Acknowledging this notification does not clear or change the source application's alarm or equipment state.</div>
  </Drawer>
}

function SectionHeading({ title, detail }: { title: string; detail?: string }) { return <div className="section-heading"><div><h3>{title}</h3>{detail && <p>{detail}</p>}</div></div> }
function Info({ label, value }: { label: string; value: string }) { return <div className="info-item"><span>{label}</span><b>{value}</b></div> }
function ChannelIcon({ channel }: { channel: Channel }) { return channel === 'Email' ? <Mail size={15} /> : channel === 'Push' ? <Bell size={15} /> : channel === 'SMS' ? <span>SMS</span> : <Inbox size={15} /> }

