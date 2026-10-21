import { useEffect, useState } from 'react'
import { AlarmDrawer, AlarmPage } from './pages/AlarmPage'
import type { ManualCompletion } from './pages/AlarmPage'
import { Dashboard } from './pages/Dashboard'
import { PersonalizedHome } from './pages/PersonalizedHome'
import { NotificationsPage } from './pages/NotificationsPage'
import { StationPage } from './pages/StationPage'
import { StationsListPage } from './pages/StationsListPage'
import { EventsHistoryPage } from './pages/EventsHistoryPage'
import { initialAlarms, initialNotifications, initialPreferences, station } from './data/mockData'
import type { AlarmLifecycle, MuteRule, NotificationItem } from './data/model'
import { NotificationBell } from './components/NotificationBell'
import { mapAlarmsToNotificationPreviews } from './integrations/notifications/liftiqEvent'
import { acknowledgeLifecycle, manuallyCompleteLifecycle } from './logic/alarmLifecycle'
import {
  appendActivity,
  createActivity,
  DEFAULT_PERSONALIZATION,
  loadPersonalization,
  persistPersonalization,
  validateNotificationFilters,
} from './logic/personalization'
import type {
  ActivityEvent,
  NotificationFilters,
  PersonalizationState,
} from './logic/personalization'

type Route = 'dashboard' | 'personalized' | 'stations' | 'alarms' | 'notifications' | 'reports'

const nav: [Route, string, string][] = [
  ['dashboard', '▦', 'Dashboard'],
  ['personalized', '✦', 'Personalized Home'],
  ['stations', '◆', 'Lift Stations'],
  ['alarms', '⚠', 'Alarms'],
  ['notifications', '🔔', 'Notifications'],
  ['reports', '▤', 'Events & History'],
]

