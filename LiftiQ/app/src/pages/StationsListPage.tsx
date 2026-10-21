import { useEffect, useMemo, useState } from 'react'
import { ACCTS, allStations, GRPS, ORGS } from '../data/mockData'
import type { StationRecord } from '../data/mockData'

interface CustomTab {
  id: string
  name: string
  system: boolean
  filters: Record<string, string[]>
}

const initialCustomTabs: CustomTab[] = [
  { id: 'all', name: 'All Lift Stations', system: true, filters: {} },
  { id: 'faults', name: 'Pump Faults', system: true, filters: { pump: ['p_fault'] } },
  { id: 'maint', name: 'Maintenance Due', system: true, filters: { maint: ['overdue', 'soon'] } },
  { id: 'custom', name: 'Custom View', system: false, filters: { mode: ['hand', 'off'] } },
]

interface FilterCategory {
  id: string
  label: string
  opts: Array<{
    id: string
    label: string
    short: string
    test: (s: StationRecord) => boolean
  }>
}

const filterCategories: FilterCategory[] = [
  {
    id: 'alarms',
    label: 'Alarms',
    opts: [
      { id: 'alm_with', label: 'Lift Stations with Alarms', short: 'With alarms', test: s => s.al > 0 },
      { id: 'alm_without', label: 'Lift Stations without Alarms', short: 'Without alarms', test: s => s.al === 0 },
    ],
  },
  {
    id: 'pump',
    label: 'Pump Status',
    opts: [
      { id: 'p1_on', label: 'Pump 1 ON', short: 'Pump 1 ON', test: s => s.p[0]?.run === 'on' },
      { id: 'p1_off', label: 'Pump 1 OFF', short: 'Pump 1 OFF', test: s => s.p[0]?.run === 'off' },
      { id: 'p2_on', label: 'Pump 2 ON', short: 'Pump 2 ON', test: s => s.p[1]?.run === 'on' },
      { id: 'p2_off', label: 'Pump 2 OFF', short: 'Pump 2 OFF', test: s => s.p[1]?.run === 'off' },
      { id: 'p3_on', label: 'Pump 3 ON', short: 'Pump 3 ON', test: s => s.p[2]?.run === 'on' },
      { id: 'p3_off', label: 'Pump 3 OFF', short: 'Pump 3 OFF', test: s => s.p[2]?.run === 'off' },
      { id: 'p_fault', label: 'Pump Fault (any pump)', short: 'Pump fault', test: s => s.p.some(p => p?.run === 'fault') },
    ],
  },
  {
    id: 'mode',
    label: 'Pump Mode',
    opts: [
      { id: 'auto', label: 'Auto', short: 'Auto', test: s => s.p.some(p => p?.mode === 'A') },
      { id: 'hand', label: 'Hand (Manual)', short: 'Hand', test: s => s.p.some(p => p?.mode === 'H') },
      { id: 'off', label: 'Off', short: 'Off', test: s => s.p.some(p => p?.mode === 'O') },
    ],
  },
  {
    id: 'maint',
    label: 'Maintenance Due',
    opts: [
      { id: 'overdue', label: 'Overdue', short: 'Overdue', test: s => s.p.some(p => p?.maint === 'overdue') },
      { id: 'soon', label: 'Due Soon', short: 'Due soon', test: s => s.p.some(p => p?.maint === 'soon') },
      { id: 'notdue', label: 'Not Due', short: 'Not due', test: s => s.p.length > 0 && s.p.every(p => p?.maint === 'ok') },
    ],
  },
  {
    id: 'alt',
    label: 'Alternating Pumps',
    opts: [
      { id: 'alt_on', label: 'Enabled', short: 'Enabled', test: s => s.alt === true },
      { id: 'alt_off', label: 'Disabled', short: 'Disabled', test: s => s.alt === false },
    ],
  },
]

