import { useMemo, useState } from 'react'
import { initialPreferences, subscriptionCategories } from '../data/mockData'
import type { AlarmLifecycle, MuteRule, NotificationItem } from '../data/model'
import type { NotificationFilters } from '../logic/personalization'

type Preference = typeof initialPreferences
type TabView = 'inbox' | 'muted' | 'suggestions' | 'manage' | 'preferences'

interface Recipient {
  name: string
  email: string
  phone?: string
}

const recipients: Recipient[] = [
  { name: 'Vennila M', email: 'vennila@hash8.io' },
  { name: 'Mathavan S', email: 'mathavan.s@hash8.io' },
  { name: 'Seyadu Abbas', email: 'seyaduabbas.su@hash8.io', phone: '+91 90000 11101' },
  { name: 'Subashini K', email: 'subashini.k@hash8.io', phone: '+91 90000 11102' },
  { name: 'Nandhini M', email: 'nandhini.m@hash8.io' },
]

export function NotificationsPage({
  items,
  preferences,
  onPreferences,
  onRead,
  onOpenAlarm,
  onToast,
  alarms: _alarms,
  muteRules,
  onAddMute,
  onRemoveMute,
  initialFilters,
  onFiltersChange,
  onSaveView,
}: {
  items: NotificationItem[]
  preferences: Preference
  onPreferences: (next: Preference) => void
  onRead: (ids: string[], read: boolean) => void
  onOpenAlarm: (id: string) => void
  onToast: (msg: string) => void
  alarms: AlarmLifecycle[]
  muteRules: MuteRule[]
  onAddMute: (rule: MuteRule) => void
  onRemoveMute: (id: string) => void
  initialFilters: NotificationFilters
  onFiltersChange: (filters: NotificationFilters) => void
  onSaveView: (name: string, filters: NotificationFilters) => void
}) {
  const [activeTab, setActiveTab] = useState<TabView>('inbox')
  const [query, setQuery] = useState(initialFilters.query)
  const [typeFilter, setTypeFilter] = useState(initialFilters.type)
  const [readFilter, setReadFilter] = useState(initialFilters.read)

  // Drawer & Modals
  const [selectedNotice, setSelectedNotice] = useState<NotificationItem | null>(null)
  const [muteTarget, setMuteTarget] = useState<NotificationItem | null>(null)
  const [muteDuration, setMuteDuration] = useState('8')
  const [muteReason, setMuteReason] = useState('')
  const [criticalConfirmed, setCriticalConfirmed] = useState(false)
  const [saveViewOpen, setSaveViewOpen] = useState(false)
  const [viewName, setViewName] = useState('')

  // Subscriptions & Preferences
  const [draftPrefs, setDraftPrefs] = useState<Preference>(preferences)
  const [prefsSaved, setPrefsSaved] = useState(true)
  const [activeEvents, setActiveEvents] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(subscriptionCategories.map(c => [c.id, [...c.events]])),
  )

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (query) {
        const q = query.toLowerCase()
        const match = item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q) || item.asset.toLowerCase().includes(q)
        if (!match) return false
      }
      if (typeFilter && item.type !== typeFilter) return false
      if (readFilter) {
        if (readFilter === 'Unread' && !item.unread) return false
        if (readFilter === 'Read' && item.unread) return false
      }
      return true
    })
  }, [items, query, typeFilter, readFilter])

  const counts = {
    total: items.length,
    alarms: items.filter(i => i.type === 'Alarm').length,
    maint: items.filter(i => i.type === 'Maintenance').length,
    system: items.filter(i => i.type === 'System' || i.type === 'Asset change').length,
  }

  const handleMuteConfirm = () => {
    if (!muteTarget) return
    const hours = Number(muteDuration)
    const newRule: MuteRule = {
      id: `MR-${Date.now()}`,
      lifecycleId: muteTarget.lifecycleId || muteTarget.id,
      station: muteTarget.asset.split(' · ')[0] || 'NOVA_02',
      event: muteTarget.title,
      scope: 'Repeated reminders only · this lifecycle',
      mutedBy: 'Venky Karuppanan',
      createdAt: new Date().toISOString(),
      expiresAt: hours ? new Date(Date.now() + hours * 3600000).toISOString() : undefined,
      reason: muteReason.trim() || 'Operator silenced reminders during active troubleshooting',
    }
    onAddMute(newRule)
    setMuteTarget(null)
    setMuteReason('')
    setCriticalConfirmed(false)
    onToast('Mute rule added. Alarm lifecycle remains active and visible in alarms.')
  }

  const togglePref = (catId: string, channel: 'email' | 'push' | 'sms' | 'recovery') => {
    setDraftPrefs(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        [channel]: !prev[catId]?.[channel],
      },
    }))
    setPrefsSaved(false)
  }

  const savePrefs = () => {
    onPreferences(draftPrefs)
    setPrefsSaved(true)
    onToast('Notification preferences saved.')
  }

  return (
    <div className="notifications-page-container">
      {/* Page Title */}
      <div className="notifications-title-line">
        <div>
          <h1 className="stations-page-title flex-center-gap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            Notifications
          </h1>
          <p className="text-muted text-xs mt-1">Review operational updates and manage how you receive alerts.</p>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="notifications-summary-grid">
        <div className="summary-stat-card">
          <div className="summary-stat-icon">🔔</div>
          <div>
            <small>Total Notifications</small>
            <strong>{counts.total}</strong>
          </div>
        </div>

        <div className="summary-stat-card">
          <div className="summary-stat-icon text-red">▲</div>
          <div>
            <small>Alarms</small>
            <strong className="text-red">{counts.alarms}</strong>
          </div>
        </div>

        <div className="summary-stat-card">
          <div className="summary-stat-icon text-amber">⏱</div>
          <div>
            <small>Maintenance</small>
            <strong className="text-amber">{counts.maint}</strong>
          </div>
        </div>

        <div className="summary-stat-card">
          <div className="summary-stat-icon text-blue">⚙</div>
          <div>
            <small>System &amp; Assets</small>
            <strong className="text-blue">{counts.system}</strong>
          </div>
        </div>
      </div>

      {/* Subtabs Bar */}
      <div className="notifications-tabs-bar">
        <button
          className={`notif-tab-btn ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          Notification Inbox
        </button>
        <button
          className={`notif-tab-btn ${activeTab === 'muted' ? 'active' : ''}`}
          onClick={() => setActiveTab('muted')}
        >
          Muted Notifications ({muteRules.length})
        </button>
        <button
          className={`notif-tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => setActiveTab('suggestions')}
        >
          ✦ Mute Suggestions
        </button>

        <span className="flex-1" />

        <button
          className={`notif-action-link-btn ${activeTab === 'manage' ? 'font-bold text-blue' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          ⚙ Manage Subscriptions
        </button>
        <button
          className={`notif-action-link-btn ${activeTab === 'preferences' ? 'font-bold text-blue' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Notification Preferences
        </button>
      </div>

      {/* Tab: Inbox */}
      {activeTab === 'inbox' && (
        <div className="notif-inbox-content">
          {/* Toolbar */}
          <div className="notif-toolbar-row">
            <div className="alarm-search-wrap flex-1 min-w-[240px]">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Search notifications or assets..."
                value={query}
                onChange={e => {
                  setQuery(e.target.value)
                  onFiltersChange({ query: e.target.value, type: typeFilter, read: readFilter })
                }}
                className="alarm-search-input"
              />
            </div>

            <select
              value={typeFilter}
              onChange={e => {
                setTypeFilter(e.target.value)
                onFiltersChange({ query, type: e.target.value, read: readFilter })
              }}
              className="alarm-select"
            >
              <option value="">All Types</option>
              <option value="Alarm">Alarm</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Asset change">Asset Change</option>
              <option value="System">System</option>
            </select>

            <select
              value={readFilter}
              onChange={e => {
                setReadFilter(e.target.value)
                onFiltersChange({ query, type: typeFilter, read: e.target.value })
              }}
              className="alarm-select"
            >
              <option value="">All Read States</option>
              <option value="Unread">Unread</option>
              <option value="Read">Read</option>
            </select>

            {(query || typeFilter || readFilter) && (
              <button
                className="btn-cancel-white"
                onClick={() => {
                  setQuery('')
                  setTypeFilter('')
                  setReadFilter('')
                  onFiltersChange({ query: '', type: '', read: '' })
                }}
              >
                Clear Filters
              </button>
            )}

            <button className="btn-cancel-white" onClick={() => setSaveViewOpen(true)}>
              ★ Save View
            </button>
          </div>

          {/* Save View Inline Form */}
          {saveViewOpen && (
            <div className="save-view-box mb-3">
              <label className="text-xs font-semibold mr-2">Name this notification view:</label>
              <input
                type="text"
                placeholder="e.g. My Active Alarms"
                value={viewName}
                onChange={e => setViewName(e.target.value)}
                className="completion-input flex-1"
              />
              <button className="btn-cancel-white" onClick={() => setSaveViewOpen(false)}>Cancel</button>
              <button
                className="btn-open-blue"
                disabled={!viewName.trim()}
                onClick={() => {
                  onSaveView(viewName.trim(), { query, type: typeFilter, read: readFilter })
                  setSaveViewOpen(false)
                  setViewName('')
                }}
              >
                Save
              </button>
            </div>
          )}

          {/* Notifications Table */}
          <div className="alarm-table-card">
            <table className="alarm-grid-table">
              <thead>
                <tr>
                  <th style={{ width: '45px' }} />
                  <th>Notification</th>
                  <th>Entity / Station</th>
                  <th>Time</th>
                  <th>Delivery</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isUnread = item.unread
                  const tone = item.type === 'Alarm' ? 'red' : item.type === 'Maintenance' ? 'amber' : 'blue'

                  return (
                    <tr
                      key={item.id}
                      className={`notif-row ${isUnread ? 'row-unread-highlight' : ''}`}
                      onClick={() => setSelectedNotice(item)}
                    >
                      <td className="text-center">
                        <span className={`notif-type-bullet bullet-${tone}`}>
                          {item.type === 'Alarm' ? '!' : item.type === 'Maintenance' ? 'M' : '⚙'}
                        </span>
                      </td>
                      <td>
                        <div className="flex-center-gap">
                          <span className={`pill-badge badge-${tone}`}>{item.type}</span>
                          <strong>{item.title}</strong>
                          {isUnread && <span className="unread-dot-badge">Unread</span>}
                        </div>
                        <p className="text-slate-600 text-xs mt-1">{item.message}</p>
                      </td>
                      <td>
                        <strong className="text-slate-900">{item.asset}</strong>
                      </td>
                      <td>
                        <span className="text-muted text-xs">{item.at.replace('T', ' ').slice(0, 16)}</span>
                      </td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          {item.delivery?.map((d, di) => (
                            <span key={di} className={`delivery-mini-badge badge-${d.status.toLowerCase()}`}>
                              {d.channel}: {d.status}
                            </span>
                          )) || <span className="text-muted text-xs">-</span>}
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex-center-gap justify-center" onClick={e => e.stopPropagation()}>
                          <button
                            className="btn-cancel-white text-xs"
                            onClick={() => setSelectedNotice(item)}
                          >
                            Details
                          </button>
                          {item.type === 'Alarm' && (
                            <button
                              className="btn-cancel-white text-xs"
                              onClick={() => setMuteTarget(item)}
                            >
                              Mute
                            </button>
                          )}
                          <button
                            className="btn-cancel-white text-xs"
                            onClick={() => onRead([item.id], isUnread)}
                          >
                            {isUnread ? 'Mark read' : 'Mark unread'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Muted Notifications */}
      {activeTab === 'muted' && (
        <div className="alarm-table-card p-4">
          <h2 className="panel-title mb-2">Muted Notification Rules</h2>
          <p className="text-muted text-xs mb-4">
            Mute rules pause delivery of repeated alarm notifications for one lifecycle. They never resolve or hide an alarm.
          </p>
          <table className="home-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Alarm</th>
                <th>Mute Scope</th>
                <th>Muted By</th>
                <th>Expires</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {muteRules.map(rule => (
                <tr key={rule.id}>
                  <td><strong>{rule.station}</strong></td>
                  <td>{rule.event}</td>
                  <td><span className="subtle-chip-blue">{rule.scope}</span></td>
                  <td>{rule.mutedBy}</td>
                  <td>{rule.expiresAt ? rule.expiresAt.replace('T', ' ').slice(0, 16) : 'Until removed'}</td>
                  <td>{rule.reason}</td>
                  <td>
                    <button className="btn-danger-outline" onClick={() => onRemoveMute(rule.id)}>
                      Remove Rule
                    </button>
                  </td>
                </tr>
              ))}
              {!muteRules.length && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-muted">
                    No active mute rules. Use the "Mute" action on any alarm notification in the Inbox to pause repeated reminders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Mute Suggestions */}
      {activeTab === 'suggestions' && (
        <div className="alarm-table-card p-5">
          <h2 className="panel-title mb-2">✦ Mute Suggestions</h2>
          <p className="text-muted text-xs mb-4">
            When an alarm repeats frequently while operations are already actively investigating, LiftIQ suggests muting repeated channel notifications to reduce noise.
          </p>

          <div className="space-y-3">
            <div className="suggested-item border border-slate-200 p-4 rounded-lg">
              <div className="suggested-icon-wrap bg-soft-red text-red">!</div>
              <div className="suggested-body">
                <strong>High Water Level · NOVA_02</strong>
                <p className="text-slate-600 text-xs mt-1">
                  Alarm LC-1042 has repeated 2 times in the last 2 hours. A status report has already arrived and is pending recovery review.
                </p>
              </div>
              <button
                className="btn-open-blue"
                onClick={() => {
                  const target = items.find(i => i.lifecycleId === 'LC-1042') || items[0]
                  setMuteTarget(target)
                }}
              >
                Mute Reminders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Manage Subscriptions */}
      {activeTab === 'manage' && (
        <div className="alarm-table-card p-5">
          <h2 className="panel-title mb-2">Manage Subscriptions Catalogue</h2>
          <p className="text-muted text-xs mb-4">
            Configure which event definitions across your stations generate system notifications.
          </p>

          <div className="space-y-4">
            {subscriptionCategories.map(cat => (
              <div key={cat.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-800">{cat.name}</h3>
                  <span className="text-xs text-muted">{cat.events.length} supported events</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-3">
                  {cat.events.map(ev => {
                    const isChecked = activeEvents[cat.id]?.includes(ev)
                    return (
                      <label key={ev} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setActiveEvents(prev => ({
                              ...prev,
                              [cat.id]: isChecked
                                ? prev[cat.id].filter(x => x !== ev)
                                : [...(prev[cat.id] || []), ev],
                            }))
                          }}
                        />
                        <span>{ev}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <button className="btn-open-blue" onClick={() => onToast('Subscription catalogue saved.')}>
              Save Catalogue Changes
            </button>
          </div>
        </div>
      )}

      {/* Tab: Notification Preferences */}
      {activeTab === 'preferences' && (
        <div className="alarm-table-card p-5">
          <h2 className="panel-title mb-2">Delivery Channels &amp; Preferences</h2>
          <p className="text-muted text-xs mb-4">
            Control which delivery channels (Email, Web Push, SMS) you receive for each notification category.
          </p>

          <table className="home-table mb-6">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-center">Email</th>
                <th className="text-center">Web Push</th>
                <th className="text-center">SMS</th>
                <th className="text-center">Recovery / Clear</th>
              </tr>
            </thead>
            <tbody>
              {subscriptionCategories.map(cat => {
                const p = draftPrefs[cat.id] || { email: false, push: true, sms: false, recovery: true }
                return (
                  <tr key={cat.id}>
                    <td><strong>{cat.name}</strong></td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={p.email}
                        onChange={() => togglePref(cat.id, 'email')}
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={p.push}
                        onChange={() => togglePref(cat.id, 'push')}
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={p.sms}
                        onChange={() => togglePref(cat.id, 'sms')}
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={p.recovery}
                        onChange={() => togglePref(cat.id, 'recovery')}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="flex justify-end gap-2 mb-6">
            <button
              className="btn-cancel-white"
              disabled={prefsSaved}
              onClick={() => {
                setDraftPrefs(preferences)
                setPrefsSaved(true)
              }}
            >
              Discard Changes
            </button>
            <button className="btn-open-blue" disabled={prefsSaved} onClick={savePrefs}>
              Save Preferences
            </button>
          </div>

          {/* Recipient Users Table */}
          <h3 className="panel-title text-base mb-2">Eligible Recipients Directory</h3>
          <table className="home-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map(r => (
                <tr key={r.email}>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.email}</td>
                  <td>{r.phone || '-'}</td>
                  <td><span className="subtle-chip-blue">Operator</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-out Details Drawer */}
      {selectedNotice && (
        <div className="drawer-overlay-scrim" onClick={() => setSelectedNotice(null)}>
          <aside className="filters-slide-drawer" onClick={e => e.stopPropagation()}>
            <div className="filters-drawer-header">
              <div>
                <span className={`pill-badge badge-${selectedNotice.type === 'Alarm' ? 'red' : 'blue'}`}>
                  {selectedNotice.type}
                </span>
                <h2 className="drawer-title mt-2">{selectedNotice.title}</h2>
              </div>
              <button className="btn-close-drawer" onClick={() => setSelectedNotice(null)}>✕</button>
            </div>

            <div className="p-5 text-sm space-y-4">
              <p className="text-slate-700">{selectedNotice.message}</p>

              <dl className="twin-kv-list">
                <div className="kv-item"><span>Asset</span><strong>{selectedNotice.asset}</strong></div>
                <div className="kv-item"><span>Timestamp</span><strong>{selectedNotice.at.replace('T', ' ')}</strong></div>
                <div className="kv-item"><span>Read Status</span><strong>{selectedNotice.unread ? 'Unread' : 'Read'}</strong></div>
              </dl>

              {selectedNotice.delivery && selectedNotice.delivery.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Delivery Attempts</h4>
                  <div className="space-y-2">
                    {selectedNotice.delivery.map((d, i) => (
                      <div key={i} className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                        <span><strong>{d.channel}</strong>: {d.status}</span>
                        <span className="text-muted">{d.at.replace('T', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNotice.type === 'Alarm' && selectedNotice.lifecycleId && (
                <div className="pt-4 border-t border-slate-200">
                  <button
                    className="btn-open-blue w-full"
                    onClick={() => {
                      setSelectedNotice(null)
                      onOpenAlarm(selectedNotice.lifecycleId!)
                    }}
                  >
                    Open Alarm Lifecycle in Alarms →
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Mute Reminders Modal */}
      {muteTarget && (
        <div className="modal-backdrop" onClick={() => setMuteTarget(null)}>
          <div className="modal-window max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mute Notification Reminders?</h2>
              <button className="btn-close" onClick={() => setMuteTarget(null)}>✕</button>
            </div>
            <div className="modal-body text-sm space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs">
                <strong>High-Severity Alarm Notice</strong>
                <p className="mt-1">
                  Muting pauses repeated push and email notifications for this lifecycle only. The alarm lifecycle itself remains active, visible, and unmodified in Alarm Management.
                </p>
                <label className="flex items-start gap-2 mt-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={criticalConfirmed}
                    onChange={e => setCriticalConfirmed(e.target.checked)}
                  />
                  I understand this does not resolve or clear the alarm.
                </label>
              </div>

              <div>
                <label className="field-group-label mb-1">Mute Duration</label>
                <select
                  value={muteDuration}
                  onChange={e => setMuteDuration(e.target.value)}
                  className="alarm-select w-full"
                >
                  <option value="1">1 Hour</option>
                  <option value="8">8 Hours</option>
                  <option value="24">24 Hours</option>
                  <option value="0">Until Manually Removed</option>
                </select>
              </div>

              <div>
                <label className="field-group-label mb-1">Reason / Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Currently onsite replacing sensor"
                  value={muteReason}
                  onChange={e => setMuteReason(e.target.value)}
                  className="completion-input w-full"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-white" onClick={() => setMuteTarget(null)}>Cancel</button>
              <button
                className="btn-open-blue"
                disabled={!criticalConfirmed}
                onClick={handleMuteConfirm}
              >
                Confirm Mute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
