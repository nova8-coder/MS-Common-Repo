import { useState } from 'react'
import type { AlarmLifecycle } from '../data/model'

const formatAlarmTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const formatAlarmDuration = (alarm: AlarmLifecycle) => {
  const start = new Date(alarm.startedAt).getTime()
  const end = new Date(alarm.resolvedAt || alarm.lastObservedAt || Date.now()).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '—'
  const minutes = Math.floor((end - start) / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  return days ? `${days}d ${hours % 24}h` : `${hours}h ${minutes % 60}m`
}

export interface ManualCompletion {
  id: string
  evidenceAt: string
  note: string
  confirmed: boolean
}

export function AlarmPage({
  alarms,
  onOpen: _onOpen,
  onStationNavigate,
  onManualComplete,
  scope = 'station',
  embedded = false,
}: {
  alarms: AlarmLifecycle[]
  onOpen?: (id: string) => void
  onStationNavigate?: (tab: string) => void
  onManualComplete?: (data: ManualCompletion) => void
  scope?: 'station' | 'global'
  embedded?: boolean
}) {
  const [activeSubtab, setActiveSubtab] = useState<'history' | 'active'>('history')
  const [selectedId, setSelectedId] = useState<string>('LC-1042')
  const [drawerOpen, setDrawerOpen] = useState(scope === 'station')
  const [timeRange, setTimeRange] = useState('30')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [alarmType, setAlarmType] = useState('')
  const [component, setComponent] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [stationFilter, setStationFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAlarms = alarms.filter(a => {
    const cutoff = Date.now() - Number(timeRange) * 24 * 60 * 60 * 1000
    if (new Date(a.startedAt).getTime() < cutoff) return false
    if (activeSubtab === 'active' && a.status !== 'Active') return false
    if (alarmType && a.name !== alarmType) return false
    if (component && a.component !== component) return false
    if (statusFilter && a.status !== statusFilter) return false
    if (severityFilter && a.severity !== severityFilter) return false
    if (stationFilter && a.station !== stationFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const match = a.name.toLowerCase().includes(q) || a.component.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.station.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const selectedAlarm = alarms.find(a => a.id === selectedId) || alarms[0]
  const activeCount = alarms.filter(a => a.status === 'Active').length
  const pageCount = Math.max(1, Math.ceil(filteredAlarms.length / rowsPerPage))
  const currentPage = Math.min(page, pageCount)
  const visibleAlarms = filteredAlarms.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  const formatDisplayTime = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const pad = (n: number) => String(n).padStart(2, '0')
    let h = d.getHours()
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`
  }

  const getDuration = (a: AlarmLifecycle) => formatAlarmDuration(a)

  return (
    <div className={`alarm-page-container ${scope === 'global' ? 'global-alarm-page' : ''} ${embedded ? 'embedded-alarm-page' : ''} ${drawerOpen ? 'has-drawer-open' : ''}`}>
      {scope === 'global' && (
        <div className="alarm-page-heading">
          <div>
            <h1>Alarms</h1>
            <p>Alarm lifecycle history across all accessible lift stations.</p>
          </div>
          <div className="alarm-page-counts">
            <span><b>{alarms.length}</b> total records</span>
            <span className="alarm-count-active"><b>{activeCount}</b> active</span>
          </div>
        </div>
      )}
      {/* Breadcrumb */}
      {scope === 'station' && !embedded && <div className="alarm-breadcrumb">
        <a onClick={() => onStationNavigate?.('Overview')}>← All Stations</a>
        <span className="breadcrumb-sep">/</span>
        <a onClick={() => onStationNavigate?.('Overview')}>NOVA_02</a>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">Alarms</span>
      </div>}

      {/* Station Header */}
      {scope === 'station' && !embedded && <div className="alarm-station-header">
        <img src="/station-thumb.png" alt="NOVA_02 Station" className="station-thumb-img" />
        <div className="station-header-text">
          <div className="station-name-row">
            <h1>NOVA_02</h1>
            <span className="wireless-signal-icon" title="Online signal">((•))</span>
          </div>
          <div className="station-meta-subtitle">Lift Station | Hosur, Tamil Nadu</div>
        </div>
      </div>}

      {/* Main Station Navigation Tabs */}
      {scope === 'station' && !embedded && <div className="station-main-nav-tabs">
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Overview')}>Overview</button>
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Visual Twin')}>Visual Twin</button>
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Messages')}>Messages</button>
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Events')}>Events</button>
        <button className="station-tab-btn active-solid-blue" onClick={() => onStationNavigate?.('Alarms')}>Alarms</button>
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Trends')}>Trends</button>
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Totalizer')}>Totalizer</button>
        <button className="station-tab-btn station-tab-more">•••</button>
      </div>}

      {embedded && <div className="embedded-alarm-heading"><h2>Alarm Lifecycles</h2><p>History and open alarms for this station.</p></div>}

      {/* Alarms Sub-Navigation */}
      <div className="alarm-sub-tabs">
        <button
          className={`alarm-sub-btn ${activeSubtab === 'history' ? 'active-underline' : ''}`}
          onClick={() => setActiveSubtab('history')}
        >
          Alarm History
        </button>
        <button
          className={`alarm-sub-btn ${activeSubtab === 'active' ? 'active-underline' : ''}`}
          onClick={() => setActiveSubtab('active')}
        >
          Active Alarms ({activeCount})
        </button>
      </div>

      {/* Filter Row */}
      <div className="alarm-filter-row">
        <div className="filter-select-wrap">
          <svg className="filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="alarm-select">
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
          </select>
        </div>

        <select value={alarmType} onChange={e => setAlarmType(e.target.value)} className="alarm-select">
          <option value="">All Alarm Types</option>
          <option value="High Level">High Level</option>
          <option value="Low Level">Low Level</option>
          <option value="Pump 1 Fault">Pump 1 Fault</option>
          <option value="Pump 2 Current Low">Pump 2 Current Low</option>
          <option value="Generator Fault">Generator Fault</option>
          <option value="Pump 3 OOS">Pump 3 OOS</option>
        </select>

        <select value={component} onChange={e => setComponent(e.target.value)} className="alarm-select">
          <option value="">All Components</option>
          <option value="Wet Well">Wet Well</option>
          <option value="Pump 1">Pump 1</option>
          <option value="Pump 2">Pump 2</option>
          <option value="Pump 3">Pump 3</option>
          <option value="Generator">Generator</option>
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="alarm-select">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Recovery review">Recovery review</option>
          <option value="Completed">Completed</option>
          <option value="Stale">Stale</option>
        </select>

        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="alarm-select">
          <option value="">All Severity</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {scope === 'global' && (
          <select value={stationFilter} onChange={e => setStationFilter(e.target.value)} className="alarm-select" aria-label="Filter by station">
            <option value="">All Stations</option>
            {[...new Set(alarms.map(a => a.station))].sort().map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        )}

        <div className="alarm-search-wrap">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search alarms..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="alarm-search-input"
          />
        </div>
      </div>

      {/* Main Alarms Table */}
      <div className="alarm-table-card">
        <table className="alarm-grid-table">
          <thead>
            <tr>
              <th>Start Time ↓</th>
              {scope === 'global' && <th>Lift Station</th>}
              <th>Alarm Type</th>
              <th>Component</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Resolution</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleAlarms.length === 0 && <tr><td colSpan={scope === 'global' ? 9 : 8} className="alarm-empty-row">No alarm records match these filters.</td></tr>}
            {visibleAlarms.map(a => {
              const isSelected = drawerOpen && selectedId === a.id
              return (
                <tr
                  key={a.id}
                  className={`alarm-row ${isSelected ? 'row-selected-blue' : ''}`}
                  onClick={() => {
                    setSelectedId(a.id)
                    setDrawerOpen(true)
                  }}
                >
                  <td>{formatDisplayTime(a.startedAt)}</td>
                  {scope === 'global' && <td className="alarm-station-cell">{a.station}</td>}
                  <td className="text-blue font-medium">{a.name}</td>
                  <td>{a.component}</td>
                  <td>
                    <span className={`pill-badge badge-${a.severity.toLowerCase()}`}>
                      {a.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`pill-badge badge-${a.status.toLowerCase()}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>{getDuration(a)}</td>
                  <td>{a.resolution || '-'}</td>
                  <td>
                    <button className="action-arrow-btn">›</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="alarm-pagination-bar">
          <div className="pagination-rows">
            Rows per page:
            <select className="rows-select" value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1) }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="pagination-nav">
            <button className="pg-arrow-btn" disabled={currentPage === 1} onClick={() => setPage(1)}>|&lt;</button>
            <button className="pg-arrow-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>&lt;</button>
            <span className="pg-page-text">Page {currentPage} of {pageCount}</span>
            <button className="pg-arrow-btn" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>&gt;</button>
            <button className="pg-arrow-btn" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)}>&gt;|</button>
          </div>
        </div>
      </div>

      {/* Right Drawer / Alarm Details Panel */}
      {drawerOpen && selectedAlarm && (
        <AlarmDrawer
          key={selectedAlarm.id}
          alarm={selectedAlarm}
          onClose={() => setDrawerOpen(false)}
          onStationNavigate={onStationNavigate}
          onManualComplete={onManualComplete}
        />
      )}
    </div>
  )
}

