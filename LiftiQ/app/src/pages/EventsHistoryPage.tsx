import { useMemo, useState } from 'react'
import { allStations, rawMessages, station } from '../data/mockData'
import type { StationRecord } from '../data/mockData'
import type { AlarmLifecycle } from '../data/model'
import { Empty, PageTitle } from '../components/UI'

type MessageCategory = 'Alarm' | 'Event' | 'Status / telemetry'
type CategoryFilter = 'All messages' | 'Alarm messages' | 'Event messages' | 'Status / telemetry'
type HistoryRecord = {
  id: string
  station: string
  equipment: string
  category: MessageCategory
  subtype: string
  title: string
  summary: string
  occurredAt: string
  source: string
  recordType: string
  fields: Record<string, string>
  note: string
}

const categoryFilters: CategoryFilter[] = ['All messages', 'Alarm messages', 'Event messages', 'Status / telemetry']
const columns = [
  { key: 'occurredAt', label: 'Time' }, { key: 'station', label: 'Station / Asset' },
  { key: 'title', label: 'Message' }, { key: 'equipment', label: 'Equipment' },
  { key: 'category', label: 'Type' }, { key: 'source', label: 'Source' },
]

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not supplied'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}
function stationCategory(reason: string): MessageCategory {
  const normalized = reason.toLowerCase()
  if (normalized.includes('alarm') || normalized.includes('fault')) return 'Alarm'
  if (reason === 'Scheduled Message') return 'Status / telemetry'
  return 'Event'
}
function stationEquipment(reason: string) {
  const pump = reason.match(/pump\s*(\d+)/i)
  if (pump) return `Pump ${pump[1]}`
  if (/wet well|level float/i.test(reason)) return 'Wet Well'
  return 'Station controller'
}
function stationFields(record: StationRecord) {
  const fields: Record<string, string> = {
    'Reported reason (rs)': record.rs,
    'Wet well level (lv)': record.lv === null ? 'Not supplied' : `${record.lv} in`,
    'Alarm field (al)': displayValue(record.al),
  }
  record.p.forEach((pump, index) => {
    if (!pump && record.cur[index] == null && record.hrs[index] == null) return
    const name = `Pump ${index + 1}`
    fields[`${name} mode`] = pump?.mode ?? 'Not supplied'
    fields[`${name} maintenance state`] = pump?.maint ?? 'Not supplied'
    fields[`${name} run state`] = pump?.run ?? 'Not supplied'
    fields[`${name} current`] = record.cur[index] == null ? 'Not supplied' : `${record.cur[index]} A`
    fields[`${name} run hours`] = record.hrs[index] == null ? 'Not supplied' : `${record.hrs[index]} hrs`
  })
  return fields
}
function downloadCsv(rows: HistoryRecord[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const csvColumns = ['Time', 'Station / Asset', 'Message', 'Equipment', 'Type', 'Subtype', 'Source', 'Record ID']
  const csvRows = rows.map(row => [formatTime(row.occurredAt), row.station, row.title, row.equipment, row.category, row.subtype, row.source, row.id])
  const csv = [csvColumns, ...csvRows].map(line => line.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'liftiq-events-history.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function EventsHistoryPage({ alarms, onOpenAlarms, onOpenStation, onToast }: {
  alarms: AlarmLifecycle[]
  onOpenAlarms: () => void
  onOpenStation: (tab?: string) => void
  onToast: (message: string) => void
}) {
  const [category, setCategory] = useState<CategoryFilter>('All messages')
  const [stationFilter, setStationFilter] = useState('')
  const [subtypeFilter, setSubtypeFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<HistoryRecord | null>(null)

  const records = useMemo<HistoryRecord[]>(() => {
    const summaryRecords: HistoryRecord[] = allStations.flatMap((record, index) => {
      if (!record.t || !record.rs.trim() || record.rs.trim() === '-') return []
      // NOVA_02's station-list row and the first decoded message are the same sample.
      if (record.n === station.id && rawMessages.some(message => message.t.slice(0, 16) === record.t?.slice(0, 16))) return []
      const recordCategory = stationCategory(record.rs)
      return [{
        id: `station-record-${index}`, station: record.n, equipment: stationEquipment(record.rs), category: recordCategory,
        subtype: record.rs, title: recordCategory === 'Status / telemetry' ? 'Scheduled station report' : record.rs,
        summary: recordCategory === 'Alarm' ? `Station record reports: ${record.rs}.` : `Station record reports: ${record.rs}.`,
        occurredAt: record.t, source: 'Station list record (sample)', recordType: 'Station summary record',
        fields: stationFields(record),
        note: 'This is the latest station-list sample supplied for this asset. The sample does not include original payload bytes or a protocol subtype definition.',
      }]
    })
    const telemetryRecords: HistoryRecord[] = rawMessages.map((message, index) => ({
      id: `status-report-${index}`, station: station.id, equipment: 'Station controller', category: 'Status / telemetry',
      subtype: message.rs, title: 'Scheduled station report',
      summary: `Wet well ${message.lv.toFixed(2)} in · pump readings included`, occurredAt: message.t,
      source: message.rs, recordType: 'Status Report sample',
      fields: {
        'Source label (rs)': message.rs, 'Wet well level (lv)': `${message.lv} in`, 'Alarm field (al)': message.al,
        'Pump 1 current': `${message.p1.a} A`, 'Pump 1 run hours': `${message.p1.h} hrs`,
        'Pump 2 current': `${message.p2.a} A`, 'Pump 2 run hours': `${message.p2.h} hrs`,
        'Pump 3 current': `${message.p3.a} A`, 'Pump 3 run hours': `${message.p3.h} hrs`,
      },
      note: 'One scheduled report contains station status and multiple readings. Its fields are kept together; measurement values are not presented as separate event messages. The local data has parsed fields but no original payload bytes.',
    }))
    const alarmHistory: HistoryRecord[] = alarms.flatMap(alarm => alarm.events.map((event, index) => ({
      id: `alarm-${alarm.id}-${event.id}-${index}`, station: alarm.station, equipment: alarm.component,
      category: 'Alarm' as const, subtype: event.kind, title: event.title, summary: event.detail,
      occurredAt: event.at, source: `${event.kind[0].toUpperCase()}${event.kind.slice(1)} alarm lifecycle`,
      recordType: 'Alarm lifecycle history',
      fields: {
        'Lifecycle ID': alarm.id, 'Alarm': alarm.name, 'Severity': alarm.severity,
        'Lifecycle status': alarm.status, 'Event source kind': event.kind,
        'Event title': event.title, 'Event detail': event.detail,
        ...(event.value ? { 'Reported value': event.value } : {}),
        ...(event.evidence ? { 'Evidence': event.evidence } : {}),
        'Lifecycle source': alarm.source,
      },
      note: 'This entry is an alarm lifecycle history event in the application data. It is not represented as an original device message or payload.',
    })))
    return [...summaryRecords, ...telemetryRecords, ...alarmHistory].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
  }, [alarms])

  const categoryFiltered = category === 'All messages' ? records : records.filter(record =>
    category === 'Alarm messages' ? record.category === 'Alarm' :
      category === 'Event messages' ? record.category === 'Event' : record.category === 'Status / telemetry')
  const filtered = categoryFiltered.filter(record => {
    if (stationFilter && record.station !== stationFilter) return false
    if (subtypeFilter && record.subtype !== subtypeFilter) return false
    if (equipmentFilter && record.equipment !== equipmentFilter) return false
    if (sourceFilter && record.source !== sourceFilter) return false
    const timestamp = Date.parse(record.occurredAt)
    if (fromDate && timestamp < Date.parse(`${fromDate}T00:00:00`)) return false
    if (toDate && timestamp > Date.parse(`${toDate}T23:59:59`)) return false
    if (search.trim()) {
      const searchable = [record.station, record.equipment, record.category, record.subtype, record.title, record.summary, record.source, ...Object.values(record.fields)].join(' ').toLowerCase()
      if (!searchable.includes(search.trim().toLowerCase())) return false
    }
    return true
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const stations = [...new Set(records.map(record => record.station))].sort()
  const subtypes = [...new Set(categoryFiltered.map(record => record.subtype))].sort()
  const equipment = [...new Set(categoryFiltered.map(record => record.equipment))].sort()
  const sources = [...new Set(categoryFiltered.map(record => record.source))].sort()
  const alarmCount = records.filter(record => record.category === 'Alarm').length
  const eventCount = records.filter(record => record.category === 'Event').length
  const telemetryCount = records.filter(record => record.category === 'Status / telemetry').length
  const resetFilters = () => { setStationFilter(''); setSubtypeFilter(''); setEquipmentFilter(''); setSourceFilter(''); setFromDate(''); setToDate(''); setSearch(''); setPage(1); setSelected(null) }
  const setFilter = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); setSelected(null) }
  const activeFilterCount = [stationFilter, subtypeFilter, equipmentFilter, sourceFilter, fromDate, toDate, search].filter(Boolean).length

  return <div className="events-history-page">
    <PageTitle eyebrow="Operations" title="Events & History" description="Explore messages and historical activity across accessible LiftIQ assets." />
    <section className="events-explorer surface" aria-label="Events and history message explorer">
      <div className="events-explorer-header">
        <div><h2>Unified history</h2><p>Inspect what was reported, when, and for which asset. Source records and alarm lifecycle history retain their distinct origins.</p></div>
        <button className="btn soft" disabled={!filtered.length} onClick={() => { downloadCsv(filtered); onToast(`Downloaded ${filtered.length} filtered history records.`) }}>↓ Export filtered CSV</button>
      </div>
      <div className="events-category-tabs" role="tablist" aria-label="Message category">
        {categoryFilters.map(item => {
          const count = item === 'All messages' ? records.length : item === 'Alarm messages' ? alarmCount : item === 'Event messages' ? eventCount : telemetryCount
          return <button key={item} role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => { setCategory(item); setPage(1); setSelected(null); setSubtypeFilter('') }}>{item}<span>{count}</span></button>
        })}
      </div>
      <div className="events-explorer-filters">
        <label><span>From</span><input type="date" value={fromDate} onChange={event => setFilter(setFromDate)(event.target.value)} /></label>
        <label><span>To</span><input type="date" value={toDate} onChange={event => setFilter(setToDate)(event.target.value)} /></label>
        <label><span>Station / Asset</span><select value={stationFilter} onChange={event => setFilter(setStationFilter)(event.target.value)}><option value="">All assets</option>{stations.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span>Message subtype / reason</span><select value={subtypeFilter} onChange={event => setFilter(setSubtypeFilter)(event.target.value)}><option value="">All subtypes</option>{subtypes.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span>Equipment</span><select value={equipmentFilter} onChange={event => setFilter(setEquipmentFilter)(event.target.value)}><option value="">All equipment</option>{equipment.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span>Source</span><select value={sourceFilter} onChange={event => setFilter(setSourceFilter)(event.target.value)}><option value="">All sources</option>{sources.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="events-explorer-search"><span>Search</span><input type="search" placeholder="Search message, station, or value" value={search} onChange={event => setFilter(setSearch)(event.target.value)} /></label>
      </div>
      <div className="events-explorer-results"><span>{filtered.length} record{filtered.length === 1 ? '' : 's'}{activeFilterCount ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} applied` : ''}</span>{activeFilterCount > 0 && <button onClick={resetFilters}>Clear filters</button>}</div>
      {!filtered.length ? <Empty title="No matching history records" detail="Try another category or adjust the filters. A missing record is not interpreted as a normal state." /> : <div className="events-table-panel">
        <div className="events-table-scroll"><table className="events-table events-explorer-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}<th>Details</th></tr></thead><tbody>
          {visible.map(record => <tr key={record.id} className={selected?.id === record.id ? 'selected' : ''}>
            <td>{formatTime(record.occurredAt)}</td><td><strong>{record.station}</strong></td><td><strong>{record.title}</strong><small className="events-row-summary">{record.summary}</small></td><td>{record.equipment}</td><td><span className={`events-type-pill ${record.category.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`}>{record.category}</span></td><td>{record.source}</td><td><button className="events-row-action" onClick={() => setSelected(record)}>View →</button></td>
          </tr>)}
        </tbody></table></div>
        <div className="events-pagination"><label>Rows per page <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label><span>{filtered.length} records · Page {currentPage} of {pageCount}</span><button disabled={currentPage <= 1} onClick={() => setPage(Math.max(1, currentPage - 1))}>‹</button><button disabled={currentPage >= pageCount} onClick={() => setPage(Math.min(pageCount, currentPage + 1))}>›</button></div>
      </div>}
      <div className="events-prototype-note"><b>Data coverage</b><span>Alarm lifecycle events and supplied station report samples are shown. Station-list records are snapshots, not a retained raw-message archive. Original wire payloads and protocol subtype definitions are not available in this prototype. Use the station’s <button onClick={() => onOpenStation('Trends')}>Measurements & Trends</button> view for charts.</span></div>
      {selected && <RecordDetails row={selected} onClose={() => setSelected(null)} onOpenAlarms={onOpenAlarms} onOpenStation={onOpenStation} />}
    </section>
  </div>
}

function RecordDetails({ row, onClose, onOpenAlarms, onOpenStation }: {
  row: HistoryRecord
  onClose: () => void
  onOpenAlarms: () => void
  onOpenStation: (tab?: string) => void
}) {
  return <aside className="events-detail-panel" aria-label="Selected history record details">
    <div className="events-detail-heading"><div><small>{row.recordType}</small><h3>{row.title}</h3></div><button onClick={onClose} aria-label="Close record details">×</button></div>
    <div className="events-detail-summary"><b>{row.station} · {row.equipment}</b><span className={`events-type-pill ${row.category.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`}>{row.category}</span><p>{row.summary}</p></div>
    <dl className="events-detail-list"><div><dt>Timestamp</dt><dd>{formatTime(row.occurredAt)}</dd></div><div><dt>Subtype / reason</dt><dd>{row.subtype}</dd></div><div><dt>Source</dt><dd>{row.source}</dd></div>{Object.entries(row.fields).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
    <div className="events-detail-evidence"><b>Record context</b><p>{row.note}</p></div>
    <div className="events-detail-actions">{row.category === 'Alarm' && <button className="btn soft" onClick={onOpenAlarms}>Open alarm history</button>}{row.station === station.id && <button className="btn primary" onClick={() => onOpenStation('Trends')}>Open station trends</button>}</div>
  </aside>
}
