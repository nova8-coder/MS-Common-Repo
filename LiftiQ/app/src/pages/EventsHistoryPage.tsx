import { useMemo, useState } from 'react'
import { pumpMaintenanceData, pumps, rawMessages, station, totalizerReadings } from '../data/mockData'
import type { MaintenanceEvent } from '../data/mockData'
import type { AlarmLifecycle } from '../data/model'
import { Empty, PageTitle } from '../components/UI'

type EventsHistoryView = 'overview' | 'operational' | 'measurements' | 'communication' | 'maintenance'
type MeasurementType = 'Wet Well Level' | 'Pump Current' | 'Pump Run Hours' | 'Totalizer'
type TableColumn = { key: string; label: string }
type RecordRow = {
  id: string
  station: string
  equipment: string
  category: string
  status: string
  occurredAt: string
  summary: string
  source: string
  values: Record<string, string>
}

const nav: { id: EventsHistoryView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'operational', label: 'Operational History' },
  { id: 'measurements', label: 'Measurements & Trends' },
  { id: 'communication', label: 'Device & Communication' },
  { id: 'maintenance', label: 'Maintenance' },
]
const measurementColumns: TableColumn[] = [
  { key: 'time', label: 'Reading Time' }, { key: 'station', label: 'Lift Station' },
  { key: 'equipment', label: 'Equipment' }, { key: 'measurement', label: 'Measurement' },
  { key: 'value', label: 'Value' }, { key: 'source', label: 'Source' },
]
const communicationColumns: TableColumn[] = [
  { key: 'time', label: 'Message Time' }, { key: 'station', label: 'Lift Station' },
  { key: 'source', label: 'Source Label' }, { key: 'message', label: 'Available Fields' },
]
const maintenanceColumns: TableColumn[] = [
  { key: 'station', label: 'Lift Station' }, { key: 'equipment', label: 'Pump / Equipment' },
  { key: 'event', label: 'Maintenance Type' },
  { key: 'due', label: 'Due Date' }, { key: 'completed', label: 'Maintained Date' },
  { key: 'status', label: 'Status' }, { key: 'difference', label: 'Schedule / Variance' },
]

const dateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
const dateOnly = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}
const daysUntil = (date: string) => Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86400000)
function maintenanceStatus(item: MaintenanceEvent) {
  if (item.maintained) return 'Completed'
  const days = daysUntil(item.scheduled)
  if (days < 0) return 'Overdue'
  if (days <= 7) return 'Due soon'
  if (days > 180) return 'Future'
  return 'Upcoming'
}
function maintenanceDifference(item: MaintenanceEvent) {
  if (item.maintained) return item.difference
  const days = daysUntil(item.scheduled)
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Due today'
  if (days <= 7) return `Due in ${days} days`
  return 'Scheduled'
}
const makeRow = (row: RecordRow, columns: TableColumn[]) => columns.map(column => row.values[column.key] || '')
function downloadCsv(filename: string, columns: TableColumn[], rows: RecordRow[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const csv = [columns.map(column => quote(column.label)).join(','), ...rows.map(row => makeRow(row, columns).map(quote).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function EventsHistoryPage({ alarms, onOpenAlarms, onToast }: {
  alarms: AlarmLifecycle[]
  onOpenAlarms: () => void
  onToast: (message: string) => void
}) {
  const [view, setView] = useState<EventsHistoryView>('overview')
  const [measurement, setMeasurement] = useState<MeasurementType>('Wet Well Level')
  const [stationFilter, setStationFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [range, setRange] = useState('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<RecordRow | null>(null)

  const measurementRows = useMemo<RecordRow[]>(() => {
    const rows: RecordRow[] = []
    rawMessages.forEach((message, index) => {
      const time = dateTime(message.t)
      rows.push({
        id: `level-${index}`, station: station.id, equipment: 'Wet Well', category: 'Wet Well Level',
        status: 'Recorded', occurredAt: message.t, summary: `Wet well level: ${message.lv.toFixed(2)} in.`,
        source: message.rs,
        values: { time, station: station.id, equipment: 'Wet Well', measurement: 'Wet Well Level', value: `${message.lv.toFixed(2)} in`, source: message.rs },
      })
      ;([message.p1, message.p2, message.p3] as const).forEach((pump, pumpIndex) => {
        const pumpName = `Pump ${pumpIndex + 1}`
        rows.push({
          id: `current-${pumpIndex}-${index}`, station: station.id, equipment: pumpName, category: 'Pump Current',
          status: 'Recorded', occurredAt: message.t, summary: `${pumpName} current: ${pump.a} A.`, source: message.rs,
          values: { time, station: station.id, equipment: pumpName, measurement: 'Pump Current', value: `${pump.a} A`, source: message.rs },
        })
        rows.push({
          id: `run-hours-${pumpIndex}-${index}`, station: station.id, equipment: pumpName, category: 'Pump Run Hours',
          status: 'Recorded', occurredAt: message.t, summary: `${pumpName} run-hour counter: ${pump.h} hrs.`, source: message.rs,
          values: { time, station: station.id, equipment: pumpName, measurement: 'Pump Run Hours', value: `${pump.h} hrs`, source: message.rs },
        })
      })
    })
    totalizerReadings.forEach((reading, index) => {
      const at = `2026-10-${String(reading.day).padStart(2, '0')}T12:00:00`
      rows.push({
        id: `totalizer-${index}`, station: station.id, equipment: 'Station Totalizer', category: 'Totalizer',
        status: 'Recorded', occurredAt: at, summary: `Total outlet sample: ${reading.gallons.toLocaleString()} gal.`,
        source: 'Station Totalizer sample',
        values: { time: dateTime(at), station: station.id, equipment: 'Station Totalizer', measurement: 'Total Liquid Outlet', value: `${reading.gallons.toLocaleString()} gal`, source: 'Station Totalizer sample' },
      })
    })
    return rows
  }, [])

  const maintenanceRows = useMemo<RecordRow[]>(() => Object.entries(pumpMaintenanceData).flatMap(([pumpIndex, entries]) => {
    const pump = pumps[Number(pumpIndex)]
    return entries.map((item, index) => {
      const status = maintenanceStatus(item)
      return {
        id: `maintenance-${pumpIndex}-${index}`, station: station.id, equipment: pump?.name || 'Not supplied',
        category: item.type, status, occurredAt: item.scheduled, summary: item.notes,
        source: 'Maintenance schedule sample in local prototype data.',
        values: {
          station: station.id, equipment: pump?.name || 'Not supplied',
          event: item.type, due: dateOnly(item.scheduled), completed: item.maintained ? dateOnly(item.maintained) : '—',
          status, difference: maintenanceDifference(item), notes: item.notes,
        },
      }
    })
  }), [])

  const communicationRows = useMemo<RecordRow[]>(() => rawMessages.map((message, index) => ({
    id: `message-${index}`, station: station.id, equipment: 'Station controller', category: message.rs,
    status: 'Received sample', occurredAt: message.t, summary: `Status message sample received. Level and pump-current fields are available.`,
    source: message.rs,
    values: {
      time: dateTime(message.t), station: station.id, source: message.rs,
      message: 'Wet well level; Pump 1, 2, and 3 current',
    },
  })), [])

  const availableMeasurements: MeasurementType[] = ['Wet Well Level', 'Pump Current', 'Pump Run Hours', 'Totalizer']
  const baseRows = view === 'measurements'
    ? measurementRows.filter(row => row.category === measurement)
    : view === 'maintenance' ? maintenanceRows
      : view === 'communication' ? communicationRows : []
  let filteredRows = baseRows
  if (stationFilter) filteredRows = filteredRows.filter(row => row.station === stationFilter)
  if (equipmentFilter) filteredRows = filteredRows.filter(row => row.equipment === equipmentFilter)
  if (statusFilter) filteredRows = filteredRows.filter(row => row.status === statusFilter)
  if (range !== 'all') filteredRows = filteredRows.filter(row => {
    const timestamp = Date.parse(row.occurredAt)
    const windowMs = Number(range) * 86400000
    return view === 'maintenance'
      ? timestamp >= Date.now() - windowMs && timestamp <= Date.now() + windowMs
      : timestamp >= Date.now() - windowMs
  })
  if (search.trim()) {
    const query = search.trim().toLowerCase()
    filteredRows = filteredRows.filter(row => `${row.station} ${row.equipment} ${row.category} ${row.summary} ${Object.values(row.values).join(' ')}`.toLowerCase().includes(query))
  }
  filteredRows = [...filteredRows].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const equipmentOptions = [...new Set(baseRows.map(row => row.equipment))]
  const statusOptions = [...new Set(baseRows.map(row => row.status))]
  const activeAlarmCount = alarms.filter(alarm => alarm.status !== 'Completed').length
  const dueMaintenanceCount = maintenanceRows.filter(row => ['Due soon', 'Overdue'].includes(row.status)).length
  const confirmedOperationalEvents = 0 // No prior/current state pairs or configuration snapshots are supplied.
  const resetFilters = () => {
    setStationFilter(''); setEquipmentFilter(''); setRange('all'); setSearch(''); setStatusFilter(''); setPage(1); setSelected(null)
  }
  const selectView = (next: EventsHistoryView) => {
    setView(next); resetFilters()
  }
  const exportRows = () => {
    const columns = view === 'maintenance' ? maintenanceColumns : view === 'communication' ? communicationColumns : measurementColumns
    const name = view === 'maintenance' ? 'maintenance-records' : view === 'communication' ? 'device-message-history' : `${measurement.toLowerCase().replaceAll(' ', '-')}-readings`
    downloadCsv(`liftiq-${name}.csv`, columns, filteredRows)
    onToast(`Downloaded ${filteredRows.length} filtered prototype records.`)
  }

  return <div className="events-history-page">
    <PageTitle eyebrow="Operations" title="Events & History" description="Review confirmed operational changes, source measurements, communication records, and maintenance." />
    <nav className="events-history-nav" aria-label="Event and history categories">
      {nav.map(item => <button key={item.id} className={`events-history-nav-link ${view === item.id ? 'active' : ''}`} onClick={() => selectView(item.id)} aria-current={view === item.id ? 'page' : undefined}>{item.label}</button>)}
      <button className="events-history-nav-link events-alarm-link" onClick={onOpenAlarms}>Alarms <span>{activeAlarmCount}</span></button>
    </nav>

    {view === 'overview' && <section className="events-overview-grid" aria-label="Operational record categories">
      <button className="events-category-card" onClick={onOpenAlarms}><span className="events-category-icon red">⚠</span><span><b>Alarms</b><small>{activeAlarmCount} open · {alarms.length} lifecycle records</small></span><span className="events-category-arrow">›</span></button>
      <button className="events-category-card" onClick={() => selectView('operational')}><span className="events-category-icon blue">↻</span><span><b>Operational History</b><small>{confirmedOperationalEvents} confirmed state transitions supplied</small></span><span className="events-category-arrow">›</span></button>
      <button className="events-category-card" onClick={() => selectView('measurements')}><span className="events-category-icon blue">⌁</span><span><b>Measurements & Trends</b><small>{measurementRows.length} local readings across level, current, run-hour, and totalizer fields</small></span><span className="events-category-arrow">›</span></button>
      <button className="events-category-card" onClick={() => selectView('communication')}><span className="events-category-icon slate">▤</span><span><b>Device & Communication</b><small>{communicationRows.length} message samples · freshness rule unavailable</small></span><span className="events-category-arrow">›</span></button>
      <button className="events-category-card" onClick={() => selectView('maintenance')}><span className="events-category-icon amber">🔧</span><span><b>Maintenance</b><small>{dueMaintenanceCount} due soon or overdue · schedule and completion history</small></span><span className="events-category-arrow">›</span></button>
    </section>}

    {view === 'operational' && <section className="events-workspace surface">
      <div className="events-section-heading"><div><h2>Confirmed operational changes</h2><p>Meaningful state changes require trustworthy before-and-after evidence. Periodic reports and commands alone are not transition events.</p></div></div>
      <div className="events-operational-evidence"><b>No state transitions are available in this prototype.</b><p>Current pump status snapshots exist, but the supplied Status Report samples contain no previous/current pump-state fields to compare. No pump ON/OFF, fault transition, configuration change, or communication outage is inferred.</p><small>Protocol decoder and Type 01 / Type 04 field specifications are not present in this repository.</small></div>
      <Empty title="No confirmed operational history records" detail="When consecutive valid state reports or comparable configuration snapshots are available, confirmed transitions can appear here with time, equipment, old and new state, and source evidence." />
    </section>}

    {view === 'measurements' && <section className="events-workspace surface">
      <div className="events-section-heading"><div><h2>Measurements & Trends</h2><p>Source readings are shown separately from alarms and operational events.</p></div></div>
      <div className="measurement-source-note"><b>Local prototype samples</b><span>Values come from fields already used in Station Messages and Totalizer. This repository has no protocol decoder; wire-level field scaling and subtype details are not independently validated.</span></div>
      <div className="events-filter-row">
        <label className="events-control"><span>Measurement</span><select className="events-select" value={measurement} onChange={event => { setMeasurement(event.target.value as MeasurementType); setEquipmentFilter(''); setPage(1); setSelected(null) }}>{availableMeasurements.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="events-control"><span>Station</span><select className="events-select" value={stationFilter} onChange={event => { setStationFilter(event.target.value); setPage(1) }}><option value="">All stations</option><option value={station.id}>{station.id}</option></select></label>
        <label className="events-control"><span>Equipment</span><select className="events-select" value={equipmentFilter} onChange={event => { setEquipmentFilter(event.target.value); setPage(1) }}><option value="">All equipment</option>{equipmentOptions.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="events-control"><span>Time range</span><select className="events-select" value={range} onChange={event => { setRange(event.target.value); setPage(1) }}><option value="all">All available</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
        <label className="events-control events-search-control"><span>Search</span><input className="events-input" placeholder="Search readings…" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
      </div>
      <ActiveFilters station={stationFilter} equipment={equipmentFilter} range={range} search={search} status="" onReset={resetFilters} />
      <MeasurementChart rows={filteredRows} measurement={measurement} />
      <RecordsTable rows={visibleRows} allRows={filteredRows} columns={measurementColumns} page={safePage} pageCount={pageCount} pageSize={pageSize} onPage={setPage} onPageSize={value => { setPageSize(value); setPage(1) }} onSelect={setSelected} />
      <div className="events-table-actions"><span>{filteredRows.length} available reading{filteredRows.length === 1 ? '' : 's'} · export reflects these filters</span><button className="btn soft" disabled={!filteredRows.length} onClick={exportRows}>↓ Export filtered CSV</button></div>
      {selected && <RecordDetails row={selected} onClose={() => setSelected(null)} />}
    </section>}

    {view === 'communication' && <section className="events-workspace surface">
      <div className="events-section-heading"><div><h2>Device & Communication</h2><p>Received message samples and explicit communication evidence.</p></div></div>
      <div className="communication-summary-grid">
        <div><small>Last report timestamp</small><strong>{dateTime(station.lastReported)}</strong></div>
        <div><small>Source reporting label</small><strong>{station.reporting} <em>(provided field)</em></strong></div>
        <div><small>Reporting freshness</small><strong>Not calculated</strong><em>No configured timeout rule is present</em></div>
      </div>
      <div className="events-operational-evidence"><b>No communication outage lifecycle is supplied.</b><p>A last-report timestamp cannot establish when an outage began or how long it lasted. This view does not label the station as non-reporting or infer recovery without a timeout rule and supporting messages.</p></div>
      <div className="events-section-heading events-subheading"><div><h3>Received message samples</h3><p>Source labels and timestamps from local Status Report mock records.</p></div></div>
      <div className="events-filter-row">
        <label className="events-control"><span>Station</span><select className="events-select" value={stationFilter} onChange={event => { setStationFilter(event.target.value); setPage(1) }}><option value="">All stations</option><option value={station.id}>{station.id}</option></select></label>
        <label className="events-control"><span>Time range</span><select className="events-select" value={range} onChange={event => { setRange(event.target.value); setPage(1) }}><option value="all">All available</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
        <label className="events-control events-search-control"><span>Search</span><input className="events-input" placeholder="Search source labels…" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
      </div>
      <ActiveFilters station={stationFilter} equipment="" range={range} search={search} status="" onReset={resetFilters} />
      <RecordsTable rows={visibleRows} allRows={filteredRows} columns={communicationColumns} page={safePage} pageCount={pageCount} pageSize={pageSize} onPage={setPage} onPageSize={value => { setPageSize(value); setPage(1) }} onSelect={setSelected} />
      <div className="events-table-actions"><span>{filteredRows.length} received message sample{filteredRows.length === 1 ? '' : 's'} · export reflects these filters</span><button className="btn soft" disabled={!filteredRows.length} onClick={exportRows}>↓ Export filtered CSV</button></div>
      {selected && <RecordDetails row={selected} onClose={() => setSelected(null)} />}
    </section>}

    {view === 'maintenance' && <section className="events-workspace surface">
      <div className="events-section-heading"><div><h2>Maintenance schedule & history</h2><p>Due dates, completion dates, status, and notes from maintenance records.</p></div></div>
      <div className="events-filter-row">
        <label className="events-control"><span>Station</span><select className="events-select" value={stationFilter} onChange={event => { setStationFilter(event.target.value); setPage(1) }}><option value="">All stations</option><option value={station.id}>{station.id}</option></select></label>
        <label className="events-control"><span>Equipment</span><select className="events-select" value={equipmentFilter} onChange={event => { setEquipmentFilter(event.target.value); setPage(1) }}><option value="">All equipment</option>{equipmentOptions.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="events-control"><span>Status</span><select className="events-select" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1) }}><option value="">All statuses</option>{statusOptions.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="events-control"><span>Due / maintained range</span><select className="events-select" value={range} onChange={event => { setRange(event.target.value); setPage(1) }}><option value="all">All available</option><option value="7">Last / next 7 days</option><option value="30">Last / next 30 days</option><option value="90">Last / next 90 days</option></select></label>
        <label className="events-control events-search-control"><span>Search</span><input className="events-input" placeholder="Search maintenance records…" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
      </div>
      <ActiveFilters station={stationFilter} equipment={equipmentFilter} range={range} search={search} status={statusFilter} onReset={resetFilters} />
      <RecordsTable rows={visibleRows} allRows={filteredRows} columns={maintenanceColumns} page={safePage} pageCount={pageCount} pageSize={pageSize} onPage={setPage} onPageSize={value => { setPageSize(value); setPage(1) }} onSelect={setSelected} />
      <div className="events-table-actions"><span>{filteredRows.length} maintenance record{filteredRows.length === 1 ? '' : 's'} · export reflects these filters</span><button className="btn soft" disabled={!filteredRows.length} onClick={exportRows}>↓ Export filtered CSV</button></div>
      {selected && <RecordDetails row={selected} onClose={() => setSelected(null)} />}
    </section>}
  </div>
}

function ActiveFilters({ station: stationValue, equipment, range, search, status, onReset }: { station: string; equipment: string; range: string; search: string; status: string; onReset: () => void }) {
  const filters = [stationValue && `Station: ${stationValue}`, equipment && `Equipment: ${equipment}`, status && `Status: ${status}`, range !== 'all' && `Range: ${range} days`, search && `Search: ${search}`].filter(Boolean)
  if (!filters.length) return null
  return <div className="events-active-filters"><span>Active filters</span>{filters.map((filter, index) => <b key={index}>{filter}</b>)}<button onClick={onReset}>Reset</button></div>
}

function RecordsTable({ rows, allRows, columns, page, pageCount, pageSize, onPage, onPageSize, onSelect }: {
  rows: RecordRow[]; allRows: RecordRow[]; columns: TableColumn[]; page: number; pageCount: number; pageSize: number
  onPage: (page: number) => void; onPageSize: (size: number) => void; onSelect: (row: RecordRow) => void
}) {
  if (!allRows.length) return <Empty title="No matching records" detail="No source records match this selection. Missing data is not represented as a zero value or a normal state." />
  return <div className="events-table-panel">
    <div className="events-table-scroll"><table className="events-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}<th>Details</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id}>{columns.map(column => <td key={column.key}>{column.key === 'status' ? <RecordStatus value={row.values[column.key]} /> : row.values[column.key] || 'Not supplied'}</td>)}<td><button className="events-row-action" onClick={() => onSelect(row)}>View →</button></td></tr>)}
    </tbody></table></div>
    <div className="events-pagination"><label>Rows per page <select value={pageSize} onChange={event => onPageSize(Number(event.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label><span>{allRows.length} records · Page {page} of {pageCount}</span><button disabled={page <= 1} onClick={() => onPage(Math.max(1, page - 1))}>‹</button><button disabled={page >= pageCount} onClick={() => onPage(Math.min(pageCount, page + 1))}>›</button></div>
  </div>
}

function MeasurementChart({ rows, measurement }: { rows: RecordRow[]; measurement: MeasurementType }) {
  if (!rows.length) return null
  const chronological = [...rows].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
  const groups = [...new Set(chronological.map(row => row.equipment))]
  const numbers = chronological.map(row => Number(row.values.value.replace(/[a-zA-Z, ]/g, ''))).filter(Number.isFinite)
  if (!numbers.length) return null
  const min = Math.min(...numbers), max = Math.max(...numbers)
  const margin = Math.max((max - min) * .15, Math.abs(max) * .08, .1)
  const low = Math.max(0, min - margin), high = max + margin
  const width = 760, height = 220
  const colors = ['#0876c9', '#13a36d', '#9b6ad6', '#e59314']
  const unit = measurement === 'Wet Well Level' ? 'in' : measurement === 'Pump Current' ? 'A' : measurement === 'Pump Run Hours' ? 'hrs' : 'gal'
  return <div className="measurement-chart-card"><div className="measurement-chart-heading"><div><b>{measurement} trend</b><small>{low.toFixed(measurement === 'Totalizer' ? 0 : 1)}–{high.toFixed(measurement === 'Totalizer' ? 0 : 1)} {unit}</small></div><div className="measurement-chart-legend">{groups.map((group, index) => <span key={group}><i style={{ background: colors[index % colors.length] }} />{group}</span>)}</div></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${measurement} measurements over time`}>
      {[0, 1, 2, 3].map(index => { const y = 25 + index * 48; const value = high - ((high - low) * index / 3); return <g key={index}><line x1="60" x2={width - 15} y1={y} y2={y} stroke="#e6edf4" /><text x="54" y={y + 4} textAnchor="end" fill="#708399" fontSize="10">{value.toFixed(measurement === 'Totalizer' ? 0 : 1)}</text></g> })}
      {groups.map((group, groupIndex) => {
        const groupRows = chronological.filter(row => row.equipment === group)
        const points = groupRows.map((row, index) => {
          const x = 64 + index * (width - 100) / Math.max(groupRows.length - 1, 1)
          const value = Number(row.values.value.replace(/[a-zA-Z, ]/g, ''))
          const y = height - 24 - ((value - low) / (high - low)) * (height - 55)
          return { x, y, row }
        })
        return <g key={group}><polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={colors[groupIndex % colors.length]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />{points.map(point => <circle key={point.row.id} cx={point.x} cy={point.y} r="4" fill="#fff" stroke={colors[groupIndex % colors.length]} strokeWidth="2"><title>{point.row.values.time}: {point.row.values.value}</title></circle>)}</g>
      })}
      <text x="60" y={height - 3} fill="#708399" fontSize="10">{dateOnly(chronological[0].occurredAt)}</text><text x={width - 15} y={height - 3} textAnchor="end" fill="#708399" fontSize="10">{dateOnly(chronological[chronological.length - 1].occurredAt)}</text>
    </svg>
  </div>
}

function RecordStatus({ value }: { value: string }) {
  const tone = value === 'Completed' || value === 'Recorded' || value === 'Received sample' ? 'complete' : value === 'Overdue' ? 'alert' : 'pending'
  return <span className={`events-status-pill ${tone}`}>{value}</span>
}

function RecordDetails({ row, onClose }: { row: RecordRow; onClose: () => void }) {
  return <aside className="events-detail-panel" aria-label="Selected record details"><div className="events-detail-heading"><div><small>Record details</small><h3>{row.category}</h3></div><button onClick={onClose} aria-label="Close record details">×</button></div><div className="events-detail-summary"><b>{row.station} · {row.equipment}</b><RecordStatus value={row.status} /><p>{row.summary}</p></div><dl className="events-detail-list">{Object.entries(row.values).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value || 'Not supplied'}</dd></div>)}</dl><div className="events-detail-evidence"><b>Source</b><p>{row.source}</p></div></aside>
}