export function AlarmDrawer({
  alarm,
  onClose,
  onAcknowledge: _onAcknowledge,
  onManualComplete,
  onToggleRead: _onToggleRead,
  onStationNavigate,
}: {
  alarm: AlarmLifecycle
  onClose: () => void
  onAcknowledge?: () => void
  onManualComplete?: (data: ManualCompletion) => void
  onToggleRead?: () => void
  onStationNavigate?: (tab: string) => void
}) {
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false)
  const [evidenceTime, setEvidenceTime] = useState(formatAlarmTime(alarm.recoveryEvidence?.at || alarm.lastObservedAt))
  const [reasonNotes, setReasonNotes] = useState(
    alarm.recoveryEvidence?.summary || ''
  )

  const handleComplete = () => {
    if (onManualComplete) {
      onManualComplete({
        id: alarm.id,
        evidenceAt: evidenceTime,
        note: reasonNotes,
        confirmed: true,
      })
    }
    onClose()
  }

  return (
    <>
      <aside className="alarm-detail-drawer">
        {/* Drawer Top Header */}
        <div className="drawer-top-header">
          <div className="drawer-icon-bell">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a6 6 0 0 0-6 6v5l-2 3h16l-2-3V8a6 6 0 0 0-6-6zm0 19a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 21z" />
            </svg>
          </div>
          <div className="drawer-title-box">
            <div className="drawer-title-row">
              <h2>{alarm.name}</h2>
              <span className={`pill-badge badge-${alarm.status.toLowerCase()}`}>
                {alarm.status}
              </span>
            </div>
            <div className="drawer-subtitle">
              {alarm.station} | {alarm.component} | Severity: {alarm.severity}
            </div>
          </div>

          <button
            className="btn-go-level-trend"
            onClick={() => onStationNavigate?.('Trends')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open Station Trends
          </button>

          <button className="btn-close-drawer" onClick={onClose} title="Close drawer">
            ✕
          </button>
        </div>

        {/* Section: Lifecycle Timeline */}
        <div className="drawer-section">
          <h3 className="drawer-section-title">Lifecycle Timeline</h3>
          <div className="drawer-timeline">
            {alarm.events.map(event => (
              <div className="timeline-node-item" key={event.id}>
                <div className={`timeline-node-dot ${event.kind === 'device' ? 'red-bell-dot' : event.kind === 'user' ? 'blue-user-dot' : 'system-dot'}`}>
                  {event.kind === 'device' ? '!' : event.kind === 'user' ? '↗' : '•'}
                </div>
                <div className="timeline-content">
                  <div className="timeline-date">{formatAlarmTime(event.at)}</div>
                  <div className="timeline-action-title">{event.title} <span className="device-tag">({event.kind})</span></div>
                  <div className="timeline-action-desc">{event.detail}</div>
                  {event.value && <div className="timeline-action-desc">Value: {event.value}</div>}
                </div>
              </div>
            ))}
            {alarm.recoveryEvidence && !alarm.events.some(event => event.at === alarm.recoveryEvidence?.at) && (
              <div className="timeline-node-item" key={`recovery-${alarm.id}`}>
                <div className="timeline-node-dot system-dot">•</div>
                <div className="timeline-content">
                  <div className="timeline-date">{formatAlarmTime(alarm.recoveryEvidence.at)}</div>
                  <div className="timeline-action-title">Telemetry evidence received <span className="device-tag">(System)</span></div>
                  <div className="timeline-action-desc">{alarm.recoveryEvidence.summary}</div>
                </div>
              </div>
            )}

            {!['Completed', 'Stale'].includes(alarm.status) ? (
              <div className="timeline-node-item is-tail">
                <div className="timeline-node-dot dotted-hollow-dot" />
                <div className="timeline-content">
                  <div className="timeline-action-title">Lifecycle remains open</div>
                  <div className="timeline-action-desc text-muted">
                    No device clear event has closed this lifecycle.
                  </div>
                </div>
              </div>
            ) : (
              <div className="timeline-node-item is-tail">
                <div className={`timeline-node-dot ${alarm.status === 'Completed' ? 'green-check-dot' : 'dotted-hollow-dot'}`}>{alarm.status === 'Completed' ? '✓' : '!'}</div>
                <div className="timeline-content">
                  <div className="timeline-date">{formatAlarmTime(alarm.resolvedAt || alarm.lastObservedAt)}</div>
                  <div className="timeline-action-title text-green font-semibold">{alarm.status}</div>
                  <div className="timeline-action-desc">
                    Resolution: {alarm.resolution || 'Manual'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section: Current Status */}
        <div className="drawer-section">
          <h3 className="drawer-section-title">Current Status</h3>
          <div className="current-status-box">
            <div className="status-col">
              <small>Start Time</small>
              <strong>{formatAlarmTime(alarm.startedAt)}</strong>
            </div>
            <div className="status-col">
              <small>Duration</small>
              <strong>{formatAlarmDuration(alarm)}{alarm.status === 'Active' || alarm.status === 'Acknowledged' || alarm.status === 'Recovery review' ? ' (Ongoing)' : ''}</strong>
            </div>
            <div className="status-col">
              <small>Last Observed</small>
              <strong>{formatAlarmTime(alarm.lastObservedAt)}</strong>
            </div>
          </div>
        </div>

        {/* Section: Completion */}
        {alarm.recoveryEvidence && alarm.status !== 'Completed' && (
          <div className="completion-card-amber">
            <h3 className="completion-card-title">Completion</h3>
            <div className="completion-notice-row">
              <div className="info-circle-amber">i</div>
              <p>
                Supporting telemetry is available for review. Confirm that it supports normalization before manually completing this lifecycle.
              </p>
            </div>

            <div className="completion-form">
              <label className="field-group-label">Evidence Time (from Status Report) *</label>
              <div className="evidence-input-row">
                <div className="input-with-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <input
                    type="text"
                    className="completion-input"
                    value={evidenceTime}
                    onChange={e => setEvidenceTime(e.target.value)}
                  />
                </div>
                <button className="btn-view-evidence" onClick={() => setEvidenceModalOpen(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  View Evidence
                </button>
              </div>

              <label className="field-group-label mt-3">Reason / Notes *</label>
              <textarea
                className="completion-textarea"
                maxLength={500}
                rows={3}
                value={reasonNotes}
                onChange={e => setReasonNotes(e.target.value)}
              />
              <div className="char-count-line">{reasonNotes.length} / 500</div>

              <div className="completion-buttons-row">
                <button className="btn-cancel-white" onClick={onClose}>
                  Cancel
                </button>
                <button className="btn-mark-completed" onClick={handleComplete}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Mark as Completed
                </button>
              </div>
            </div>
          </div>
        )}

        {alarm.status === 'Completed' && (
          <div className="completion-card-green">
            <h3 className="completion-card-title text-green">Completed Lifecycle</h3>
            <p className="text-sm">
              This lifecycle was marked as completed based on reviewed normalization evidence.
            </p>
            <div className="mt-2 text-xs text-slate-600">
              Resolution: <strong>{alarm.resolution || 'Manual'}</strong> · Evidence Time: 10/12/2026 12:16:19 PM
            </div>
          </div>
        )}
      </aside>

      {/* Evidence Modal */}
      {evidenceModalOpen && (
        <div className="modal-backdrop" onClick={() => setEvidenceModalOpen(false)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Status Report Evidence</h2>
              <button className="btn-close" onClick={() => setEvidenceModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body text-sm space-y-3">
              <div className="kv-item">
                <span className="text-muted">Station</span>
                <strong>{alarm.station}</strong>
              </div>
              <div className="kv-item">
                <span className="text-muted">Component</span>
                <strong>{alarm.component}</strong>
              </div>
              <div className="kv-item">
                <span className="text-muted">Report Timestamp</span>
                <strong>{formatAlarmTime(alarm.recoveryEvidence?.at || alarm.lastObservedAt)}</strong>
              </div>
              <div className="kv-item">
                <span className="text-muted">Liquid Level</span>
                <strong>{alarm.recoveryEvidence?.summary || 'No supporting telemetry detail supplied.'}</strong>
              </div>
              <div className="kv-item">
                <span className="text-muted">Threshold Boundary</span>
                <strong>{alarm.rule}</strong>
              </div>
              <div className="kv-item">
                <span className="text-muted">Device Status</span>
                <strong>{alarm.status === 'Completed' ? 'Lifecycle completed' : 'Lifecycle remains unresolved'}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-open-blue" onClick={() => setEvidenceModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
