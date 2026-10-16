import { useState } from 'react'
import {
  pumpHealthStats,
  pumpMaintenanceData,
  pumps,
  rawMessages,
  station,
} from '../data/mockData'
import type { AlarmLifecycle } from '../data/model'
import { AlarmPage } from './AlarmPage'
import type { ManualCompletion } from './AlarmPage'

const tabs = [
  'Overview',
  'Visual Twin',
  'Messages',
  'Events',
  'Alarms',
  'Trends',
  'Totalizer',
  'Commands',
  'Command History',
  'Maintenance',
  'Pump Health',
  'Configs',
] as const

type Tab = typeof tabs[number]

const formatMaintenanceDate = (value: string) => {
  if (!value) return '—'
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

const daysUntilMaintenance = (value: string) => {
  const due = new Date(`${value.slice(0, 10)}T00:00:00`).getTime()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((due - today.getTime()) / 86400000)
}

const maintenanceTiming = (value: string) => {
  const days = daysUntilMaintenance(value)
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`
  if (days === 0) return 'Due today'
  return `Due in ${days} day${days === 1 ? '' : 's'}`
}

export function StationPage({
  selected: _selected,
  onSelect: _onSelect,
  onBack,
  alarms,
  onOpenAlarm: _onOpenAlarm,
  onToast,
  onTabView,
  initialTab,
  onManualComplete,
}: {
  selected: boolean
  onSelect: () => void
  onBack: () => void
  alarms: AlarmLifecycle[]
  onOpenAlarm: (id: string) => void
  onToast: (message: string) => void
  onTabView: (tab: string) => void
  initialTab: string
  onManualComplete?: (data: ManualCompletion) => void
}) {
  const normalizedInitial = tabs.find(t => t.toLowerCase().replaceAll(' ', '-') === initialTab.toLowerCase().replaceAll(' ', '-')) || 'Pump Health'
  const [tab, setTab] = useState<Tab>(normalizedInitial)
  const [selectedPump, setSelectedPump] = useState<number>(0)
  const [activeMaintTooltip, setActiveMaintTooltip] = useState<number | null>(1) // Default to Node 2 (index 1) as seen in Photo 3!

  // Commands state
  const [commandsList, setCommandsList] = useState([
    { c: 'Wet Well Low Level Set Point', t: '10/12/2026 10:29:55 AM', st: 'Skipped', by: 'Subashini K', d: 'Update Wet Well Low Level Set Point : - → 35 in' },
    { c: 'Lift Station Location', t: '10/12/2026 10:26:24 AM', st: 'Skipped', by: 'Subashini K', d: 'Poll Location of the Lift Station' },
    { c: 'Lift Station Location', t: '10/12/2026 10:22:02 AM', st: 'Skipped', by: 'Venky Karuppanan', d: 'Poll Location of the Lift Station' },
    { c: 'Lift Station Location', t: '10/05/2026 05:23:49 PM', st: 'Skipped', by: 'Maheshkumar B', d: 'Poll Location of the Lift Station' },
  ])
  const [commandMenuIdx, setCommandMenuIdx] = useState(0)

  // Trends state
  const [trendRange, setTrendRange] = useState('7d')
  const [trendSubtab, setTrendSubtab] = useState<'lvl' | 'run'>('lvl')

  // Totalizer state
  const [totalizerGranularity, setTotalizerGranularity] = useState<'d' | 'm' | 'y'>('d')
  const [totalizerView, setTotalizerView] = useState<'chart' | 'list'>('chart')
  const [totalizerMonth, setTotalizerMonth] = useState<'this' | 'last'>('this')

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab)
    onTabView(nextTab)
  }

  const runSimulatedCommand = (name: string) => {
    const timeStr = new Date().toLocaleString()
    const newCmd = {
      c: name,
      t: timeStr,
      st: 'Sent',
      by: 'Venky Karuppanan',
      d: `Simulated request: ${name}`,
    }
    setCommandsList(prev => [newCmd, ...prev])
    onToast(`Simulated command initiated: ${name}`)
    setTimeout(() => {
      setCommandsList(prev => prev.map(c => c.t === timeStr ? { ...c, st: 'Confirmed' } : c))
      onToast(`Command confirmed by simulated device: ${name}`)
    }, 1800)
  }

  const activeAlarmsCount = alarms.filter(a => a.status === 'Active').length
  const selectedMaintenanceEvents = pumpMaintenanceData[selectedPump] || pumpMaintenanceData[0]
  const nextMaintenance = selectedMaintenanceEvents.find(event => event.status === 'Upcoming')
  const hasOverdueMaintenance = selectedMaintenanceEvents.some(event => event.status === 'Upcoming' && daysUntilMaintenance(event.scheduled) < 0)

  return (
    <div className="station-page-wrapper">
      {/* Top Banner (Photo 2 & 3 hybrid design) */}
      <div className="station-top-banner-card">
        <div className="station-banner-left">
          <button className="station-back-link" onClick={onBack}>
            ← Back to Lift Stations
          </button>
          <div className="station-title-indicator-row">
            <h1 className="station-main-title">{station.id}</h1>
            <span className="wireless-signal-icon" title="Wireless connection healthy">((•))</span>
            <span className="station-online-badge">Online</span>
          </div>
          <div className="station-last-reported-line">
            Lift Station • Last Reported at 10/13/2026 04:08 PM
          </div>
        </div>

        {/* Right Station KPIs */}
        <div className="station-banner-stats">
          <div className="station-stat-item">
            <small>Station Health</small>
            <strong className="text-green flex-center-gap">
              <span className="text-xs">✓</span> Good
            </strong>
          </div>

          <div className="station-stat-item">
            <small>Total Pumps</small>
            <strong className="flex-center-gap text-navy">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-blue">
                <path d="M12 2a4 4 0 0 0-4 4v1H6a2 2 0 0 0-2 2v9a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
              </svg>
              3
            </strong>
          </div>

          <div className="station-stat-item">
            <small>Active Alarms</small>
            <strong className="text-red flex-center-gap">
              <span>▲</span> {activeAlarmsCount}
            </strong>
          </div>

          <div className="station-stat-item">
            <small>Maintenance Due</small>
            <strong className="text-amber flex-center-gap">
              <span>⏱</span> 1
            </strong>
          </div>

          {/* Pump indicators */}
          <div className="station-stat-item hidden-mobile">
            <small>Alternating Pumps</small>
            <span className="text-xs font-semibold text-slate-700">P1 (Lead) P2 (Lag) P3 (Lag-Lag)</span>
          </div>
        </div>
      </div>

      {/* Station Subtabs Bar */}
      <div className="station-subtabs-bar">
        {tabs.map(t => {
          const isActive = tab === t
          let badge = null
          if (t === 'Alarms' && activeAlarmsCount > 0) {
            badge = <span className="tab-pill-badge">{activeAlarmsCount}</span>
          }
          let icon = null
          if (t === 'Pump Health') {
            icon = (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mr-1">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            )
          } else if (t === 'Maintenance') {
            icon = (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mr-1">
                <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8 7.2 20l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />
              </svg>
            )
          }

          return (
            <button
              key={t}
              className={`station-nav-tab-btn ${isActive ? 'active-solid-pill' : ''}`}
              onClick={() => changeTab(t)}
            >
              {icon}
              {t}
              {badge}
            </button>
          )
        })}
      </div>

      {/* Main Tab Content */}
      <div className="station-tab-content-area">
        {/* ===================== TAB: PUMP HEALTH (Photo 2) ===================== */}
        {tab === 'Pump Health' && (
          <div className="pump-health-view">
            {/* Title & Filter Header */}
            <div className="view-title-row">
              <div>
                <h2 className="view-main-title">Pump Health</h2>
                <p className="view-sub-title">Monitor pump performance, water output and deviation from peak capacity.</p>
              </div>
              <div className="date-filter-button">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Yesterday (Oct 12, 2026)</span>
                <span className="text-xs">▼</span>
              </div>
            </div>

            {/* Pump Selector Row (3 Tabs) */}
            <div className="pump-selection-tabs-row">
              <button
                className={`pump-tab-box ${selectedPump === 0 ? 'selected-blue' : ''}`}
                onClick={() => setSelectedPump(0)}
              >
                <span className="pump-symbol-icon">⚙</span>
                <strong>Pump 1</strong>
                <span className="role-tag-pill role-lead">Lead</span>
              </button>

              <button
                className={`pump-tab-box ${selectedPump === 1 ? 'selected-blue' : ''}`}
                onClick={() => setSelectedPump(1)}
              >
                <span className="pump-symbol-icon">⚙</span>
                <strong>Pump 2</strong>
                <span className="role-tag-pill role-lag">Lag</span>
              </button>

              <button
                className={`pump-tab-box ${selectedPump === 2 ? 'selected-blue' : ''}`}
                onClick={() => setSelectedPump(2)}
              >
                <span className="pump-symbol-icon">⚙</span>
                <strong>Pump 3</strong>
                <span className="role-tag-pill role-laglag">Lag-Lag</span>
              </button>
            </div>

            {/* Top Metrics Summary Row */}
            {(() => {
              const currentStats = pumpHealthStats[selectedPump] || pumpHealthStats[0]
              const pInfo = pumps[selectedPump] || pumps[0]
              const isHealthy = pInfo.state !== 'Fault'

              return (
                <>
                  <div className="pump-health-summary-card">
                    <div className="pump-identity-col">
                      <img src="/pump-graphic.png" alt="Industrial Pump" className="pump-graphic-img" />
                      <div>
                        <h3 className="pump-name-h3">{pInfo.name}</h3>
                        <div className="pump-health-state-text text-green font-bold">
                          ✓ {isHealthy ? 'Healthy' : 'Fault'}
                        </div>
                        <div className="text-muted text-xs">
                          {isHealthy ? 'Running normally.' : 'Fault alert recorded.'}
                        </div>
                      </div>
                    </div>

                    <div className="pump-metric-col">
                      <div className="metric-circle-icon bg-soft-blue text-blue">💧</div>
                      <div>
                        <small className="metric-label">Peak Capacity</small>
                        <strong className="metric-val">{currentStats.peak} gal/h</strong>
                        <span className="metric-note">Highest achieved</span>
                      </div>
                    </div>

                    <div className="pump-metric-col">
                      <div className="metric-circle-icon bg-soft-blue text-blue">💧</div>
                      <div>
                        <small className="metric-label">Current Capacity</small>
                        <strong className="metric-val">{currentStats.current} gal/h</strong>
                        <span className="metric-note">Based on Oct 12, 2026</span>
                      </div>
                    </div>

                    <div className="pump-metric-col">
                      <div className="metric-circle-icon bg-soft-red text-red">↓</div>
                      <div>
                        <small className="metric-label">Deviation</small>
                        <strong className="metric-val text-red">{currentStats.dev}</strong>
                        <span className="metric-note">vs peak capacity</span>
                      </div>
                    </div>

                    <div className="pump-metric-col">
                      <div className="metric-circle-icon bg-soft-blue text-blue">◷</div>
                      <div>
                        <small className="metric-label">Run Hours (Oct 12)</small>
                        <strong className="metric-val">{currentStats.hours} hrs</strong>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Capacity Trend Chart & Key Information */}
                  <div className="pump-chart-info-grid">
                    {/* Capacity Trend Chart */}
                    <div className="chart-panel-card">
                      <div className="panel-header-line">
                        <div>
                          <h3 className="panel-title">Capacity Trend ({pInfo.name})</h3>
                          <p className="panel-subtitle">Daily average capacity with peak capacity (highest achieved).</p>
                        </div>
                        <div className="chart-legend-box">
                          <span className="legend-item"><span className="legend-dot-blue" /> Daily Capacity</span>
                          <span className="legend-item"><span className="legend-dash-blue" /> Peak Capacity ({currentStats.peak} gal/h)</span>
                        </div>
                      </div>

                      {/* SVG Line Chart */}
                      <div className="chart-canvas-wrap">
                        <svg viewBox="0 0 840 240" className="w-full" role="img" aria-label="Capacity trend chart">
                          {/* Horizontal Grid lines */}
                          {[0, 100, 200, 300, 400, 500, 600, 700].map(v => {
                            const y = 190 - (v / 700) * 160
                            return (
                              <g key={v}>
                                <line x1="45" y1={y} x2="800" y2={y} stroke="#e4eaf2" strokeWidth="1" />
                                <text x="35" y={y + 4} textAnchor="end" fill="#71839a" fontSize="11">{v}</text>
                              </g>
                            )
                          })}

                          {/* Dashed Peak Capacity line */}
                          {(() => {
                            const peakY = 190 - (currentStats.peak / 700) * 160
                            return (
                              <line
                                x1="45"
                                y1={peakY}
                                x2="800"
                                y2={peakY}
                                stroke="#0b63b8"
                                strokeWidth="1.8"
                                strokeDasharray="6 5"
                              />
                            )
                          })()}

                          {/* Smooth curved trend line */}
                          {(() => {
                            const points = currentStats.series.map((v, i) => ({
                              x: 55 + i * 57,
                              y: 190 - (v / 700) * 160,
                            }))
                            const d = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')
                            const fillD = `${d} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`

                            return (
                              <>
                                <path d={fillD} fill="#e1f0fc" opacity="0.6" />
                                <path d={d} fill="none" stroke="#0a7cd8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                                {points.map((p, i) => (
                                  <circle key={i} cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#0a7cd8" strokeWidth="2.5" />
                                ))}
                              </>
                            )
                          })()}

                          {/* X-axis labels */}
                          {['Oct 01', 'Oct 03', 'Oct 05', 'Oct 07', 'Oct 09', 'Oct 11', 'Oct 12'].map((lbl, idx) => (
                            <text key={lbl} x={55 + idx * 114} y="222" textAnchor="middle" fill="#71839a" fontSize="11">{lbl}</text>
                          ))}

                          <text x="15" y="110" transform="rotate(-90 15 110)" textAnchor="middle" fill="#71839a" fontSize="11">Capacity (gal/h)</text>
                        </svg>
                      </div>
                    </div>

                    {/* Key Information Card */}
                    <div className="info-panel-card">
                      <div className="key-info-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <h3 className="panel-title">Key Information (Oct 12, 2026)</h3>
                      </div>

                      <div className="key-info-list">
                        <div className="key-info-row">
                          <span className="row-label"><span className="text-blue">💧</span> Average Capacity</span>
                          <strong>{currentStats.current} gal/h</strong>
                        </div>
                        <div className="key-info-row">
                          <span className="row-label"><span className="text-blue">💧</span> Total Output</span>
                          <strong>{currentStats.total} gal</strong>
                        </div>
                        <div className="key-info-row">
                          <span className="row-label"><span className="text-blue">◷</span> Run Hours</span>
                          <strong>{currentStats.hours} hrs</strong>
                        </div>
                        <div className="key-info-row">
                          <span className="row-label"><span className="text-blue">📈</span> Peak Capacity (Highest)</span>
                          <strong>{currentStats.peak} gal/h</strong>
                        </div>
                        <div className="key-info-row text-red">
                          <span className="row-label"><span>↓</span> Deviation</span>
                          <strong className="text-red">{currentStats.dev}</strong>
                        </div>
                        <div className="key-info-row">
                          <span className="row-label"><span className="text-blue">📅</span> Last Updated</span>
                          <strong>Oct 12, 2026</strong>
                        </div>
                      </div>

                      <button className="btn-view-trend-wide" onClick={() => changeTab('Trends')}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-blue">
                          <rect x="4" y="10" width="4" height="10" rx="1" />
                          <rect x="10" y="5" width="4" height="15" rx="1" />
                          <rect x="16" y="8" width="4" height="12" rx="1" />
                        </svg>
                        View Pump Run Hours Trend &nbsp; ›
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Current vs Peak Capacity */}
                  <div className="current-vs-peak-card">
                    <div className="peak-card-header">
                      <h3 className="panel-title">Current vs Peak Capacity ({pInfo.name})</h3>
                      <p className="panel-subtitle">Visual comparison of current capacity with the highest achieved capacity.</p>
                    </div>

                    <div className="peak-compare-row">
                      <div className="peak-progress-side">
                        <div className="peak-val-indicator" style={{ left: `${Math.round((currentStats.current / currentStats.peak) * 100)}%` }}>
                          <strong>{currentStats.current} gal/h</strong>
                        </div>
                        <div className="peak-track-bar">
                          <div
                            className="peak-fill-bar"
                            style={{ width: `${Math.round((currentStats.current / currentStats.peak) * 100)}%` }}
                          />
                        </div>
                        <div className="peak-goal-indicator">
                          <span>{currentStats.peak} gal/h</span>
                        </div>
                      </div>

                      <div className="peak-gauge-box">
                        <div className="gauge-icon-circle">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="4" y="12" width="3.5" height="8" rx="1" />
                            <rect x="10" y="7" width="3.5" height="13" rx="1" />
                            <rect x="16" y="4" width="3.5" height="16" rx="1" />
                          </svg>
                        </div>
                        <div className="gauge-text-wrap">
                          <span>Current capacity is</span>
                          <span className="gauge-percentage">{Math.round((currentStats.current / currentStats.peak) * 100)}%</span>
                          <span>of peak capacity</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* ===================== TAB: MAINTENANCE (Photo 3) ===================== */}
        {tab === 'Maintenance' && (
          <div className="maintenance-view">
            {/* Pump Selector */}
            <div className="maint-pump-select-row">
              <span className="maint-label font-bold">Select Pump</span>
              <div className="maint-btn-group">
                {[0, 1, 2].map(n => (
                  <button
                    key={n}
                    className={`btn-maint-pump ${selectedPump === n ? 'active-solid' : ''}`}
                    onClick={() => {
                      setSelectedPump(n)
                      setActiveMaintTooltip(n === 0 ? 1 : 0)
                    }}
                  >
                    Pump {n + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Top Layout */}
            <div className="maintenance-top-grid">
              {/* Left Timeline Card */}
              <div className="maintenance-timeline-card">
                <div className="timeline-card-header">
                  <div>
                    <h2 className="panel-title">Pump {selectedPump + 1} Maintenance History & Schedule</h2>
                    <p className="panel-subtitle">Timeline of all maintenance events for this pump. Hover on each event to see details.</p>
                  </div>
                  <div className="timeline-status-legend">
                    <span className="legend-item"><span className="legend-circle dot-green" /> Completed</span>
                    {!hasOverdueMaintenance && <span className="legend-item"><span className="legend-circle dot-amber" /> Upcoming</span>}
                    {hasOverdueMaintenance && <span className="legend-item"><span className="legend-circle dot-red" /> Overdue</span>}
                    <span className="legend-item"><span className="legend-circle dot-grey" /> Future</span>
                  </div>
                </div>

                {/* Horizontal Timeline */}
                <div className="horizontal-timeline-container">
                  <div className="timeline-track-line" />
                  <div className="timeline-track-green" style={{ width: selectedPump === 0 ? '60%' : '50%' }} />

                  {/* Render 5 events */}
                  {(pumpMaintenanceData[selectedPump] || pumpMaintenanceData[0]).map((m, idx) => {
                    const isUpcoming = m.status === 'Upcoming'
                    const isFuture = m.status === 'Future'
                    const isCompleted = m.status === 'Completed'
                    const isOverdue = isUpcoming && daysUntilMaintenance(m.scheduled) < 0
                    const timing = maintenanceTiming(m.scheduled)
                    const isTooltipActive = activeMaintTooltip === idx

                    return (
                      <div
                        key={idx}
                        className={`timeline-step-node ${isUpcoming ? 'step-upcoming' : ''} ${isOverdue ? 'step-overdue' : ''} ${isFuture ? 'step-future' : ''}`}
                        onMouseEnter={() => setActiveMaintTooltip(idx)}
                        onClick={() => setActiveMaintTooltip(idx)}
                      >
                        {/* Hover Popup Card (Matches Photo 3 tooltip) */}
                        {isTooltipActive && (
                          <div className="maint-node-popup">
                            <div className="popup-title-row">
                              <strong>{m.type}</strong>
                              <span className={`pill-badge badge-${isOverdue ? 'high' : m.status.toLowerCase()}`}>{isOverdue ? 'Overdue' : m.status}</span>
                            </div>
                            <div className="popup-dates-row">
                              <span>Due Date:</span>
                              <strong>{formatMaintenanceDate(m.scheduled)}</strong>
                            </div>
                            {m.maintained && (
                              <div className="popup-dates-row">
                                <span>Maintained Date:</span>
                                <strong>{formatMaintenanceDate(m.maintained)}</strong>
                              </div>
                            )}
                            <div className={`popup-diff-text ${isUpcoming ? 'text-red' : 'text-green'}`}>
                              {isUpcoming ? timing : m.difference}
                            </div>
                            <p className="popup-notes-text">{m.notes}</p>
                          </div>
                        )}

                        {/* Node circle */}
                        <div className={`timeline-circle-icon ${isCompleted ? 'circle-green' : isOverdue ? 'circle-red' : isUpcoming ? 'circle-amber' : 'circle-grey'}`}>
                          {isCompleted ? (
                            m.type === 'Initial Commissioning' ? '▤' : '✓'
                          ) : isUpcoming ? (
                            isOverdue ? '!' : '⏱'
                          ) : (
                            '◔'
                          )}
                        </div>

                        <div className="timeline-node-date">{formatMaintenanceDate(m.maintained || m.scheduled)}</div>
                        <div className="timeline-node-name">{m.type === 'Initial Commissioning' ? 'Installed' : m.type}</div>
                        <div className="timeline-node-diff">
                          {isCompleted ? (
                            m.type === 'Initial Commissioning' ? (
                              <span className="text-muted text-xs">Pump added to system and ready for use.</span>
                            ) : (
                              <span className="text-muted text-xs">Completed ({m.difference})</span>
                            )
                          ) : isUpcoming ? (
                            <span className="text-red font-semibold text-xs">{timing}</span>
                          ) : (
                            <span className="text-muted text-xs">Upcoming</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right Next Maintenance Card */}
              <div className="next-maintenance-card">
                <div className="next-maint-header">
                  <h2 className="panel-title">Next Maintenance</h2>
                  <span className={`pill-badge ${nextMaintenance && daysUntilMaintenance(nextMaintenance.scheduled) < 0 ? 'badge-high' : 'badge-warning'}`}>
                    {nextMaintenance ? maintenanceTiming(nextMaintenance.scheduled) : 'No upcoming maintenance'}
                  </span>
                </div>

                <div className="next-maint-fields">
                  <div className="maint-field-row">
                    <span>Maintenance Type</span>
                    <strong>{nextMaintenance?.type || '—'}</strong>
                  </div>
                  <div className="maint-field-row">
                    <span>Scheduled Date</span>
                    <strong>{nextMaintenance ? formatMaintenanceDate(nextMaintenance.scheduled) : '—'}</strong>
                  </div>
                  <div className="maint-field-row">
                    <span>Maintenance Interval</span>
                    <strong>180 days</strong>
                  </div>
                  <div className="maint-field-row">
                    <span>Priority</span>
                    <span className="pill-badge badge-warning">Medium</span>
                  </div>
                  <div className="maint-field-row">
                    <span>Assigned To</span>
                    <strong>-</strong>
                  </div>
                  <div className="maint-field-row align-top">
                    <span>Description</span>
                    <strong className="text-slate-700 font-normal">{nextMaintenance?.notes || 'No scheduled maintenance details.'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Maintenance Events Table Card */}
            <div className="maint-events-card">
              <div className="maint-events-header">
                <h2 className="panel-title">Maintenance Events</h2>
                <p className="panel-subtitle">List of all maintenance events for this pump, latest and upcoming shown first.</p>
              </div>

              <div className="home-table-wrap">
                <table className="maint-table">
                  <thead>
                    <tr>
                      <th>Maintenance Type</th>
                      <th>Scheduled / Due Date</th>
                      <th>Maintained Date</th>
                      <th>Status</th>
                      <th>Difference</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pumpMaintenanceData[selectedPump] || pumpMaintenanceData[0]).map((ev, i) => {
                      const isUpcoming = ev.status === 'Upcoming'
                      return (
                        <tr key={i} className={isUpcoming ? (daysUntilMaintenance(ev.scheduled) < 0 ? 'row-upcoming-overdue' : 'row-upcoming-amber') : ''}>
                          <td>
                            <div className="flex-center-gap">
                              <span className="maint-type-icon">
                                {ev.type.includes('Inspection') ? '🔍' : ev.type.includes('Commissioning') ? '⚙' : isUpcoming ? '⏱' : '🔧'}
                              </span>
                              <strong>{ev.type}</strong>
                            </div>
                          </td>
                          <td>{formatMaintenanceDate(ev.scheduled)}</td>
                          <td>{formatMaintenanceDate(ev.maintained)}</td>
                          <td>
                            <span className={`pill-badge badge-${isUpcoming && daysUntilMaintenance(ev.scheduled) < 0 ? 'high' : ev.status.toLowerCase()}`}>
                              {isUpcoming && daysUntilMaintenance(ev.scheduled) < 0 ? 'Overdue' : ev.status}
                            </span>
                          </td>
                          <td className={isUpcoming ? 'text-red font-semibold' : 'text-green font-semibold'}>
                            {isUpcoming ? maintenanceTiming(ev.scheduled) : ev.difference}
                          </td>
                          <td className="text-slate-600">{ev.notes}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: ALARMS (Photo 1) ===================== */}
        {tab === 'Alarms' && (
          <AlarmPage
            embedded
            alarms={alarms}
            onStationNavigate={tabName => changeTab(tabName as Tab)}
            onManualComplete={onManualComplete}
          />
        )}

        {/* ===================== TAB: VISUAL TWIN ===================== */}
        {tab === 'Visual Twin' && (
          <div className="visual-twin-grid">
            <div className="twin-schematic-card">
              <h3 className="panel-title mb-2">Liquid Level & Wet Well Schematic</h3>
              <div className="twin-svg-wrap">
                <svg viewBox="0 0 560 380" className="w-full max-w-xl mx-auto" role="img" aria-label="Wet well diagram">
                  <text x="140" y="24" textAnchor="end" fontSize="13" fill="#102b50">
                    Total Height <tspan fill="#0a7cd8" fontWeight="bold">120 in</tspan>
                  </text>

                  {/* Setpoint levels */}
                  <text x="140" y="70" textAnchor="end" fontSize="11" fill="#526b87">Pump 3 On <tspan fill="#0a7cd8" fontWeight="bold">110.04 in</tspan></text>
                  <text x="140" y="115" textAnchor="end" fontSize="11" fill="#526b87">Lag On <tspan fill="#0a7cd8" fontWeight="bold">75 in</tspan></text>
                  <text x="140" y="160" textAnchor="end" fontSize="11" fill="#526b87">Lead On <tspan fill="#0a7cd8" fontWeight="bold">60 in</tspan></text>
                  <text x="140" y="205" textAnchor="end" fontSize="11" fill="#526b87">Pump 3 Off <tspan fill="#0a7cd8" fontWeight="bold">60 in</tspan></text>
                  <text x="140" y="250" textAnchor="end" fontSize="11" fill="#526b87">Lag Off <tspan fill="#0a7cd8" fontWeight="bold">30 in</tspan></text>
                  <text x="140" y="295" textAnchor="end" fontSize="11" fill="#526b87">Lead Off <tspan fill="#0a7cd8" fontWeight="bold">9.96 in</tspan></text>

                  {/* Wet Well Tank */}
                  <rect x="150" y="30" width="180" height="300" fill="#eef3f8" stroke="#8ca3ba" strokeWidth="2" rx="4" />
                  {/* Liquid */}
                  <rect x="151" y="290" width="178" height="39" fill="#38a2f5" opacity="0.85" rx="2" />

                  <text x="240" y="75" textAnchor="middle" fontSize="12" fill="#536b87">Liquid Level</text>
                  <text x="240" y="105" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#0b2a59">4.00 in</text>
                  <text x="240" y="125" textAnchor="middle" fontSize="11" fill="#138451">Normal</text>

                  {/* Pump Circles */}
                  {[0, 1, 2].map(i => {
                    const cx = 175 + i * 65
                    const colors = ['#2fb45a', '#e03a3a', '#2fb45a']
                    const roles = ['LEAD', 'LAG', 'LAG-LAG']
                    return (
                      <g key={i}>
                        <circle cx={cx} cy="260" r="20" fill={colors[i]} />
                        <text x={cx} y="265" textAnchor="middle" fill="#fff" fontWeight="bold" fontSize="12">P{i + 1}</text>
                        <text x={cx} y="300" textAnchor="middle" fontSize="11" fill="#102b50" fontWeight="bold">
                          {i === 1 ? '0 A' : '20 A'}
                        </text>
                        <text x={cx} y="315" textAnchor="middle" fontSize="10" fill="#526b87">
                          {pumps[i].runHours} Hrs
                        </text>
                        <rect x={cx - 24} y="325" width="48" height="15" fill="#e2edfc" rx="3" />
                        <text x={cx} y="336" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0a64a8">{roles[i]}</text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            <div className="twin-info-card">
              <h3 className="panel-title mb-3">ⓘ Station Information</h3>
              <dl className="twin-kv-list">
                <div className="kv-item"><span>Station Name</span><strong>NOVA_02</strong></div>
                <div className="kv-item"><span>Location</span><strong className="text-blue">Hosur, Tamil Nadu</strong></div>
                <div className="kv-item"><span>Account</span><strong>Nova Water Works</strong></div>
                <div className="kv-item"><span>Station Type</span><strong>Pump Station</strong></div>
                <div className="kv-item"><span>Liquid Type</span><strong>Waste Water</strong></div>
                <div className="kv-item"><span>Device ID</span><strong>NOVA_02</strong></div>
                <div className="kv-item"><span>Reporting Status</span><strong className="text-green">ONLINE (Reporting)</strong></div>
                <div className="kv-item"><span>Firmware Version</span><strong>v3.4.12-RT</strong></div>
              </dl>
            </div>
          </div>
        )}

        {/* ===================== TAB: MESSAGES ===================== */}
        {tab === 'Messages' && (
          <div className="messages-view-card">
            <div className="flex justify-between items-center mb-3">
              <h3 className="panel-title">Raw Telemetry Messages (Total: {rawMessages.length})</h3>
              <span className="subtle-chip-blue">Last 7 Days (Oct 9 - 15, 2026)</span>
            </div>
            <table className="home-table">
              <thead>
                <tr>
                  <th>Event Time</th>
                  <th>Reason Code</th>
                  <th>Level 1 (in)</th>
                  <th>Alarms</th>
                  <th>P1 Status</th>
                  <th>P2 Status</th>
                  <th>P3 Status</th>
                </tr>
              </thead>
              <tbody>
                {rawMessages.map((m, i) => (
                  <tr key={i}>
                    <td>📶 {m.t.replace('T', ' ')}</td>
                    <td><span className="rc-tag">{m.rs}</span></td>
                    <td className="font-semibold">{m.lv.toFixed(2)}</td>
                    <td>{m.al} <span className="text-red">●</span></td>
                    <td>{m.p1.a} A · {m.p1.h} Hrs</td>
                    <td>{m.p2.a} A · {m.p2.h} Hrs</td>
                    <td>{m.p3.a} A · {m.p3.h} Hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===================== TAB: EVENTS ===================== */}
        {tab === 'Events' && (
          <div className="messages-view-card">
            <h3 className="panel-title mb-3">Station Events Log</h3>
            <table className="home-table">
              <thead>
                <tr>
                  <th>Event Time</th>
                  <th>Event Type</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>10/13/2026 04:08 PM</td>
                  <td><span className="rc-tag">Scheduled Message</span></td>
                  <td>Routine reporting message received from station controller.</td>
                </tr>
                <tr>
                  <td>10/12/2026 12:16 PM</td>
                  <td><span className="pill-badge badge-warning">Status Report</span></td>
                  <td>Wet well level reported at 71.1 in (normalized from 71.8 in).</td>
                </tr>
                <tr>
                  <td>10/12/2026 10:04 AM</td>
                  <td><span className="pill-badge badge-high">Alarm Triggered</span></td>
                  <td>High Level alarm generated on Wet Well (70.2 in).</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ===================== TAB: TRENDS ===================== */}
        {tab === 'Trends' && (
          <div className="trends-view-card">
            <div className="trends-kpi-row">
              <div className="kpi-mini-box">
                <small>Total Liquid Outlet (This Month)</small>
                <strong>28,000 gal</strong>
              </div>
              <div className="kpi-mini-box">
                <small>Avg. Liquid Outlet (This Month)</small>
                <strong>2,154 gpd</strong>
              </div>
              <div className="kpi-mini-box">
                <small>Highest Liquid Outlet (Last 30d)</small>
                <strong>12,300 gal</strong>
                <small className="text-muted">on 10/07/2026</small>
              </div>
              <div className="kpi-mini-box">
                <small>Avg. Run Hours (This Month)</small>
                <strong>4.1 hrs/day</strong>
              </div>
            </div>

            <div className="panel-header-line mt-4">
              <div className="flex gap-2">
                <button
                  className={`btn-maint-pump ${trendSubtab === 'lvl' ? 'active-solid' : ''}`}
                  onClick={() => setTrendSubtab('lvl')}
                >
                  Wet Well Level
                </button>
                <button
                  className={`btn-maint-pump ${trendSubtab === 'run' ? 'active-solid' : ''}`}
                  onClick={() => setTrendSubtab('run')}
                >
                  Pump Run Hours
                </button>
              </div>

              <select value={trendRange} onChange={e => setTrendRange(e.target.value)} className="alarm-select">
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            {trendSubtab === 'lvl' ? (
              <div className="chart-canvas-wrap mt-3">
                <svg viewBox="0 0 900 280" className="w-full">
                  {[0, 30, 60, 90, 120].map(v => {
                    const y = 240 - (v / 120) * 200
                    return (
                      <g key={v}>
                        <line x1="50" y1={y} x2="860" y2={y} stroke="#e4eaf2" />
                        <text x="40" y={y + 4} textAnchor="end" fill="#71839a" fontSize="11">{v}</text>
                      </g>
                    )
                  })}
                  {/* High level threshold 70 in */}
                  <line x1="50" y1={240 - (70 / 120) * 200} x2="860" y2={240 - (70 / 120) * 200} stroke="#e03a3a" strokeDasharray="5 4" strokeWidth="1.8" />
                  <text x="850" y={240 - (70 / 120) * 200 - 6} textAnchor="end" fill="#e03a3a" fontSize="11">High level threshold 70 in</text>

                  {/* Level trend line */}
                  <polyline
                    fill="none"
                    stroke="#0a7cd8"
                    strokeWidth="2.5"
                    points="50,225 150,223 250,220 350,218 450,123 480,121 510,122 550,222 650,224 750,225 850,224"
                  />
                  <text x="470" y="110" textAnchor="middle" fill="#0a7cd8" fontWeight="bold" fontSize="11">Oct 12 Alarm Peak (71.8 in)</text>

                  <text x="20" y="140" transform="rotate(-90 20 140)" textAnchor="middle" fill="#71839a" fontSize="11">Wet Well Level (in)</text>
                </svg>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <p>Pump Run Hours recorded across 3 pumps: P1: 200h · P2: 214h · P3: 198h</p>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB: TOTALIZER ===================== */}
        {tab === 'Totalizer' && (
          <div className="totalizer-view-card">
            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-2">
                <button className={`btn-maint-pump ${totalizerGranularity === 'y' ? 'active-solid' : ''}`} onClick={() => setTotalizerGranularity('y')}>Yearly</button>
                <button className={`btn-maint-pump ${totalizerGranularity === 'm' ? 'active-solid' : ''}`} onClick={() => setTotalizerGranularity('m')}>Monthly</button>
                <button className={`btn-maint-pump ${totalizerGranularity === 'd' ? 'active-solid' : ''}`} onClick={() => setTotalizerGranularity('d')}>Daily</button>
              </div>

              <div className="flex gap-2">
                <button className={`btn-maint-pump ${totalizerMonth === 'this' ? 'active-solid' : ''}`} onClick={() => setTotalizerMonth('this')}>This Month (Oct 2026)</button>
                <button className={`btn-maint-pump ${totalizerMonth === 'last' ? 'active-solid' : ''}`} onClick={() => setTotalizerMonth('last')}>Last Month (Sep 2026)</button>
              </div>

              <div className="flex gap-2">
                <button className={`btn-maint-pump ${totalizerView === 'chart' ? 'active-solid' : ''}`} onClick={() => setTotalizerView('chart')}>Chart View</button>
                <button className={`btn-maint-pump ${totalizerView === 'list' ? 'active-solid' : ''}`} onClick={() => setTotalizerView('list')}>List View</button>
              </div>
            </div>

            {totalizerView === 'chart' ? (
              <div className="chart-canvas-wrap">
                <svg viewBox="0 0 860 260" className="w-full">
                  {[0, 3000, 6000, 9000, 12000].map(v => {
                    const y = 220 - (v / 12000) * 180
                    return (
                      <g key={v}>
                        <line x1="60" y1={y} x2="820" y2={y} stroke="#e4eaf2" />
                        <text x="50" y={y + 4} textAnchor="end" fill="#71839a" fontSize="11">{v.toLocaleString()}</text>
                      </g>
                    )
                  })}
                  {/* Bars for October dates */}
                  {Array.from({ length: 15 }).map((_, i) => {
                    const day = i + 1
                    const gal = day === 7 ? 12300 : day === 12 ? 8300 : day === 13 ? 4600 : day === 6 ? 300 : day === 9 ? 1500 : 0
                    const barH = (gal / 12000) * 180
                    const x = 75 + i * 48
                    return (
                      <g key={i}>
                        <rect x={x} y={220 - barH} width="28" height={barH} fill="#0a7cd8" rx="2">
                          <title>Oct {day}: {gal.toLocaleString()} gal</title>
                        </rect>
                        <text x={x + 14} y="238" textAnchor="middle" fill="#71839a" fontSize="10">{day}</text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            ) : (
              <table className="home-table">
                <thead><tr><th>Day (Oct 2026)</th><th>Total Liquid Outlet (gal)</th></tr></thead>
                <tbody>
                  <tr><td>Oct 07, 2026</td><td className="font-bold">12,300 gal</td></tr>
                  <tr><td>Oct 12, 2026</td><td className="font-bold">8,300 gal</td></tr>
                  <tr><td>Oct 13, 2026</td><td className="font-bold">4,600 gal</td></tr>
                  <tr><td>Oct 09, 2026</td><td className="font-bold">1,500 gal</td></tr>
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ===================== TAB: COMMANDS ===================== */}
        {tab === 'Commands' && (
          <div className="commands-split-grid">
            {/* Left Nav */}
            <div className="commands-menu-nav">
              <h6 className="command-category-title">WET WELL</h6>
              <button className={`command-nav-item ${commandMenuIdx === 0 ? 'active' : ''}`} onClick={() => setCommandMenuIdx(0)}>
                Set Wet Well Level Alarm
              </button>
              <button className={`command-nav-item ${commandMenuIdx === 1 ? 'active' : ''}`} onClick={() => setCommandMenuIdx(1)}>
                Poll Firmware Version
              </button>
              <button className={`command-nav-item ${commandMenuIdx === 2 ? 'active' : ''}`} onClick={() => setCommandMenuIdx(2)}>
                Configure Lead/Lag Set Points
              </button>

              <h6 className="command-category-title mt-4">PUMPS</h6>
              <button className={`command-nav-item ${commandMenuIdx === 3 ? 'active' : ''}`} onClick={() => setCommandMenuIdx(3)}>
                Pump 1 Mode &amp; On/Off
              </button>
              <button className={`command-nav-item ${commandMenuIdx === 4 ? 'active' : ''}`} onClick={() => setCommandMenuIdx(4)}>
                Pump 2 Mode &amp; On/Off
              </button>
              <button className={`command-nav-item ${commandMenuIdx === 5 ? 'active' : ''}`} onClick={() => setCommandMenuIdx(5)}>
                Pump 3 Mode &amp; On/Off
              </button>
            </div>

            {/* Middle Main Command Pane */}
            <div className="command-pane-card">
              <h2 className="panel-title text-xl mb-2">Set Wet Well Level Alarm</h2>
              <p className="text-slate-600 text-sm mb-4">Set Low and High wet well level thresholds to trigger station alarms.</p>

              <div className="command-param-box">
                <div className="font-semibold text-sm">Wet Well Low Level Alarm: 12 in</div>
                <div className="text-xs text-muted mb-2">Last Updated: 10/12/2026 10:29 AM</div>
                <div className="flex gap-2">
                  <button className="btn-cancel-white" onClick={() => runSimulatedCommand('Poll Wet Well Low Level')}>⟳ Poll Latest</button>
                  <button className="btn-open-blue" onClick={() => runSimulatedCommand('Update Wet Well Low Level to 12 in')}>✎ Update</button>
                </div>
              </div>

              <div className="command-param-box mt-3">
                <div className="font-semibold text-sm">Wet Well High Level Alarm: 70 in</div>
                <div className="text-xs text-muted mb-2">Last Updated: 10/12/2026 10:04 AM</div>
                <div className="flex gap-2">
                  <button className="btn-cancel-white" onClick={() => runSimulatedCommand('Poll Wet Well High Level')}>⟳ Poll Latest</button>
                  <button className="btn-open-blue" onClick={() => runSimulatedCommand('Update Wet Well High Level to 70 in')}>✎ Update</button>
                </div>
              </div>

              <div className="callout-note mt-5">
                Commands are transmitted to the remote telemetry unit and take effect once confirmed by the controller.
              </div>
            </div>

            {/* Right Command History */}
            <div className="command-side-history">
              <h3 className="history-side-title">Recent Command History</h3>
              <div className="divide-y divide-slate-100">
                {commandsList.slice(0, 5).map((c, i) => (
                  <div key={i} className="p-3 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <strong>{c.c}</strong>
                      <span className={`pill-badge ${c.st === 'Confirmed' ? 'badge-completed' : c.st === 'Sent' ? 'badge-warning' : 'badge-stale'}`}>{c.st}</span>
                    </div>
                    <div className="text-slate-600">{c.d}</div>
                    <div className="text-muted mt-1">{c.t} · {c.by}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: COMMAND HISTORY ===================== */}
        {tab === 'Command History' && (
          <div className="messages-view-card">
            <h3 className="panel-title mb-3">All Station Commands History</h3>
            <table className="home-table">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Initiated Time</th>
                  <th>Status</th>
                  <th>Initiated By</th>
                  <th>Command Details</th>
                </tr>
              </thead>
              <tbody>
                {commandsList.map((c, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{c.c}</td>
                    <td>{c.t}</td>
                    <td>
                      <span className={`pill-badge ${c.st === 'Confirmed' ? 'badge-completed' : c.st === 'Sent' ? 'badge-warning' : 'badge-stale'}`}>{c.st}</span>
                    </td>
                    <td>👤 {c.by}</td>
                    <td className="text-slate-600">{c.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===================== TAB: CONFIGS ===================== */}
        {tab === 'Configs' && (
          <div className="twin-info-card max-w-2xl">
            <h3 className="panel-title mb-4">Station Configuration</h3>
            <dl className="twin-kv-list">
              <div className="kv-item"><span>Configured For</span><strong>Control</strong></div>
              <div className="kv-item"><span>Number of Pumps</span><strong>3</strong></div>
              <div className="kv-item"><span>Number of Sensors Enabled</span><strong>8</strong></div>
              <div className="kv-item"><span>Telemetry Interval</span><strong>1 Hour</strong></div>
              <div className="kv-item"><span>Fail-Safe Mode</span><strong>Auto Alternating</strong></div>
            </dl>
            <div className="mt-5 flex justify-end">
              <button className="btn-cancel-white" onClick={() => onToast('Station configuration polled.')}>
                ⟳ Poll Station Configuration
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB: OVERVIEW ===================== */}
        {tab === 'Overview' && (
          <div className="messages-view-card">
            <h3 className="panel-title mb-3">Station Overview &amp; Live Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="twin-schematic-card p-4">
                <span className="text-xs text-muted block mb-1">Liquid Depth</span>
                <strong className="text-2xl text-blue">4.00 in</strong>
                <p className="text-xs text-slate-500 mt-1">Normal operating level</p>
              </div>
              <div className="twin-schematic-card p-4">
                <span className="text-xs text-muted block mb-1">Total Pumps Running</span>
                <strong className="text-2xl text-green">2 of 3</strong>
                <p className="text-xs text-slate-500 mt-1">Pump 1 &amp; Pump 3 ON</p>
              </div>
              <div className="twin-schematic-card p-4">
                <span className="text-xs text-muted block mb-1">Active Alerts</span>
                <strong className="text-2xl text-red">1 Active</strong>
                <p className="text-xs text-slate-500 mt-1">LC-1042 High Level</p>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              Select any subtab above (Visual Twin, Messages, Alarms, Trends, Totalizer, Pump Health, Maintenance) for complete deep telemetry records.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
