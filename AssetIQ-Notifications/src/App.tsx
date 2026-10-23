import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, Outlet, Route, Routes, useOutletContext } from 'react-router-dom'
import { Activity, Bell, BellRing, Building2, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clock3, FileClock, Inbox, ListChecks, Mail, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react'
import { initialAudit, initialGroups, initialRules, initialThreads, organizations, recipients, sourceEventCatalog } from './data/mock'
import type { AuditEntry, Channel, NotificationRule, NotificationThread, Product, RecipientGroup, Severity, UserRole } from './data/types'
import { simulateAcknowledge, simulateSnooze, updateThread, visibleThreads } from './services/mockService'
import { liftIQMockEvents } from './integrations/liftiq/mockEvents'
import { mergeLiftIQThreads } from './services/liftiqAdapter'
import { Drawer, EmptyState, Modal, PageHeading, SeverityBadge, StatusBadge, Toast, Toggle } from './components/ui'

type Context = {
  threads: NotificationThread[]; setThreads: React.Dispatch<React.SetStateAction<NotificationThread[]>>
  rules: NotificationRule[]; setRules: React.Dispatch<React.SetStateAction<NotificationRule[]>>
  groups: RecipientGroup[]; setGroups: React.Dispatch<React.SetStateAction<RecipientGroup[]>>
  audit: AuditEntry[]; addAudit: (action: string, target: string, summary: string, before?: string, after?: string) => void
  organizationId: string; role: UserRole; toast: (message: string) => void
}
const useApp = () => useOutletContext<Context>()
const products: Product[] = ['LiftIQ', 'TankIQ', 'FlowIQ', 'ReeferIQ', 'CloudIQ']
const severities: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Informational']
const roles: UserRole[] = ['Platform Administrator', 'Tenant Administrator', 'Operations User', 'Read-only Monitor']
const tabs: Array<{ value: 'All' | 'Unread' | 'Active' | 'Acknowledged' | 'Resolved' | 'Snoozed'; label: string }> = [
  { value: 'All', label: 'All' }, { value: 'Unread', label: 'Unread' }, { value: 'Active', label: 'Active' }, { value: 'Acknowledged', label: 'Acknowledged' }, { value: 'Resolved', label: 'Resolved' }, { value: 'Snoozed', label: 'Snoozed' },
]

const nav = [
  { to: '/inbox', label: 'Notification Inbox', icon: Inbox },
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
  const toast = useCallback((message: string) => setToastMessage(message), [])
  const addAudit = useCallback((action: string, target: string, summary: string, before?: string, after?: string) => {
    const entry: AuditEntry = { id: `audit-${Date.now()}`, time: new Date().toISOString(), actor: role === 'Platform Administrator' ? 'Platform admin (prototype)' : 'Subashini K (prototype)', organizationId, action, target, summary, before, after }
    setAudit(current => [entry, ...current])
  }, [organizationId, role])
  const context: Context = { threads, setThreads, rules, setRules, groups, setGroups, audit, addAudit, organizationId, role, toast }

  return <div className="app-shell">
    <aside className="sidebar">
      <Link to="/inbox" className="brand"><span className="brand-mark">A<span>IQ</span></span><span><b>AssetIQ</b><small>NOTIFICATION PLATFORM</small></span></Link>
      <div className="sidebar-caption">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {nav.filter(item => item.to !== '/administration' || role === 'Platform Administrator' || role === 'Tenant Administrator').map(item => {
          const Icon = item.icon
          return <NavLink key={item.to} to={item.to} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{item.label}</span>{item.to === '/inbox' && <span className="side-count">{visibleThreads(threads, organizationId).filter(t => t.unread).length}</span>}</NavLink>
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
            <Route index element={<InboxPage />} />
            <Route path="inbox" element={<InboxPage />} />
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

function InboxPage() {
  const { threads, setThreads, organizationId, addAudit, role, toast } = useApp()
  const [tab, setTab] = useState<(typeof tabs)[number]['value']>('All')
  const [query, setQuery] = useState('')
  const [product, setProduct] = useState('All applications')
  const [severity, setSeverity] = useState('All severities')
  const [period, setPeriod] = useState('Any time')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const scoped = visibleThreads(threads, organizationId)
  const selected = scoped.find(t => t.id === selectedId)
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
    {selected && <NotificationDetails thread={selected} onClose={() => setSelectedId(null)} onAcknowledge={() => acknowledge(selected)} onRead={() => markRead(selected, !selected.unread)} onSnooze={() => { setThreads(current => current.map(t => t.id === selected.id ? simulateSnooze(t) : t)); addAudit('Notification snoozed', selected.title, 'Snoozed in local prototype.'); toast('Notification snoozed in this prototype.') }} toast={toast} role={role} />}
  </>
}

function RulesPage() {
  const { rules, setRules, groups, organizationId, role, addAudit, toast } = useApp()
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [productChoice, setProductChoice] = useState<Product>('LiftIQ')
  const [eventTypeChoice, setEventTypeChoice] = useState(sourceEventCatalog.LiftIQ[0])
  const [severityChoice, setSeverityChoice] = useState<Severity>('High')
  const [recipientGroupChoice, setRecipientGroupChoice] = useState('g-ops')
  const eligibleGroups = groups.filter(group => group.organizationId === organizationId && group.enabled && group.products.includes(productChoice))
  const scoped = rules.filter(rule => {
    const group = groups.find(item => item.id === rule.recipientGroupId)
    return role === 'Platform Administrator' || group?.organizationId === organizationId
  }).filter(rule => `${rule.name} ${rule.eventType} ${rule.product}`.toLowerCase().includes(query.toLowerCase()))
  const canEdit = role !== 'Read-only Monitor'
  const toggleRule = (id: string) => {
    const rule = scoped.find(item => item.id === id)
    if (!rule || !canEdit) return
    setRules(current => current.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item))
    addAudit(rule.enabled ? 'Rule disabled' : 'Rule enabled', rule.name, `Notification rule ${rule.enabled ? 'disabled' : 'enabled'}.`)
    toast(`Rule ${rule.enabled ? 'disabled' : 'enabled'} in this prototype.`)
  }
  const createRule = (event: FormEvent) => {
    event.preventDefault()
    const group = eligibleGroups.find(item => item.id === recipientGroupChoice)
    if (!name.trim() || !group) return
    const rule: NotificationRule = {
      ...initialRules[0], id: `r-${Date.now()}`, name: name.trim(), description: 'Prototype rule. Incoming event processing is not connected.',
      product: productChoice, eventType: eventTypeChoice, severity: severityChoice, recipientGroupId: group.id,
      scope: group.name, channels: [...group.channels], cooldownMinutes: 0, reminderMinutes: 0, maxReminders: 0,
      escalationMinutes: 0, recoveryNotification: false, enabled: true, updatedAt: new Date().toISOString(),
    }
    setRules(current => [rule, ...current])
    addAudit('Rule created', rule.name, 'Created a local condition and recipient mapping. Event evaluation and delivery are not connected.')
    setName(''); setShowForm(false); toast('Rule created in this prototype.')
  }
  return <>
    <PageHeading eyebrow="Configuration" title="Notification Rules" description="Match a source condition to a recipient group. Timing and delivery controls are examples only in this prototype." action={<button className="button button-primary" disabled={!canEdit} onClick={() => setShowForm(true)}><Plus size={15} /> New rule</button>} />
    <div className="prototype-rule-note"><ShieldCheck size={16} /><span><b>Prototype behavior:</b> rules can be edited locally, but incoming events are not evaluated and cooldowns, reminders, escalations, recovery routing, and provider delivery are not enforced. Stable lifecycle IDs group the supplied LiftIQ observations; source alarm state remains owned by LiftIQ.</span></div>
    <section className="panel"><div className="panel-toolbar"><label className="search-field"><Search size={15} /><input placeholder="Search rules" value={query} onChange={event => setQuery(event.target.value)} /></label><span className="view-label"><ShieldCheck size={14} /> Scoped to {organizations.find(org => org.id === organizationId)?.name}</span></div>
      <div className="table-wrap"><table><thead><tr><th>Condition</th><th>Noise handling</th><th>Delivery policy</th><th>Status</th></tr></thead><tbody>{scoped.map(rule => { const group = groups.find(item => item.id === rule.recipientGroupId); return <tr key={rule.id}><td><b>{rule.name}</b><small><span className="product-chip">{rule.product}</span> · {rule.eventType} · {rule.severity}</small><small>{rule.scope}</small></td><td><b>Group by source lifecycle</b><small>Stable lifecycle grouping is applied to supplied fixtures.</small>{rule.cooldownMinutes > 0 && <small>Cooldown {rule.cooldownMinutes}m · display only</small>}{(rule.reminderMinutes > 0 || rule.escalationMinutes > 0) && <small>Reminder {rule.reminderMinutes || 'Off'}m · escalation {rule.escalationMinutes || 'Off'}m · not enforced</small>}</td><td><b>{group?.name ?? 'Unavailable'}</b><small>{rule.channels.join(', ') || 'No channels selected'}</small><small>Routing is not executed by this prototype.</small></td><td><div className="status-control"><span className={`badge ${rule.enabled ? 'status-active' : 'status-resolved'}`}>{rule.enabled ? 'Enabled locally' : 'Disabled locally'}</span><Toggle checked={rule.enabled} onChange={() => toggleRule(rule.id)} label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`} disabled={!canEdit} /></div></td></tr> })}</tbody></table>{scoped.length === 0 && <EmptyState title="No rules found" detail="Try another search or organization." />}</div>
    </section>
    {showForm && <Modal title="Create notification rule" onClose={() => setShowForm(false)} footer={<><button className="button" onClick={() => setShowForm(false)}>Cancel</button><button className="button button-primary" form="rule-form" type="submit" disabled={!eligibleGroups.some(group => group.id === recipientGroupChoice)}>Create rule</button></>}><form id="rule-form" onSubmit={createRule} className="form-stack"><label>Rule name<input required autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Critical station alarms" /></label><label>1. Condition · application<select value={productChoice} onChange={event => { const next = event.target.value as Product; setProductChoice(next); setEventTypeChoice(sourceEventCatalog[next]?.[0] ?? ''); setRecipientGroupChoice(groups.find(group => group.organizationId === organizationId && group.enabled && group.products.includes(next))?.id ?? '') }}>{products.map(product => <option key={product}>{product}</option>)}</select></label><label>Event type<select required value={eventTypeChoice} onChange={event => setEventTypeChoice(event.target.value)}>{(sourceEventCatalog[productChoice] ?? []).map(eventType => <option key={eventType}>{eventType}</option>)}</select></label><label>Severity<select value={severityChoice} onChange={event => setSeverityChoice(event.target.value as Severity)}>{severities.map(severity => <option key={severity}>{severity}</option>)}</select></label><label>3. Delivery policy · recipient group<select required value={recipientGroupChoice} onChange={event => setRecipientGroupChoice(event.target.value)}>{eligibleGroups.map(group => <option key={group.id} value={group.id}>{group.name} · {group.channels.join(', ')}</option>)}</select></label><div className="form-note"><b>2. Noise handling · system behavior</b><br />Repeated source observations are grouped when they share a stable lifecycle ID. Cooldown, flapping, persistence, and storm protection are not evaluated by this prototype. Grouping never changes the source alarm.</div><div className="form-note">The rule is saved locally as an example. It will not evaluate events or send notifications.</div></form></Modal>}
  </>
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
    <div className="ack-note"><ShieldCheck size={15} /> Preferences affect only this local prototype. Critical source events remain visible in the inbox regardless of quiet hours.</div>
  </>
}

function DeliveryPage() {
  const { threads, organizationId, role } = useApp()
  const [filter, setFilter] = useState('All outcomes')
  const scoped = visibleThreads(threads, organizationId)
  const records = scoped.flatMap(thread => thread.deliveries.map(delivery => ({ ...delivery, thread }))).filter(record => filter === 'All outcomes' || record.status === filter).sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
  return <><PageHeading eyebrow="Operations" title="Delivery History" description="Review simulated attempts across notification channels. Provider acceptance does not confirm recipient receipt." action={<span className="simulated-note"><Activity size={15} /> Simulated outcomes</span>} /><section className="panel"><div className="panel-toolbar"><span className="view-label"><ShieldCheck size={14}/> {role === 'Platform Administrator' ? 'Platform view' : `Scoped to ${organizations.find(org => org.id === organizationId)?.name}`}</span><select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filter delivery outcome"><option>All outcomes</option>{['Provider accepted', 'Failed', 'Retrying', 'Queued', 'Attempted'].map(value => <option key={value}>{value}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Notification</th><th>Recipient / channel</th><th>Attempt</th><th>Outcome</th></tr></thead><tbody>{records.map(record => <tr key={record.id}><td>{formatDate(record.time)}</td><td><b>{record.thread.title}</b><small>{record.thread.event.assetId} · {record.thread.event.sourceApplication}</small></td><td>{record.recipient}<small>{record.channel}</small></td><td>#{record.attempt}</td><td><span className={`delivery-state ${record.status === 'Failed' ? 'failed' : record.status === 'Retrying' ? 'retry' : 'accepted'}`}>{record.status}</span><small>{record.response}</small></td></tr>)}</tbody></table>{records.length === 0 && <EmptyState title="No delivery attempts" detail="No matching attempts exist in the selected organization." />}</div></section></>
}

function AuditPage() {
  const { audit, organizationId, role } = useApp()
  const [query, setQuery] = useState('')
  const records = audit.filter(entry => role === 'Platform Administrator' || entry.organizationId === organizationId).filter(entry => `${entry.actor} ${entry.action} ${entry.target} ${entry.summary}`.toLowerCase().includes(query.toLowerCase()))
  return <><PageHeading eyebrow="Governance" title="Audit Log" description="Review configuration changes and notification actions recorded by this prototype." action={<span className="badge status-acknowledged">Illustrative audit records</span>} /><section className="panel"><div className="panel-toolbar"><label className="search-field"><Search size={15}/><input placeholder="Search audit events" value={query} onChange={event => setQuery(event.target.value)}/></label><span className="view-label"><FileClock size={14}/> {records.length} records</span></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Summary</th></tr></thead><tbody>{records.map(entry => <tr key={entry.id}><td>{formatDate(entry.time)}</td><td>{entry.actor}</td><td><span className="product-chip">{entry.action}</span></td><td><b>{entry.target}</b></td><td>{entry.summary}{entry.before && <small>{entry.before} → {entry.after}</small>}</td></tr>)}</tbody></table>{records.length === 0 && <EmptyState title="No audit records found" detail="Try a different search term."/>}</div></section></>
}

function AdministrationPage() {
  const { organizationId, role, setThreads, toast, addAudit } = useApp()
  const [retention, setRetention] = useState('90 days')
  const [maintenance, setMaintenance] = useState(false)
  const canAdmin = role === 'Platform Administrator' || role === 'Tenant Administrator'
  const organization = organizations.find(org => org.id === organizationId)?.name ?? 'Organization'
  return <><PageHeading eyebrow="Workspace controls" title="Administration" description="Review organization scope and prototype-wide notification controls." action={<span className="badge status-active">{role}</span>} />
    <div className="summary-strip"><Summary icon={<Building2 size={17}/>} label="Selected organization" value={organizationId === organizations[0].id ? 1 : 2} tone="blue"/><Summary icon={<ShieldCheck size={17}/>} label="Access mode" value={canAdmin ? 1 : 0} tone="green"/><Summary icon={<Bell size={17}/>} label="Delivery providers" value={0} tone="slate"/></div>
    <div className="preferences-grid"><section className="panel settings-card"><div className="panel-heading"><div><h2>Organization</h2><p>Current sample tenant and role controls.</p></div></div><div className="info-grid"><Info label="Organization" value={organization}/><Info label="Organization ID" value={organizationId}/><Info label="Current role" value={role}/><Info label="Environment" value="Local prototype"/></div><div className="ack-note"><ShieldCheck size={15}/> Only the simulated Platform Administrator can change the organization selector. Real access must be enforced by the backend.</div></section>
      <section className="panel settings-card"><div className="panel-heading"><div><h2>Notification controls</h2><p>Local demo switches. No provider integration is configured.</p></div></div><label className="form-field">Audit retention display<select disabled={!canAdmin} value={retention} onChange={event => { setRetention(event.target.value); addAudit('Administration changed', 'Audit retention display', `Changed display setting to ${event.target.value}.`); toast('Administration setting saved locally.') }}><option>30 days</option><option>90 days</option><option>180 days</option><option>365 days</option></select></label><div className="setting-row"><span><b>Maintenance mode</b><small>Demonstration flag only; no event processing is connected</small></span><Toggle checked={maintenance} disabled={!canAdmin} label="Maintenance mode demonstration flag" onChange={value => { setMaintenance(value); toast(`Maintenance mode ${value ? 'enabled' : 'disabled'} in this prototype.`) }}/></div><button className="button button-danger" disabled={!canAdmin} onClick={() => { setThreads(current => current.map(thread => thread.event.tenantId === organizationId ? { ...thread, unread: false } : thread)); addAudit('Inbox reset', organization, 'Marked all organization notifications as read.'); toast('Notifications marked as read for this organization.') }}><CheckCheck size={15}/> Mark organization inbox read</button></section></div>
    <section className="panel integration-panel"><div className="panel-heading"><div><h2>Integration status</h2><p>External services are intentionally disconnected in this prototype.</p></div></div><div className="integration-grid"><div><span className="integration-dot off"/><b>Source event ingestion</b><small>Not connected</small></div><div><span className="integration-dot off"/><b>Email / SMS providers</b><small>Not connected</small></div><div><span className="integration-dot off"/><b>Identity & tenant service</b><small>Not connected</small></div></div></section>
  </>
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(date)
}

function Summary({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: string }) {
  return <div className="summary-item"><span className={`summary-icon ${tone}`}>{icon}</span><span className="summary-copy"><small>{label}</small><b>{value}</b></span></div>
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

function NotificationDetails({ thread, onClose, onAcknowledge, onRead, onSnooze, toast, role }: { thread: NotificationThread; onClose: () => void; onAcknowledge: () => void; onRead: () => void; onSnooze: () => void; toast: (msg: string) => void; role: UserRole }) {
  return <Drawer title="Notification details" subtitle={`Thread ${thread.id.toUpperCase()} · ${thread.event.sourceApplication}`} onClose={onClose} wide>
    <div className="detail-title"><div><SeverityBadge severity={thread.event.severity} /></div><h3>{thread.title}</h3><p>{thread.description}</p><div className="detail-state-summary"><span><small>Notification</small><StatusBadge status={thread.status} /></span><span><small>Source alarm</small><b className={`source-state-label source-${thread.event.sourceState}`}>{thread.event.sourceState}</b></span></div></div>
    <div className="detail-actions"><button className="button button-primary" disabled={role === 'Read-only Monitor' || thread.status === 'Acknowledged' || thread.status === 'Resolved'} onClick={onAcknowledge}><CheckCheck size={15} /> Acknowledge</button><button className="button" onClick={onSnooze} disabled={role === 'Read-only Monitor' || thread.status === 'Resolved'}><Clock3 size={15} /> Snooze 1 hour</button><button className="button button-quiet" onClick={onRead}>{thread.unread ? 'Mark read' : 'Mark unread'}</button></div>
    <div className="info-grid"><Info label="Organization" value={organizations.find(o => o.id === thread.event.tenantId)?.name ?? 'Organization'} /><Info label="Asset / station" value={thread.event.assetId} /><Info label="Equipment" value={thread.event.equipmentId ?? '—'} /><Info label="Source event" value={thread.event.eventType} /><Info label="First detected" value={formatDate(thread.firstOccurredAt)} /><Info label="Last observed" value={formatDate(thread.lastObservedAt)} /><Info label="Occurrences" value={`${thread.occurrences} grouped observations`} /><Info label="Reminder" value={thread.lastReminderAt ? formatDate(thread.lastReminderAt) : 'No reminder recorded'} /></div>
    <div className="source-callout"><div><b>Source lifecycle</b><span>{thread.event.sourceLifecycleId} · {thread.event.sourceState}</span>{thread.event.stationId && <span>Station {thread.event.stationId}</span>}</div>{thread.event.sourceApplication === 'LiftIQ' && /^https?:\/\//.test(thread.event.sourceReference) ? <a className="button button-small" href={thread.event.sourceReference}>Open in LiftIQ</a> : <button className="button button-small" onClick={() => toast(`Source link placeholder: ${thread.event.sourceReference}`)}>Open in {thread.event.sourceApplication}</button>}</div>
    <section className="detail-section"><SectionHeading title="Lifecycle timeline" detail="Meaningful changes and grouped evidence" />{thread.timeline.map(item => <div className="timeline-row" key={item.id}><span className={`timeline-dot ${item.kind}`} /><span className="timeline-time">{formatDate(item.time)}</span><span className="timeline-copy"><b>{item.title}</b><small>{item.description}</small></span></div>)}</section>
    <section className="detail-section"><SectionHeading title="Delivery attempts" detail="Simulated channel/provider outcomes · receipt is not verified" />{thread.deliveries.map(item => <div className="delivery-attempt" key={item.id}><span className="channel-icon"><ChannelIcon channel={item.channel} /></span><div><b>{item.channel} · {item.recipient}</b><small>{formatDate(item.time)} · Attempt {item.attempt}</small><small>{item.response}</small></div><span className={`delivery-state ${item.status === 'Failed' ? 'failed' : item.status === 'Retrying' ? 'retry' : 'accepted'}`}>{item.status}</span></div>)}</section>
    <div className="ack-note"><ShieldCheck size={15} /> Acknowledging this notification does not clear or change the source application's alarm or equipment state.</div>
  </Drawer>
}

function SectionHeading({ title, detail }: { title: string; detail?: string }) { return <div className="section-heading"><div><h3>{title}</h3>{detail && <p>{detail}</p>}</div></div> }
function Info({ label, value }: { label: string; value: string }) { return <div className="info-item"><span>{label}</span><b>{value}</b></div> }
function ChannelIcon({ channel }: { channel: Channel }) { return channel === 'Email' ? <Mail size={15} /> : channel === 'Push' ? <Bell size={15} /> : channel === 'SMS' ? <span>SMS</span> : <Inbox size={15} /> }

