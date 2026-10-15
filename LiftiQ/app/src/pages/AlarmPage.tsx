import { useState } from 'react'
import type { AlarmLifecycle } from '../data/model'

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
}: {
  alarms: AlarmLifecycle[]
  onOpen?: (id: string) => void
  onStationNavigate?: (tab: string) => void
  onManualComplete?: (data: ManualCompletion) => void
}) {
  const [activeSubtab, setActiveSubtab] = useState<'history' | 'active'>('history')
  const [selectedId, setSelectedId] = useState<string>('LC-1042')
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false)
  const [timeRange, setTimeRange] = useState('30')
  const [alarmType, setAlarmType] = useState('')
  const [component, setComponent] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Completion form state
  const [evidenceTime, setEvidenceTime] = useState('10/12/2026 12:16:19 PM')
  const [reasonNotes, setReasonNotes] = useState('Wet well level returned to normal based on Status Report (71.1 in). No clear alarm message received from device.')

  const filteredAlarms = alarms.filter(a => {
    if (activeSubtab === 'active' && a.status !== 'Active') return false
    if (alarmType && a.name !== alarmType) return false
    if (component && a.component !== component) return false
    if (statusFilter && a.status !== statusFilter) return false
    if (severityFilter && a.severity !== severityFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const match = a.name.toLowerCase().includes(q) || a.component.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const selectedAlarm = alarms.find(a => a.id === selectedId) || alarms[0]
  const activeCount = alarms.filter(a => a.status === 'Active').length

  const handleComplete = () => {
    if (onManualComplete && selectedAlarm) {
      onManualComplete({
        id: selectedAlarm.id,
        evidenceAt: evidenceTime,
        note: reasonNotes,
        confirmed: true,
      })
    }
  }

  const formatDisplayTime = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const pad = (n: number) => String(n).padStart(2, '0')
    let h = d.getHours()
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`
  }

  const getDuration = (a: AlarmLifecycle) => {
    if (a.id === 'LC-1042') return a.status === 'Active' ? '2h 12m' : '2h 12m'
    if (a.id === 'LC-1041') return '1h 24m'
    if (a.id === 'LC-1040') return '48m'
    if (a.id === 'LC-1039') return '36m'
    if (a.id === 'LC-1038') return '1d 4h'
    if (a.id === 'LC-1037') return '22m'
    if (a.id === 'LC-1036') return '3h 52m'
    if (a.id === 'LC-1035') return '1h 18m'
    if (a.id === 'LC-1034') return '22m'
    if (a.id === 'LC-1032') return '5h 6m'
    return '45m'
  }

  return (
    <div className={`alarm-page-container ${drawerOpen ? 'has-drawer-open' : ''}`}>
      {/* Breadcrumb */}
      <div className="alarm-breadcrumb">
        <a onClick={() => onStationNavigate?.('Overview')}>← All Stations</a>
        <span className="breadcrumb-sep">/</span>
        <a onClick={() => onStationNavigate?.('Overview')}>NOVA_02</a>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">Alarms</span>
      </div>

      {/* Station Header */}
      <div className="alarm-station-header">
        <img src="/station-thumb.png" alt="NOVA_02 Station" className="station-thumb-img" />
        <div className="station-header-text">
          <div className="station-name-row">
            <h1>NOVA_02</h1>
            <span className="wireless-signal-icon" title="Online signal">((•))</span>
          </div>
          <div className="station-meta-subtitle">Lift Station | Hosur, Tamil Nadu</div>
        </div>
      </div>

      {/* Main Station Navigation Tabs */}
      <div className="station-main-nav-tabs">
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Overview')}>Overview</button>
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Visual Twin')}>Visual Twin</button>
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Messages')}>Messages</button>
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Events')}>Events</button>
        <button className="station-tab-btn active-solid-blue" onClick={() => onStationNavigate?.('Alarms')}>Alarms</button>
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Trends')}>Trends</button>
        <button className="station-tab-btn" onClick={() => onStationNavigate?.('Totalizer')}>Totalizer</button>
        <button className="station-tab-btn station-tab-more">•••</button>
      </div>

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
          <option value="Completed">Completed</option>
          <option value="Stale">Stale</option>
        </select>

        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="alarm-select">
          <option value="">All Severity</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

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
            {filteredAlarms.map(a => {
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
            <select className="rows-select" defaultValue="10">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="pagination-nav">
            <button className="pg-arrow-btn" disabled>|&lt;</button>
            <button className="pg-arrow-btn" disabled>&lt;</button>
            <span className="pg-page-text">Page 1 of 5</span>
            <button className="pg-arrow-btn">&gt;</button>
            <button className="pg-arrow-btn">&gt;|</button>
          </div>
        </div>
      </div>

      {/* Right Drawer / Alarm Details Panel */}
      {drawerOpen && selectedAlarm && (
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
                <h2>{selectedAlarm.name}</h2>
                <span className={`pill-badge badge-${selectedAlarm.status.toLowerCase()}`}>
                  {selectedAlarm.status}
                </span>
              </div>
              <div className="drawer-subtitle">
                NOVA_02 | {selectedAlarm.component} | Severity: {selectedAlarm.severity}
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
              Go to Level Trend
            </button>

            <button className="btn-close-drawer" onClick={() => setDrawerOpen(false)} title="Close drawer">
              ✕
            </button>
          </div>

          {/* Section: Lifecycle Timeline */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">Lifecycle Timeline</h3>
            <div className="drawer-timeline">
              <div className="timeline-node-item">
                <div className="timeline-node-dot red-bell-dot">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a6 6 0 0 0-6 6v5l-2 3h16l-2-3V8a6 6 0 0 0-6-6zm0 19a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 21z" />
                  </svg>
                </div>
                <div className="timeline-content">
                  <div className="timeline-date">10/12/2026 10:04:12 AM</div>
                  <div className="timeline-action-title">
                    Alarm Generated <span className="device-tag">(Device)</span>
                  </div>
                  <div className="timeline-action-desc">
                    Wet well level reached 70.2 in (threshold: 70 in).
                  </div>
                </div>
              </div>

              <div className="timeline-node-item">
                <div className="timeline-node-dot red-bell-dot">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a6 6 0 0 0-6 6v5l-2 3h16l-2-3V8a6 6 0 0 0-6-6zm0 19a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 21z" />
                  </svg>
                </div>
                <div className="timeline-content">
                  <div className="timeline-date">10/12/2026 10:08:45 AM</div>
                  <div className="timeline-action-title">
                    Repeat Alarm <span className="device-tag">(Device)</span>
                  </div>
                  <div className="timeline-action-desc">
                    Wet well level still above 70 in (71.4 in).
                  </div>
                </div>
              </div>

              <div className="timeline-node-item">
                <div className="timeline-node-dot red-bell-dot">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a6 6 0 0 0-6 6v5l-2 3h16l-2-3V8a6 6 0 0 0-6-6zm0 19a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 21z" />
                  </svg>
                </div>
                <div className="timeline-content">
                  <div className="timeline-date">10/12/2026 11:20:16 AM</div>
                  <div className="timeline-action-title">
                    Repeat Alarm <span className="device-tag">(Device)</span>
                  </div>
                  <div className="timeline-action-desc">
                    Wet well level 71.8 in.
                  </div>
                </div>
              </div>

              {selectedAlarm.status === 'Active' ? (
                <div className="timeline-node-item is-tail">
                  <div className="timeline-node-dot dotted-hollow-dot" />
                  <div className="timeline-content">
                    <div className="timeline-action-title">No clear event received yet</div>
                    <div className="timeline-action-desc text-muted">
                      The alarm remains active. It will be marked as Stale if no new evidence is received.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="timeline-node-item is-tail">
                  <div className="timeline-node-dot green-check-dot">✓</div>
                  <div className="timeline-content">
                    <div className="timeline-date">10/12/2026 12:16:19 PM</div>
                    <div className="timeline-action-title text-green font-semibold">Completed</div>
                    <div className="timeline-action-desc">
                      Resolution: {selectedAlarm.resolution || 'Manual'}
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
                <strong>10/12/2026 10:04:12 AM</strong>
              </div>
              <div className="status-col">
                <small>Duration</small>
                <strong>{selectedAlarm.status === 'Active' ? '2h 12m (Ongoing)' : '2h 12m'}</strong>
              </div>
              <div className="status-col">
                <small>Last Observed</small>
                <strong>10/12/2026 12:16:19 PM</strong>
              </div>
            </div>
          </div>

          {/* Section: Completion */}
          {selectedAlarm.status === 'Active' && (
            <div className="completion-card-amber">
              <h3 className="completion-card-title">Completion</h3>
              <div className="completion-notice-row">
                <div className="info-circle-amber">i</div>
                <p>
                  A recent Status Report indicates the condition is normalized, but no clear alarm message has been received from the device.
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
                  <button className="btn-cancel-white" onClick={() => setDrawerOpen(false)}>
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

          {selectedAlarm.status === 'Completed' && (
            <div className="completion-card-green">
              <h3 className="completion-card-title text-green">Completed Lifecycle</h3>
              <p className="text-sm">
                This lifecycle was marked as completed based on reviewed normalization evidence.
              </p>
              <div className="mt-2 text-xs text-slate-600">
                Resolution: <strong>{selectedAlarm.resolution || 'Manual'}</strong> · Evidence Time: 10/12/2026 12:16:19 PM
              </div>
            </div>
          )}
        </aside>
      )}

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
                <strong>NOVA_02</strong>
              </div>
              <div className="kv-item">
                <span className="text-muted">Component</span>
                <strong>Wet Well</strong>
              </div>
              <div className="kv-item">
                <span className="text-muted">Report Timestamp</span>
                <strong>10/12/2026 12:16:19 PM</strong>
              </div>
              <div className="kv-item">
                <span className="text-muted">Liquid Level</span>
                <strong className="text-green">71.1 in (recovered from 71.8 in)</strong>
              </div>
              <div className="kv-item">
                <span className="text-muted">Threshold Boundary</span>
                <strong>Activation: 70.0 in · Normalization: 68.0 in</strong>
              </div>
              <div className="kv-item">
                <span className="text-muted">Device Status</span>
                <strong>Normal / No further alarm pulses</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-open-blue" onClick={() => setEvidenceModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