export default function App() {
  const [personalization, setPersonalization] = useState<PersonalizationState>(() => loadPersonalization())
  const [route, setRoute] = useState<Route>(() =>
    loadPersonalization().defaultLanding === 'personalized' ? 'personalized' : 'dashboard'
  )
  const [stationSelected, setStationSelected] = useState(false)
  const [stationTab, setStationTab] = useState('Pump Health')
  const [taskEntry, setTaskEntry] = useState<{ source: 'home' | 'dashboard'; at: number } | null>(null)
  const [alarms, setAlarms] = useState<AlarmLifecycle[]>(initialAlarms)
  const [notices, setNotices] = useState<NotificationItem[]>(initialNotifications)
  const [preferences, setPreferences] = useState(initialPreferences)
  const [muteRules, setMuteRules] = useState<MuteRule[]>([])
  const [selectedAlarm, setSelectedAlarm] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [currentUser, setCurrentUser] = useState<'venky' | 'subashini'>('venky')

  const alarm = alarms.find(a => a.id === selectedAlarm) || null
  const activeAlarmsCount = alarms.filter(a => ['Active', 'Recovery review'].includes(a.status)).length
  const unreadNoticesCount = notices.filter(n => n.unread).length

  useEffect(() => persistPersonalization(personalization), [personalization])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const linkedStation = params.get('station')
    if (linkedStation !== station.id) return
    const requestedTab = params.get('tab') || 'Overview'
    const supportedTabs = ['Overview', 'Visual Twin', 'Messages', 'Events', 'Alarms', 'Trends', 'Totalizer', 'Commands', 'Command History', 'Maintenance', 'Pump Health', 'Configs']
    setRoute('stations')
    setStationSelected(true)
    setStationTab(supportedTabs.includes(requestedTab) ? requestedTab : 'Overview')
  }, [])

  useEffect(() => {
    const page = route === 'personalized' ? 'personalized-home' : route
    const event = createActivity('page_viewed', page)
    setPersonalization(prev => appendActivity(prev, event))
  }, [route])

  const track = (
    type: ActivityEvent['type'],
    page: string,
    metadata?: Record<string, string | number | boolean>,
    assetId?: string
  ) => {
    const event = createActivity(type, page, metadata, assetId)
    setPersonalization(prev => appendActivity(prev, event))
  }

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  const navigate = (next: Route) => {
    if (next === 'personalized') track('page_viewed', 'personalized-home')
    else track('page_viewed', next)

    if (next === 'stations') {
      if (route === 'personalized' || route === 'dashboard') {
        setTaskEntry({ source: route === 'personalized' ? 'home' : 'dashboard', at: Date.now() })
      }
      setStationSelected(false)
    } else {
      setTaskEntry(null)
    }

    setRoute(next)
    setSelectedAlarm(null)
  }

  const recordAssetOpen = (source: 'home' | 'dashboard', startedAt: number) => {
    track(
      source === 'home' ? 'asset_opened_from_home' : 'asset_opened_from_dashboard',
      'stations',
      { seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)), metric: 'time_to_asset_open' },
      'NOVA_02'
    )
    if (source === 'home') track('home_action', 'personalized-home', { destination: 'NOVA_02' }, 'NOVA_02')
  }

  const openStation = (tab = 'Pump Health') => {
    setStationTab(tab)
    const source = route === 'personalized' ? 'home' : route === 'dashboard' ? 'dashboard' : null
    const started = personalization.events
      .filter(e => e.type === 'page_viewed' && e.pageId === (source === 'home' ? 'personalized-home' : 'dashboard'))
      .at(-1)
    if (source) recordAssetOpen(source, started ? Date.parse(started.at) : Date.now())
    track('asset_viewed', 'station-overview', undefined, 'NOVA_02')
    setStationSelected(true)
    setRoute('stations')
    setSelectedAlarm(null)
  }

  const openStationFromList = (_stationName?: string) => {
    setStationTab('Pump Health')
    if (taskEntry) recordAssetOpen(taskEntry.source, taskEntry.at)
    track('asset_viewed', 'station-overview', undefined, 'NOVA_02')
    setStationSelected(true)
    setTaskEntry(null)
  }

  const openStationTab = (tab: string) => {
    setStationTab(tab)
    track('asset_tab_viewed', tab.toLowerCase().replaceAll(' ', '-'), undefined, 'NOVA_02')
  }

  const changeNotificationFilters = (filters: NotificationFilters) => {
    const valid = validateNotificationFilters(filters)
    const event = createActivity('filter_applied', 'notifications', { ...valid })
    setPersonalization(prev => ({
      ...prev,
      lastNotificationFilters: valid,
      events: appendActivity(prev, event).events,
    }))
  }

  const saveNotificationView = (name: string, filters: NotificationFilters) => {
    const valid = validateNotificationFilters(filters)
    setPersonalization(prev => ({
      ...prev,
      lastNotificationFilters: valid,
      savedViews: [
        {
          id: `view-${Date.now()}`,
          pageId: 'notifications',
          name,
          filters: valid,
          updatedAt: new Date().toISOString(),
        },
        ...prev.savedViews,
      ],
    }))
    track('saved_view_created', 'notifications', { name })
    notify('Notification view saved for this demo user.')
  }

  const openNotificationView = (filters: NotificationFilters) => {
    const valid = validateNotificationFilters(filters)
    setPersonalization(prev => ({ ...prev, lastNotificationFilters: valid }))
    setRoute('notifications')
    setSelectedAlarm(null)
  }

  const setLandingDefault = (page: 'dashboard' | 'personalized') => {
    setPersonalization(prev => ({ ...prev, defaultLanding: page, landingPromptDismissed: true }))
    notify(`${page === 'personalized' ? 'Personalized Home' : 'Dashboard'} will open by default in this demo browser.`)
  }

  const onPersonalizationActivity = (
    type: ActivityEvent['type'],
    page: string,
    metadata?: Record<string, string | number | boolean>,
    assetId?: string
  ) => {
    if (type === 'suggestion_dismissed' && metadata?.suggestionId) {
      setPersonalization(prev => ({
        ...prev,
        dismissedSuggestions: [...new Set([...prev.dismissedSuggestions, String(metadata.suggestionId)])],
      }))
    }
    if (page === 'personalized-home' && ['suggestion_opened', 'saved_view_opened', 'shortcut_used'].includes(type)) {
      track('home_action', page, metadata, assetId)
    }
    track(type, page, metadata, assetId)
  }

  const readNotice = (ids: string[], read: boolean) => {
    const idSet = new Set(ids)
    setNotices(items => items.map(item => (idSet.has(item.id) ? { ...item, unread: !read } : item)))
    const lifecycleIds = new Set(
      notices
        .filter(item => idSet.has(item.id))
        .map(item => item.lifecycleId)
        .filter((id): id is string => !!id)
    )
    setAlarms(items => items.map(item => (lifecycleIds.has(item.id) ? { ...item, unread: !read } : item)))
  }

  const ackAlarm = (id: string) => {
    setAlarms(items => acknowledgeLifecycle(items, id, currentUser === 'venky' ? 'Venky Karuppanan' : 'Subashini K', new Date().toISOString()))
    notify('Alarm acknowledged. Lifecycle remains unresolved.')
  }

  const completeAlarm = (data: ManualCompletion) => {
    try {
      setAlarms(items =>
        manuallyCompleteLifecycle(items, {
          ...data,
          user: currentUser === 'venky' ? 'Venky Karuppanan' : 'Subashini K',
          at: new Date().toISOString(),
        })
      )
      notify('Lifecycle manually completed from reviewed telemetry evidence.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not complete lifecycle.')
    }
  }

  const toggleAlarmRead = (id: string) => {
    const current = alarms.find(a => a.id === id)
    if (!current) return
    const makeRead = current.unread
    setAlarms(items => items.map(a => (a.id === id ? { ...a, unread: !makeRead } : a)))
    setNotices(items => items.map(item => (item.lifecycleId === id ? { ...item, unread: !makeRead } : item)))
  }

  const toggleUser = () => {
    setCurrentUser(prev => (prev === 'venky' ? 'subashini' : 'venky'))
    notify(`Switched active user profile to ${currentUser === 'venky' ? 'Subashini K' : 'Venky Karuppanan'}`)
  }

  return (
    <div className="app-shell">
      {/* Sidebar navigation matching screenshots */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-logo-pill">
            A<span className="brand-logo-accent">IQ</span>
          </span>
          <div className="brand-vertical">
            LiftIQ <span className="brand-subtitle">3.0 · ASSETIQ</span>
          </div>
        </div>

        <nav aria-label="Main navigation" className="sidebar-nav">
          {nav.map(([id, icon, name]) => (
            <button
              key={id}
              className={`nav-link ${route === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
              aria-label={name}
              title={name}
              aria-current={route === id ? 'page' : undefined}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{name}</span>
              {id === 'alarms' && activeAlarmsCount > 0 && (
                <span className="nav-badge-pill">{activeAlarmsCount}</span>
              )}
              {id === 'notifications' && unreadNoticesCount > 0 && (
                <span className="nav-badge-pill bg-sky-600">{unreadNoticesCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <button
            className="nav-link cursor-pointer text-xs opacity-85"
            onClick={() => setPersonalization(structuredClone(DEFAULT_PERSONALIZATION))}
            title="Reset demo data"
          >
            <span className="nav-icon">⚙</span>
            <span className="nav-label">Reset demo</span>
          </button>
        </div>
      </aside>

      {/* Top Header matching Photo 1 & Photo 4 */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark">
            ASSETIQ
            <small>RUGGED TELEMETRY</small>
          </div>
          <div className="app-title-tag">
            <b>LiftIQ</b> <span className="version-tag">3.0</span>
          </div>
        </div>

        <div className="topbar-spacer" />

        <div className="topbar-actions">
          <span className="hide-mobile prototype-indicator">
            Local prototype · no live device connection
          </span>

          <NotificationBell previews={mapAlarmsToNotificationPreviews(alarms)} />

          {/* User profile with switcher */}
          <button
            className="topbar-user-btn"
            onClick={toggleUser}
            title="Click to toggle user (Venky / Subashini)"
          >
            <div className="user-details-text">
              <b>{currentUser === 'venky' ? 'Venky Karuppanan' : 'Subashini K'}</b>
              <small>{currentUser === 'venky' ? '(UTC+05:30) Calcutta' : '(UTC+05:30) Kolkata'}</small>
            </div>
            <div className="user-avatar-circle">
              {currentUser === 'venky' ? 'V' : 'S'}
            </div>
          </button>
        </div>
      </header>

      {/* Main content router */}
      <main className="main">
        <div className="page-wrap">
          {route === 'dashboard' && (
            <Dashboard
              alarms={alarms}
              onStations={openStation}
              onAlarms={() => navigate('alarms')}
              onNotifications={() => navigate('notifications')}
              onOpenAlarm={setSelectedAlarm}
            />
          )}

          {route === 'personalized' && (
            <PersonalizedHome
              state={personalization}
              alarms={alarms}
              onNavigate={page => {
                track('home_action', 'personalized-home', { destination: page })
                navigate(page as Route)
              }}
              onOpenStation={openStation}
              onOpenAlarm={id => {
                track('home_action', 'personalized-home', { destination: 'alarm' }, id)
                setSelectedAlarm(id)
              }}
              onPin={assetId => {
                const pinned = personalization.pinnedAssetIds.includes(assetId)
                setPersonalization(prev => ({
                  ...prev,
                  pinnedAssetIds: pinned
                    ? prev.pinnedAssetIds.filter(id => id !== assetId)
                    : [...prev.pinnedAssetIds, assetId],
                }))
                track(
                  'home_layout_changed',
                  'personalized-home',
                  { action: pinned ? 'asset_unpinned' : 'asset_pinned', assetId },
                  assetId
                )
              }}
              onOpenView={openNotificationView}
              onSaveView={saveNotificationView}
              onDeleteView={id =>
                setPersonalization(prev => ({
                  ...prev,
                  savedViews: prev.savedViews.filter(view => view.id !== id),
                }))
              }
              onMakeDefault={setLandingDefault}
              onDismissDefault={() => {
                track('suggestion_dismissed', 'personalized-home', { suggestionId: 'landing-default' })
                setPersonalization(prev => ({ ...prev, landingPromptDismissed: true }))
              }}
              onReset={() => setPersonalization(structuredClone(DEFAULT_PERSONALIZATION))}
              onReorder={order => setPersonalization(prev => ({ ...prev, sectionOrder: order }))}
              onActivity={onPersonalizationActivity}
            />
          )}

          {route === 'stations' && (
            stationSelected ? (
              <StationPage
                selected={true}
                onSelect={() => {}}
                onBack={() => setStationSelected(false)}
                alarms={alarms}
                onOpenAlarm={setSelectedAlarm}
                onToast={notify}
                onTabView={openStationTab}
                initialTab={stationTab}
                onManualComplete={completeAlarm}
              />
            ) : (
              <StationsListPage
                onSelectStation={name => openStationFromList(name)}
                onToast={notify}
              />
            )
          )}

          {route === 'alarms' && (
            <AlarmPage
              scope="global"
              alarms={alarms}
              onStationNavigate={openStation}
              onManualComplete={completeAlarm}
            />
          )}

          {route === 'notifications' && (
            <NotificationsPage
              items={notices}
              preferences={preferences}
              onPreferences={setPreferences}
              onRead={readNotice}
              onOpenAlarm={setSelectedAlarm}
              onToast={notify}
              alarms={alarms}
              muteRules={muteRules}
              onAddMute={rule => setMuteRules(prev => [rule, ...prev])}
              onRemoveMute={id => setMuteRules(prev => prev.filter(rule => rule.id !== id))}
              initialFilters={personalization.lastNotificationFilters}
              onFiltersChange={changeNotificationFilters}
              onSaveView={saveNotificationView}
            />
          )}

          {route === 'reports' && (
            <EventsHistoryPage
              alarms={alarms}
              onOpenAlarms={() => navigate('alarms')}
              onToast={notify}
            />
          )}
        </div>
      </main>

      {/* Global Alarm Lifecycle Drawer if open from Home or Dashboard */}
      {route !== 'alarms' && !stationSelected && alarm && (
        <AlarmDrawer
          key={alarm.id}
          alarm={alarm}
          onClose={() => setSelectedAlarm(null)}
          onAcknowledge={() => ackAlarm(alarm.id)}
          onManualComplete={completeAlarm}
          onToggleRead={() => toggleAlarmRead(alarm.id)}
          onStationNavigate={tab => openStation(tab)}
        />
      )}

      {/* Floating feedback toast */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  )
}