export function StationsListPage({
  onSelectStation,
  onWatchAssets,
  onToast,
}: {
  onSelectStation: (name: string) => void
  onWatchAssets: (assetIds: string[]) => void
  onToast: (msg: string) => void
}) {
  const [tabsList, setTabsList] = useState<CustomTab[]>(initialCustomTabs)
  const [activeTabId, setActiveTabId] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<string>('All Organizations')
  const [selectedAcct, setSelectedAcct] = useState<string>('All Accounts')
  const [selectedGrp, setSelectedGrp] = useState<string>('All Asset Groups')

  // Drawer & Filter state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCatId, setSelectedCatId] = useState('alarms')
  const [catSearch, setCatSearch] = useState('')
  const [draftFilters, setDraftFilters] = useState<Record<string, string[]>>({})
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string[]>>({})

  // Modal state
  const [modalType, setModalType] = useState<'create' | 'rename' | 'delete' | null>(null)
  const [modalTabId, setModalTabId] = useState<string>('')
  const [tabNameInput, setTabNameInput] = useState('')
  const [tabMenuOpen, setTabMenuOpen] = useState<string | null>(null)

  // Selection state
  const [selectedStations, setSelectedStations] = useState<string[]>([])
  const [mapSelectedStation, setMapSelectedStation] = useState<string | null>(null)

  // Open filter drawer
  const openFilterDrawer = () => {
    setDraftFilters(structuredClone(appliedFilters))
    setDrawerOpen(true)
  }

  // Toggle filter option
  const toggleFilterOption = (catId: string, optId: string) => {
    setDraftFilters(prev => {
      const current = prev[catId] || []
      const next = current.includes(optId) ? current.filter(x => x !== optId) : [...current, optId]
      return { ...prev, [catId]: next }
    })
  }

  const applyDraftFilters = () => {
    setAppliedFilters(structuredClone(draftFilters))
    setDrawerOpen(false)
    onToast('Filters applied to list.')
  }

  const resetFilters = () => {
    setDraftFilters({})
    setAppliedFilters({})
    onToast('Filters reset.')
  }

  const currentTab = tabsList.find(t => t.id === activeTabId) || tabsList[0]

  // Count active filter chips
  const totalAppliedFilterCount = Object.values(appliedFilters).reduce((sum, arr) => sum + arr.length, 0)

  // Filter stations logic
  const matchesFilters = (s: StationRecord, f: Record<string, string[]>) => {
    for (const [catId, optIds] of Object.entries(f)) {
      if (!optIds.length) continue
      const cat = filterCategories.find(c => c.id === catId)
      if (!cat) continue
      const matchAnyInCat = optIds.some(id => {
        const opt = cat.opts.find(o => o.id === id)
        return opt ? opt.test(s) : false
      })
      if (!matchAnyInCat) return false
    }
    return true
  }

  const filteredStations = useMemo(() => {
    return allStations.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!s.n.toLowerCase().includes(q) && !s.rs.toLowerCase().includes(q)) return false
      }
      if (selectedOrg !== 'All Organizations') {
        const orgIdx = ORGS.indexOf(selectedOrg)
        if (orgIdx > 0 && s.org !== orgIdx - 1) return false
      }
      if (selectedAcct !== 'All Accounts') {
        const acctIdx = ACCTS.indexOf(selectedAcct)
        if (acctIdx > 0 && s.acct !== acctIdx - 1) return false
      }
      if (selectedGrp !== 'All Asset Groups') {
        const grpIdx = GRPS.indexOf(selectedGrp)
        if (grpIdx > 0 && s.grp !== grpIdx - 1) return false
      }
      // Combine Tab filters + applied filters
      const effectiveFilters: Record<string, string[]> = { ...currentTab.filters }
      for (const [catId, ids] of Object.entries(appliedFilters)) {
        effectiveFilters[catId] = [...new Set([...(effectiveFilters[catId] || []), ...ids])]
      }
      return matchesFilters(s, effectiveFilters)
    })
  }, [currentTab, appliedFilters, searchQuery, selectedOrg, selectedAcct, selectedGrp])

  useEffect(() => {
    if (mapSelectedStation && !filteredStations.some(station => station.n === mapSelectedStation)) {
      setMapSelectedStation(null)
    }
  }, [filteredStations, mapSelectedStation])

  const mapFocus = filteredStations.find(station => station.n === mapSelectedStation)
  const mapFocusIndex = mapFocus ? filteredStations.indexOf(mapFocus) : -1
  const mapZoom = 1.8
  const mapFocusX = mapFocusIndex >= 0 ? 8 + (mapFocusIndex % 6) * 15 + ((mapFocusIndex * 7) % 5) : 50
  const mapFocusY = mapFocusIndex >= 0 ? 12 + Math.floor(mapFocusIndex / 6) * 22 + ((mapFocusIndex * 3) % 7) : 50
  const mapTransform = mapFocus
    ? `translate(${50 - mapZoom * mapFocusX}%, ${50 - mapZoom * mapFocusY}%) scale(${mapZoom})`
    : 'translate(0%, 0%) scale(1)'

  // Count for tab
  const getCountForTab = (t: CustomTab) => {
    return allStations.filter(s => matchesFilters(s, t.filters)).length
  }

  // Create new tab
  const handleSaveTab = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tabNameInput.trim()) return

    if (modalType === 'create') {
      const newId = `tab-${Date.now()}`
      const newTab: CustomTab = {
        id: newId,
        name: tabNameInput.trim(),
        system: false,
        filters: structuredClone(draftFilters),
      }
      setTabsList(prev => [...prev, newTab])
      setActiveTabId(newId)
      setAppliedFilters(structuredClone(draftFilters))
      setDrawerOpen(false)
      onToast(`Custom tab "${newTab.name}" created.`)
    } else if (modalType === 'rename') {
      setTabsList(prev => prev.map(t => t.id === modalTabId ? { ...t, name: tabNameInput.trim() } : t))
      onToast(`Tab renamed to "${tabNameInput.trim()}".`)
    }
    setModalType(null)
    setTabNameInput('')
  }

  const handleDeleteTab = () => {
    setTabsList(prev => prev.filter(t => t.id !== modalTabId))
    if (activeTabId === modalTabId) setActiveTabId('all')
    setModalType(null)
    onToast('Tab deleted.')
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedStations(filteredStations.map(s => s.n))
    else setSelectedStations([])
  }

  return (
    <div className="stations-custom-tabs-container">
      {/* Title Row */}
      <div className="stations-title-row">
        <div className="flex-center-gap">
          <h1 className="stations-page-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue">
              <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
            </svg>
            Lift Stations
          </h1>
          <span className="station-alarm-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            1 Lift station with alarms
          </span>
        </div>

        <div className="stations-title-controls">
          <select className="control-select-pill">
            <option>Standard View</option>
            <option>Operations View</option>
            <option>Maintenance View</option>
          </select>

          <button className="control-btn-outline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="5" width="16" height="14" rx="1" />
              <line x1="10" y1="5" x2="10" y2="19" />
              <line x1="15" y1="5" x2="15" y2="19" />
            </svg>
            Columns ▼
          </button>

          {/* Segmented View Mode Toggle */}
          <div className="segmented-toggle-group">
            <button
              className={`seg-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              List View
            </button>
            <button
              className={`seg-toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              Map View
            </button>
          </div>
        </div>
      </div>

      {/* Source Filters & Toolbar Row */}
      <div className="stations-toolbar-row">
        <div className="source-dropdowns-group">
          <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)} className="alarm-select">
            {ORGS.map(o => <option key={o}>{o}</option>)}
          </select>
          <select value={selectedAcct} onChange={e => setSelectedAcct(e.target.value)} className="alarm-select">
            {ACCTS.map(a => <option key={a}>{a}</option>)}
          </select>
          <select value={selectedGrp} onChange={e => setSelectedGrp(e.target.value)} className="alarm-select">
            {GRPS.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>

        <div className="toolbar-right-group">
          {selectedStations.length > 0 && <button className="btn primary" onClick={() => onWatchAssets(selectedStations)}>◷ Watch {selectedStations.length} selected</button>}
          <span className="total-stations-badge">
            Total Lift Stations: {filteredStations.length}
          </span>

          <div className="alarm-search-wrap" style={{ width: '220px' }}>
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="alarm-search-input"
            />
          </div>

          <button className="square-tool-btn" onClick={() => onToast('Station records refreshed.')} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>

          <button className="square-tool-btn" onClick={() => onToast('Exporting station records CSV...')} title="Download">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          <button className="square-tool-btn relative" onClick={openFilterDrawer} title="Filters">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {totalAppliedFilterCount > 0 && (
              <span className="filter-badge-dot">{totalAppliedFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Custom Tabs Navigation Row */}
      <div className="custom-tabs-row">
        <div className="custom-tabs-scrollable">
          {tabsList.map(t => {
            const isTabActive = activeTabId === t.id
            const count = getCountForTab(t)
            return (
              <div key={t.id} className={`custom-tab-item ${isTabActive ? 'active' : ''}`}>
                <button
                  className="tab-text-btn"
                  onClick={() => {
                    setActiveTabId(t.id)
                    setAppliedFilters({})
                  }}
                >
                  {t.name} <span className="tab-count-num">({count})</span>
                </button>

                {!t.system && (
                  <div className="relative inline-block">
                    <button
                      className="tab-dots-menu-btn"
                      onClick={e => {
                        e.stopPropagation()
                        setTabMenuOpen(tabMenuOpen === t.id ? null : t.id)
                      }}
                    >
                      •••
                    </button>
                    {tabMenuOpen === t.id && (
                      <div className="tab-dropdown-popover">
                        <button
                          onClick={() => {
                            setModalTabId(t.id)
                            setTabNameInput(t.name)
                            setModalType('rename')
                            setTabMenuOpen(null)
                          }}
                        >
                          ✎ Rename Tab
                        </button>
                        <button
                          className="text-red"
                          onClick={() => {
                            setModalTabId(t.id)
                            setModalType('delete')
                            setTabMenuOpen(null)
                          }}
                        >
                          🗑 Delete Tab
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add Tab Button */}
        <button
          className="btn-add-custom-tab"
          onClick={() => {
            setDraftFilters({})
            setDrawerOpen(true)
          }}
          title="Create a tab from filters"
        >
          +
        </button>
      </div>

      {/* Active Filter Chips Summary */}
      {totalAppliedFilterCount > 0 && (
        <div className="filter-summary-chips-bar">
          <span className="text-muted text-xs mr-2">Filters:</span>
          {Object.entries(appliedFilters).map(([catId, optIds]) => {
            const cat = filterCategories.find(c => c.id === catId)
            if (!cat || !optIds.length) return null
            const labelStr = optIds.map(id => cat.opts.find(o => o.id === id)?.short || id).join(' or ')
            return (
              <span key={catId} className="applied-chip-item">
                <strong>{cat.label}:</strong> {labelStr}
                <button
                  onClick={() => {
                    setAppliedFilters(prev => {
                      const next = { ...prev }
                      delete next[catId]
                      return next
                    })
                  }}
                >
                  ✕
                </button>
              </span>
            )
          })}
          <button className="link-btn-clear ml-3" onClick={resetFilters}>Clear all</button>
        </div>
      )}

      {/* Main View: List View or Map View */}
      {viewMode === 'list' ? (
        <div className="stations-table-scroll-wrap">
          <table className="stations-full-grid">
            <thead>
              <tr>
                <th style={{ width: '40px' }} className="text-center">
                  <input
                    type="checkbox"
                    checked={selectedStations.length > 0 && selectedStations.length === filteredStations.length}
                    onChange={e => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th style={{ minWidth: '190px' }}>Lift Station Name</th>
                <th style={{ minWidth: '160px' }}>Last Event Time</th>
                <th>Reason Code</th>
                <th>Level 1 (in)</th>
                <th>Alarms</th>
                <th>P1 Status</th>
                <th>P2 Status</th>
                <th>P3 Status</th>
                <th>P1 Current (A)</th>
                <th>P1 Run Hours</th>
                <th>P2 Current (A)</th>
                <th>P2 Run Hours</th>
                <th>P3 Current (A)</th>
                <th>P3 Run Hours</th>
                <th>Alternating</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map(s => {
                const isChecked = selectedStations.includes(s.n)
                return (
                  <tr key={s.n} className={isChecked ? 'row-checked-blue' : ''}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) setSelectedStations(p => [...p, s.n])
                          else setSelectedStations(p => p.filter(x => x !== s.n))
                        }}
                      />
                    </td>
                    <td>
                      <div className="station-name-cell">
                        <button className="station-name-link" onClick={() => onSelectStation(s.n)}>
                          {s.n}
                        </button>
                        <div className="flex-center-gap">
                          {s.flag && <span className="red-flag-indicator" title="Needs attention" />}
                          <span className="text-blue text-xs" title="View station">👁</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex-center-gap">
                        <span className={`signal-dot-indicator ${s.t ? 'signal-online' : ''}`}>📶</span>
                        {s.t ? s.t.replace('T', ' ') : '-'}
                      </div>
                    </td>
                    <td><span className="rc-tag">{s.rs}</span></td>
                    <td className="font-semibold">{s.lv !== null ? s.lv.toFixed(2) : '-'}</td>
                    <td>
                      <span className={`alarm-count-badge ${s.al > 0 ? 'text-red font-bold' : ''}`}>
                        [{s.al}]
                      </span>
                      {s.dots && <span className="text-red ml-1">●</span>}
                    </td>

                    {/* P1, P2, P3 status circles */}
                    {[0, 1, 2].map(pIdx => {
                      const p = s.p[pIdx]
                      if (!p) {
                        return <td key={pIdx} className="text-muted text-center">-</td>
                      }
                      return (
                        <td key={pIdx}>
                          <div className="pump-mini-status-group">
                            <span className={`mini-circle mode-${p.mode?.toLowerCase()}`}>{p.mode || '-'}</span>
                            <span className={`mini-circle maint-${p.maint}`}>🔧</span>
                            <span className={`mini-circle run-${p.run}`}>⏻</span>
                          </div>
                        </td>
                      )
                    })}

                    <td>{s.cur[0] !== null ? s.cur[0] : '-'}</td>
                    <td>{s.hrs[0] !== null ? s.hrs[0] : '-'}</td>
                    <td>{s.cur[1] !== null ? s.cur[1] : '-'}</td>
                    <td>{s.hrs[1] !== null ? s.hrs[1] : '-'}</td>
                    <td>{s.cur[2] !== null ? s.cur[2] : '-'}</td>
                    <td>{s.hrs[2] !== null ? s.hrs[2] : '-'}</td>
                    <td>{s.alt === true ? 'Enabled' : s.alt === false ? 'Disabled' : '-'}</td>
                    <td className="text-center">
                      <button className="row-dots-btn">•••</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Schematic Map View */
        <div className="stations-map-layout">
          <div className="stations-map-schematic-view">
            <div className="map-viewport">
              <div className="map-grid-canvas" style={{ transform: mapTransform }}>
                {filteredStations.map((s, idx) => {
                  const xPos = 8 + (idx % 6) * 15 + ((idx * 7) % 5)
                  const yPos = 12 + Math.floor(idx / 6) * 22 + ((idx * 3) % 7)
                  const hasAlarm = s.al > 0
                  const hasFault = s.p.some(p => p?.run === 'fault' || p?.maint === 'overdue')
                  const isFocused = mapSelectedStation === s.n

                  return (
                    <button
                      key={s.n}
                      type="button"
                      className={`map-station-pin ${hasAlarm ? 'pin-alarm' : hasFault ? 'pin-fault' : 'pin-normal'} ${isFocused ? 'pin-selected' : ''}`}
                      style={{ left: `${xPos}%`, top: `${yPos}%` }}
                      onClick={() => setMapSelectedStation(s.n)}
                      aria-label={`Focus map on ${s.n}`}
                      aria-pressed={isFocused}
                      title={`${s.n}: ${s.rs} (${hasAlarm ? 'Active alarm' : hasFault ? 'Pump fault or maintenance' : 'Normal'})`}
                    >
                      <span className="pin-pulse" />
                      <span className="pin-label">{s.n}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="map-legend-box">
              <span className="legend-item"><span className="legend-circle dot-blue" /> Normal</span>
              <span className="legend-item"><span className="legend-circle dot-red" /> Active Alarm</span>
              <span className="legend-item"><span className="legend-circle dot-amber" /> Pump Fault / Maintenance</span>
            </div>
          </div>

          <aside className="map-assets-panel" aria-label="Map assets">
            <div className="map-assets-header">
              <div>
                <h2>Assets</h2>
                <span>{filteredStations.length} stations in this view</span>
              </div>
              {mapFocus && <button type="button" className="map-reset-focus" onClick={() => setMapSelectedStation(null)}>Show all</button>}
            </div>

            {mapFocus && (
              <div className="map-focused-asset">
                <span className="map-focused-label">Focused station</span>
                <strong>{mapFocus.n}</strong>
                <span className="text-muted">{mapFocus.rs}</span>
                <button type="button" className="map-open-station" onClick={() => onSelectStation(mapFocus.n)}>Open station details <span aria-hidden="true">→</span></button>
              </div>
            )}

            <div className="map-assets-list">
              {filteredStations.map(s => {
                const hasAlarm = s.al > 0
                const hasFault = s.p.some(p => p?.run === 'fault' || p?.maint === 'overdue')
                const isFocused = mapSelectedStation === s.n
                const status = hasAlarm ? 'Active alarm' : hasFault ? 'Pump fault / maintenance' : 'Normal'
                return (
                  <button
                    type="button"
                    key={s.n}
                    className={`map-asset-row ${isFocused ? 'active' : ''}`}
                    onClick={() => setMapSelectedStation(s.n)}
                    aria-pressed={isFocused}
                  >
                    <span className={`map-asset-status ${hasAlarm ? 'alarm' : hasFault ? 'fault' : ''}`} />
                    <span className="map-asset-copy">
                      <strong>{s.n}</strong>
                      <span>{status}</span>
                    </span>
                    <span className="map-asset-zoom" aria-hidden="true">⌕</span>
                  </button>
                )
              })}
              {filteredStations.length === 0 && <div className="map-assets-empty">No stations match the current filters.</div>}
            </div>
          </aside>
        </div>
      )}

      {/* Slide-out Filters Drawer (Right) */}
      {drawerOpen && (
        <div className="drawer-overlay-scrim" onClick={() => setDrawerOpen(false)}>
          <aside className="filters-slide-drawer" onClick={e => e.stopPropagation()}>
            <div className="filters-drawer-header">
              <div>
                <h2 className="drawer-title flex-center-gap">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-blue">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Filters
                </h2>
                <p className="text-muted text-xs">Apply filters to the report to get specific results</p>
              </div>
              <button className="btn-close-drawer" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>

            <div className="filters-drawer-body">
              {/* Category Nav Left */}
              <div className="filters-category-nav">
                {filterCategories.map(cat => {
                  const count = (draftFilters[cat.id] || []).length
                  return (
                    <button
                      key={cat.id}
                      className={`filter-cat-btn ${selectedCatId === cat.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedCatId(cat.id)
                        setCatSearch('')
                      }}
                    >
                      <span>{cat.label}</span>
                      {count > 0 && <span className="cat-count-badge">{count}</span>}
                    </button>
                  )
                })}
              </div>

              {/* Options Panel Right */}
              <div className="filters-options-panel">
                {(() => {
                  const currentCategory = filterCategories.find(c => c.id === selectedCatId) || filterCategories[0]
                  const options = currentCategory.opts.filter(o => !catSearch || o.label.toLowerCase().includes(catSearch.toLowerCase()))

                  return (
                    <>
                      <div className="options-panel-header">
                        <strong>{currentCategory.label}</strong>
                        <span className="text-muted text-xs">{currentCategory.opts.length} available</span>
                      </div>

                      <div className="alarm-search-wrap mb-3 w-full">
                        <input
                          type="search"
                          placeholder="Search options..."
                          value={catSearch}
                          onChange={e => setCatSearch(e.target.value)}
                          className="alarm-search-input"
                        />
                      </div>

                      <div className="options-checkbox-list">
                        {options.map(opt => {
                          const isChecked = (draftFilters[selectedCatId] || []).includes(opt.id)
                          return (
                            <label key={opt.id} className="option-checkbox-row">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleFilterOption(selectedCatId, opt.id)}
                              />
                              <span>{opt.label}</span>
                            </label>
                          )
                        })}
                      </div>

                      {/* Selected Chips */}
                      <div className="filters-drawer-footer">
                        <div className="text-xs text-muted mb-1">Selected conditions:</div>
                        <div className="selected-chips-scroll">
                          {Object.entries(draftFilters).flatMap(([catId, optIds]) => {
                            const cat = filterCategories.find(c => c.id === catId)
                            return optIds.map(optId => {
                              const opt = cat?.opts.find(o => o.id === optId)
                              return (
                                <span key={optId} className="filter-chip-removeable">
                                  {opt?.short || optId}
                                  <button onClick={() => toggleFilterOption(catId, optId)}>✕</button>
                                </span>
                              )
                            })
                          })}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button className="btn-cancel-white flex-1" onClick={() => setDraftFilters({})}>
                            Reset
                          </button>
                          <button className="btn-open-blue flex-1" onClick={applyDraftFilters}>
                            Apply
                          </button>
                        </div>

                        {/* Create Tab Button */}
                        <button
                          className="btn-create-tab-wide mt-3"
                          onClick={() => {
                            setModalType('create')
                            setTabNameInput('')
                          }}
                        >
                          + Create Tab
                        </button>
                        <p className="text-center text-muted text-xs mt-1">Saves the selected conditions as a reusable tab.</p>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Modal: Create Tab or Rename Tab */}
      {(modalType === 'create' || modalType === 'rename') && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-window max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalType === 'create' ? 'Create Tab' : 'Rename Tab'}</h2>
              <button className="btn-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveTab}>
              <div className="modal-body">
                <p className="text-muted text-xs mb-3">
                  {modalType === 'create'
                    ? 'Name this view. The conditions you selected in the filters drawer are saved with it.'
                    : 'Choose a new name. The saved conditions stay the same.'}
                </p>

                <label className="field-group-label mb-1">Tab Name</label>
                <input
                  type="text"
                  maxLength={30}
                  className="completion-input w-full"
                  placeholder="e.g. Night shift checks"
                  value={tabNameInput}
                  onChange={e => setTabNameInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel-white" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn-open-blue" disabled={!tabNameInput.trim()}>Save Tab</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Tab */}
      {modalType === 'delete' && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-window max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete tab?</h2>
              <button className="btn-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <div className="modal-body text-sm">
              Are you sure you want to delete this custom tab? Your lift stations and filters are not affected.
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-white" onClick={() => setModalType(null)}>Cancel</button>
              <button className="btn-danger-solid" onClick={handleDeleteTab}>Delete Tab</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

