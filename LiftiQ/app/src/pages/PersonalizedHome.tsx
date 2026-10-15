import { useState } from 'react'
import type { ActivityEvent, NotificationFilters, PersonalizationState } from '../logic/personalization'
import type { AlarmLifecycle } from '../data/model'

type PageId = 'dashboard' | 'stations' | 'alarms' | 'notifications'

interface PriorityAsset {
  id: string
  name: string
  zone: string
  status: string
  statusTone: 'red' | 'amber' | 'green' | 'gray'
  lastViewed: string
  recentActivity: string
}

const defaultAssets: PriorityAsset[] = [
  { id: 'LiftIQ-Asset-001', name: 'LiftIQ-Asset-001', zone: 'Tenkasi Zone', status: 'High Water Level', statusTone: 'red', lastViewed: 'Today\n10:15 AM', recentActivity: 'Viewed 8 times\nLast 2 days' },
  { id: 'NOVA_02', name: 'NOVA_02', zone: 'Hosur Zone', status: 'Pump 1 Fault', statusTone: 'amber', lastViewed: 'Today\n09:42 AM', recentActivity: 'Viewed 5 times\nLast 3 days' },
  { id: 'NOVA_03', name: 'NOVA_03', zone: 'Chennai Zone', status: 'Normal', statusTone: 'green', lastViewed: 'Yesterday\n05:20 PM', recentActivity: 'Viewed 4 times\nLast 7 days' },
  { id: 'Lift Station A', name: 'Lift Station A', zone: 'Bangalore Zone', status: 'No Data', statusTone: 'gray', lastViewed: 'Oct 13, 2026\n11:32 AM', recentActivity: 'Viewed 3 times\nLast 7 days' },
]

export function PersonalizedHome({
  state,
  alarms: _alarms,
  onNavigate,
  onOpenStation,
  onOpenAlarm: _onOpenAlarm,
  onPin: _onPin,
  onOpenView,
  onSaveView: _onSaveView,
  onDeleteView: _onDeleteView,
  onMakeDefault,
  onDismissDefault: _onDismissDefault,
  onReset,
  onReorder: _onReorder,
  onActivity,
}: {
  state: PersonalizationState
  alarms: AlarmLifecycle[]
  onNavigate: (page: PageId) => void
  onOpenStation: (tab?: string) => void
  onOpenAlarm: (id: string) => void
  onPin: (assetId: string) => void
  onOpenView: (filters: NotificationFilters) => void
  onSaveView: (name: string, filters: NotificationFilters) => void
  onDeleteView: (id: string) => void
  onMakeDefault: (page: 'dashboard' | 'personalized') => void
  onDismissDefault: () => void
  onReset: () => void
  onReorder: (order: string[]) => void
  onActivity: (type: ActivityEvent['type'], page: string, metadata?: Record<string, string | number | boolean>, assetId?: string) => void
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [learnMoreOpen, setLearnMoreOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>(state.dismissedSuggestions || [])

  const dismiss = (id: string) => {
    setDismissed(prev => [...prev, id])
    onActivity('suggestion_dismissed', 'personalized-home', { suggestionId: id })
  }

  return (
    <div className="home-container">
      {/* Top Banner Row */}
      <div className="home-top-row">
        <div className="home-greeting-wrap">
          <div className="home-greeting">Good morning, Venky!</div>
          <h1 className="home-title">Personalized Home</h1>
          <p className="home-subtitle">Your frequently used assets, recent activity and suggested pages to help you get started.</p>
        </div>

        <div className="home-top-actions">
          <div className="personalized-callout-card">
            <div className="personalized-callout-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
              </svg>
            </div>
            <div className="personalized-callout-text">
              <strong>This page is personalized for you</strong>
              <span>Based on your recent activity and usage patterns.</span>
              <button className="link-btn" onClick={() => setLearnMoreOpen(true)}>Learn more</button>
            </div>
          </div>

          <button className="btn-personalization-settings" onClick={() => setSettingsOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Personalization Settings
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards Row */}
      <div className="home-kpi-row">
        {/* Active Alarms */}
        <div className="home-kpi-card" onClick={() => { onActivity('home_action', 'personalized-home', { destination: 'alarms' }); onNavigate('alarms') }} role="button" tabIndex={0}>
          <div className="kpi-icon-box kpi-red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-number text-red">3</div>
            <div className="kpi-label">Active Alarms</div>
            <div className="kpi-sub">Needs attention</div>
          </div>
          <div className="kpi-arrow">›</div>
        </div>

        {/* Stations Not Reporting */}
        <div className="home-kpi-card" onClick={() => { onActivity('home_action', 'personalized-home', { destination: 'stations' }); onNavigate('stations') }} role="button" tabIndex={0}>
          <div className="kpi-icon-box kpi-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-number text-amber">2</div>
            <div className="kpi-label">Stations Not Reporting</div>
            <div className="kpi-sub">Check connectivity</div>
          </div>
          <div className="kpi-arrow">›</div>
        </div>

        {/* Stations Operating */}
        <div className="home-kpi-card" onClick={() => { onActivity('home_action', 'personalized-home', { destination: 'stations' }); onNavigate('stations') }} role="button" tabIndex={0}>
          <div className="kpi-icon-box kpi-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17" />
              <path d="M15 9h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0" />
              <path d="M21 15v5a2 2 0 0 1-2 2h-4" />
              <rect x="6" y="6" width="6" height="5" rx="1" />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-number text-green">12</div>
            <div className="kpi-label">Stations Operating</div>
            <div className="kpi-sub">Normal</div>
          </div>
          <div className="kpi-arrow">›</div>
        </div>

        {/* Maintenance Due */}
        <div className="home-kpi-card" onClick={() => { onActivity('home_action', 'personalized-home', { destination: 'station-maintenance' }); onOpenStation('Maintenance') }} role="button" tabIndex={0}>
          <div className="kpi-icon-box kpi-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="m9 14 2 2 4-4" />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-number text-blue">5</div>
            <div className="kpi-label">Maintenance Due</div>
            <div className="kpi-sub">Next 30 days</div>
          </div>
          <div className="kpi-arrow">›</div>
        </div>

        {/* Assigned Stations */}
        <div className="home-kpi-card" onClick={() => { onActivity('home_action', 'personalized-home', { destination: 'stations' }); onNavigate('stations') }} role="button" tabIndex={0}>
          <div className="kpi-icon-box kpi-purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-number text-purple">8</div>
            <div className="kpi-label">Assigned Stations</div>
            <div className="kpi-sub">Your scope</div>
          </div>
          <div className="kpi-arrow">›</div>
        </div>
      </div>

      {/* 2x2 Grid of Cards */}
      <div className="home-main-grid">
        {/* Card 1: Your Priority Assets */}
        <div className="home-content-card">
          <div className="card-header-line">
            <div className="card-title-group">
              <span className="card-title-icon text-blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
                </svg>
              </span>
              <h2 className="card-title">Your Priority Assets</h2>
              <span className="subtle-chip-blue">Based on recent activity</span>
            </div>
            <button className="card-action-link" onClick={() => onNavigate('stations')}>View All</button>
          </div>

          <div className="home-table-wrap">
            <table className="home-table">
              <thead>
                <tr>
                  <th>Station / Asset</th>
                  <th>Status</th>
                  <th>Last Viewed</th>
                  <th>Recent Activity</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {defaultAssets.map(asset => (
                  <tr key={asset.id}>
                    <td>
                      <div className="asset-cell">
                        <div className="asset-avatar-pump">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a4 4 0 0 0-4 4v1H6a2 2 0 0 0-2 2v9a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4zm0 2a2 2 0 0 1 2 2v1h-4V6a2 2 0 0 1 2-2zm-3 8a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="asset-name">{asset.name}</div>
                          <div className="asset-zone">{asset.zone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill pill-${asset.statusTone}`}>
                        <span className="pill-dot" />
                        {asset.status}
                      </span>
                    </td>
                    <td className="whitespace-pre">{asset.lastViewed}</td>
                    <td className="whitespace-pre">{asset.recentActivity}</td>
                    <td>
                      <div className="flex-center-gap">
                        <button
                          className="btn-open-blue"
                          onClick={() => {
                            onActivity('home_action', 'personalized-home', { destination: asset.id }, asset.id)
                            onOpenStation(asset.status.includes('Alarm') || asset.status.includes('Water') || asset.status.includes('Fault') ? 'Alarms' : 'Pump Health')
                          }}
                        >
                          Open
                        </button>
                        <button className="btn-icon-dots" aria-label="More options">⋮</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2: Recent Activity */}
        <div className="home-content-card">
          <div className="card-header-line">
            <div className="card-title-group">
              <span className="card-title-icon text-blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <h2 className="card-title">Recent Activity</h2>
            </div>
            <button className="card-action-link" onClick={() => onNavigate('stations')}>View All</button>
          </div>

          <div className="home-table-wrap">
            <table className="home-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Time</th>
                  <th style={{ width: '140px' }}>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>10:15 AM</td>
                  <td>
                    <span className="action-tag">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Viewed asset
                    </span>
                  </td>
                  <td>
                    <a className="table-link" onClick={() => onOpenStation('Overview')}>LiftIQ-Asset-001</a>
                    <div className="text-muted text-xs">Overview</div>
                  </td>
                </tr>
                <tr>
                  <td>09:58 AM</td>
                  <td>
                    <span className="action-tag">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                      Viewed trends
                    </span>
                  </td>
                  <td>
                    <a className="table-link" onClick={() => onOpenStation('Trends')}>NOVA_02</a>
                    <div className="text-muted text-xs">Level Trends</div>
                  </td>
                </tr>
                <tr>
                  <td>09:42 AM</td>
                  <td>
                    <span className="action-tag">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                      </svg>
                      Viewed alarms
                    </span>
                  </td>
                  <td>
                    <a className="table-link" onClick={() => onOpenStation('Alarms')}>NOVA_02</a>
                    <div className="text-muted text-xs">Active Alarms</div>
                  </td>
                </tr>
                <tr>
                  <td>Yesterday 05:20 PM</td>
                  <td>
                    <span className="action-tag">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Viewed asset
                    </span>
                  </td>
                  <td>
                    <a className="table-link" onClick={() => onOpenStation('Overview')}>NOVA_03</a>
                    <div className="text-muted text-xs">Overview</div>
                  </td>
                </tr>
                <tr>
                  <td>Oct 13, 04:18 PM</td>
                  <td>
                    <span className="action-tag">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      Applied filter
                    </span>
                  </td>
                  <td>
                    <strong>Notifications</strong>
                    <div className="text-muted text-xs">Station: NOVA_02, Severity: Critical, Status: Active</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 3: Your Saved Views */}
        <div className="home-content-card">
          <div className="card-header-line">
            <div className="card-title-group">
              <span className="card-title-icon text-blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </span>
              <h2 className="card-title">Your Saved Views</h2>
            </div>
            <button className="card-action-link" onClick={() => onNavigate('notifications')}>Manage Views</button>
          </div>

          <div className="home-table-wrap">
            <table className="home-table">
              <thead>
                <tr>
                  <th>View Name</th>
                  <th>Page</th>
                  <th>Filter Summary</th>
                  <th>Last Used</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="star-icon">⭐</span>
                    <strong>My Active Alarms</strong>
                  </td>
                  <td>
                    <a className="table-link" onClick={() => onNavigate('notifications')}>Notifications</a>
                  </td>
                  <td>
                    <span className="chip-filter">Status: Active</span>{' '}
                    <span className="chip-filter">Severity: Critical</span>{' '}
                    <span className="chip-filter">+1</span>
                  </td>
                  <td className="whitespace-pre">Today{'\n'}09:42 AM</td>
                  <td>
                    <div className="flex-center-gap">
                      <button className="btn-open-blue" onClick={() => onOpenView({ query: '', type: 'Alarm', read: 'Unread' })}>Open</button>
                      <button className="btn-icon-dots">⋮</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="star-icon">⭐</span>
                    <strong>NOVA_02 Trends</strong>
                  </td>
                  <td>
                    <a className="table-link" onClick={() => onOpenStation('Trends')}>Trends</a>
                  </td>
                  <td>
                    <span className="chip-filter">Station: NOVA_02</span>{' '}
                    <span className="chip-filter">Last 7 days</span>
                  </td>
                  <td className="whitespace-pre">Today{'\n'}09:58 AM</td>
                  <td>
                    <div className="flex-center-gap">
                      <button className="btn-open-blue" onClick={() => onOpenStation('Trends')}>Open</button>
                      <button className="btn-icon-dots">⋮</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="star-icon">⭐</span>
                    <strong>Maintenance Due</strong>
                  </td>
                  <td>
                    <a className="table-link" onClick={() => onOpenStation('Maintenance')}>Maintenance</a>
                  </td>
                  <td>
                    <span className="chip-filter">Due in: 30 days</span>{' '}
                    <span className="chip-filter">My Stations</span>
                  </td>
                  <td className="whitespace-pre">Oct 13, 2026{'\n'}04:20 PM</td>
                  <td>
                    <div className="flex-center-gap">
                      <button className="btn-open-blue" onClick={() => onOpenStation('Maintenance')}>Open</button>
                      <button className="btn-icon-dots">⋮</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 4: Suggested for You */}
        <div className="home-content-card">
          <div className="card-header-line">
            <div className="card-title-group">
              <span className="card-title-icon text-blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                </svg>
              </span>
              <h2 className="card-title">Suggested for You</h2>
            </div>
          </div>

          <div className="suggested-list">
            {!dismissed.includes('sug-1') && (
              <div className="suggested-item">
                <div className="suggested-icon-wrap bg-soft-blue text-blue">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className="suggested-body">
                  <strong>Continue checking Level Trends</strong>
                  <p>You've frequently viewed trends for NOVA_02 in the last 3 days.</p>
                </div>
                <button className="btn-open-blue" onClick={() => { onActivity('suggestion_opened', 'personalized-home', { destination: 'trends' }); onOpenStation('Trends') }}>
                  Open Trends
                </button>
                <button className="btn-dismiss-x" onClick={() => dismiss('sug-1')} title="Dismiss">✕</button>
              </div>
            )}

            {!dismissed.includes('sug-2') && (
              <div className="suggested-item">
                <div className="suggested-icon-wrap bg-soft-red text-red">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </div>
                <div className="suggested-body">
                  <strong>Review active alarms at NOVA_02</strong>
                  <p>There are 2 active alarms in a station you often view.</p>
                </div>
                <button className="btn-open-blue" onClick={() => { onActivity('suggestion_opened', 'personalized-home', { destination: 'alarms' }); onOpenStation('Alarms') }}>
                  Open Alarms
                </button>
                <button className="btn-dismiss-x" onClick={() => dismiss('sug-2')} title="Dismiss">✕</button>
              </div>
            )}

            {!dismissed.includes('sug-3') && (
              <div className="suggested-item">
                <div className="suggested-icon-wrap bg-soft-blue text-blue">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="m9 14 2 2 4-4" />
                  </svg>
                </div>
                <div className="suggested-body">
                  <strong>Check maintenance schedule</strong>
                  <p>5 stations in your scope have maintenance due in the next 30 days.</p>
                </div>
                <button className="btn-open-blue" onClick={() => { onActivity('suggestion_opened', 'personalized-home', { destination: 'maintenance' }); onOpenStation('Maintenance') }}>
                  View Maintenance
                </button>
                <button className="btn-dismiss-x" onClick={() => dismiss('sug-3')} title="Dismiss">✕</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Personalization Settings</h2>
              <button className="btn-close" onClick={() => setSettingsOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm mb-4">
                Personalization learns from your daily usage pattern in this prototype. You can control your landing page preference and local history.
              </p>

              <div className="setting-group mb-4">
                <label className="font-semibold block mb-2 text-sm">Default Landing Page</label>
                <div className="radio-option">
                  <label>
                    <input
                      type="radio"
                      name="landing"
                      checked={state.defaultLanding === 'personalized'}
                      onChange={() => onMakeDefault('personalized')}
                    />{' '}
                    Personalized Home (Recommended)
                  </label>
                </div>
                <div className="radio-option mt-1">
                  <label>
                    <input
                      type="radio"
                      name="landing"
                      checked={state.defaultLanding === 'dashboard'}
                      onChange={() => onMakeDefault('dashboard')}
                    />{' '}
                    Standard Operations Dashboard
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <button
                  className="btn-danger-outline"
                  onClick={() => {
                    if (window.confirm('Reset this demo user’s personalization history, saved views, and layout?')) {
                      onReset()
                      setDismissed([])
                      setSettingsOpen(false)
                    }
                  }}
                >
                  Reset Personalization Data
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-open-blue" onClick={() => setSettingsOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Learn More Modal */}
      {learnMoreOpen && (
        <div className="modal-backdrop" onClick={() => setLearnMoreOpen(false)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>About Personalized Home</h2>
              <button className="btn-close" onClick={() => setLearnMoreOpen(false)}>✕</button>
            </div>
            <div className="modal-body text-sm space-y-3">
              <p>
                <strong>Personalized Home</strong> organizes your daily workflow around the lift stations, trends, and alarms you view most frequently.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li><strong>Priority Assets:</strong> Automatically highlights stations you regularly inspect or that currently have active alerts.</li>
                <li><strong>Recent Activity:</strong> Instant return to recent trends, events, or filtered searches.</li>
                <li><strong>Saved Views:</strong> Shortcuts to your customized filter criteria.</li>
                <li><strong>Suggested for You:</strong> Smart recommendations based on recent maintenance schedules and unresolved alarms.</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn-open-blue" onClick={() => setLearnMoreOpen(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
