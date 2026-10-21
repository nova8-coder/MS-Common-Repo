import { useMemo, useState } from 'react'
import { rawMessages, station, totalizerReadings } from '../data/mockData'
import { Empty } from '../components/UI'

type MeasurementName = 'Wet Well Level' | 'Pump Current' | 'Pump Run Hours' | 'Totalizer'
type Reading = { id: string; at: string; station: string; equipment: string; measurement: MeasurementName; value: number; unit: string; source: string }

const measurementNames: MeasurementName[] = ['Wet Well Level', 'Pump Current', 'Pump Run Hours', 'Totalizer']
const colors = ['#0876c9', '#13a36d', '#9b6ad6', '#e59314']
const formatTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
const formatDate = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}
function exportReadings(rows: Reading[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const headings = ['Timestamp', 'Station', 'Equipment', 'Measurement', 'Value', 'Unit', 'Source']
  const data = rows.map(row => [formatTime(row.at), row.station, row.equipment, row.measurement, String(row.value), row.unit, row.source])
  const csv = [headings, ...data].map(line => line.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'liftiq-measurements-trends.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function MeasurementsTrendsPanel() {
  const [measurement, setMeasurement] = useState<MeasurementName>('Wet Well Level')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const readings = useMemo<Reading[]>(() => {
    const rows: Reading[] = []
    rawMessages.forEach((message, index) => {
      rows.push({ id: `level-${index}`, at: message.t, station: station.id, equipment: 'Wet Well', measurement: 'Wet Well Level', value: message.lv, unit: 'in', source: message.rs })
      ;([message.p1, message.p2, message.p3] as const).forEach((pump, pumpIndex) => {
        const equipment = `Pump ${pumpIndex + 1}`
        rows.push({ id: `current-${index}-${pumpIndex}`, at: message.t, station: station.id, equipment, measurement: 'Pump Current', value: pump.a, unit: 'A', source: message.rs })
        rows.push({ id: `run-hours-${index}-${pumpIndex}`, at: message.t, station: station.id, equipment, measurement: 'Pump Run Hours', value: pump.h, unit: 'hrs', source: message.rs })
      })
    })
    totalizerReadings.forEach((reading, index) => rows.push({
      id: `totalizer-${index}`, at: `2026-10-${String(reading.day).padStart(2, '0')}T12:00:00`, station: station.id,
      equipment: 'Station Totalizer', measurement: 'Totalizer', value: reading.gallons, unit: 'gal', source: 'Station Totalizer sample',
    }))
    return rows
  }, [])

  const equipmentOptions = [...new Set(readings.filter(row => row.measurement === measurement).map(row => row.equipment))]
  const filtered = readings.filter(row => {
    if (row.measurement !== measurement) return false
    if (equipmentFilter && row.equipment !== equipmentFilter) return false
    const timestamp = Date.parse(row.at)
    if (fromDate && timestamp < Date.parse(`${fromDate}T00:00:00`)) return false
    if (toDate && timestamp > Date.parse(`${toDate}T23:59:59`)) return false
    const query = search.trim().toLowerCase()
    return !query || `${row.station} ${row.equipment} ${row.measurement} ${row.value} ${row.unit} ${row.source}`.toLowerCase().includes(query)
  }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const activeFilters = [equipmentFilter, fromDate, toDate, search].filter(Boolean).length
  const reset = () => { setEquipmentFilter(''); setFromDate(''); setToDate(''); setSearch(''); setPage(1) }

  return <section className="measurement-history-panel" aria-label="Measurements and trends">
    <header className="measurement-history-heading"><div><h2>Measurements &amp; Trends</h2><p>Explore readings reported for {station.id}. The report sample and totalizer readings remain separate sources.</p></div>
      <button className="btn soft" disabled={!filtered.length} onClick={() => exportReadings(filtered)}>↓ Export filtered CSV</button>
    </header>
    <div className="measurement-history-filters">
      <label><span>Measurement</span><select value={measurement} onChange={event => { setMeasurement(event.target.value as MeasurementName); setEquipmentFilter(''); setPage(1) }}>{measurementNames.map(name => <option key={name}>{name}</option>)}</select></label>
      <label><span>Equipment</span><select value={equipmentFilter} onChange={event => { setEquipmentFilter(event.target.value); setPage(1) }}><option value="">All equipment</option>{equipmentOptions.map(name => <option key={name}>{name}</option>)}</select></label>
      <label><span>From</span><input type="date" value={fromDate} onChange={event => { setFromDate(event.target.value); setPage(1) }} /></label>
      <label><span>To</span><input type="date" value={toDate} onChange={event => { setToDate(event.target.value); setPage(1) }} /></label>
      <label className="measurement-history-search"><span>Search</span><input type="search" placeholder="Search readings…" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
    </div>
    <div className="measurement-history-meta"><span>{filtered.length} {measurement.toLowerCase()} reading{filtered.length === 1 ? '' : 's'}{activeFilters ? ` · ${activeFilters} filter${activeFilters === 1 ? '' : 's'} applied` : ''}</span>{activeFilters > 0 && <button onClick={reset}>Clear filters</button>}</div>
    {filtered.length ? <>
      <MeasurementChart rows={filtered} measurement={measurement} />
      <div className="measurement-history-table-wrap"><table className="measurement-history-table"><thead><tr><th>Reading Time</th><th>Lift Station</th><th>Equipment</th><th>Measurement</th><th>Value</th><th>Source</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td>{formatTime(row.at)}</td><td>{row.station}</td><td>{row.equipment}</td><td>{row.measurement}</td><td>{row.value.toLocaleString()} {row.unit}</td><td>{row.source}</td></tr>)}</tbody></table></div>
      <footer className="measurement-history-pagination"><label>Rows per page <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label><span>{filtered.length} readings · Page {currentPage} of {pageCount}</span><button disabled={currentPage <= 1} onClick={() => setPage(Math.max(1, currentPage - 1))}>‹</button><button disabled={currentPage >= pageCount} onClick={() => setPage(Math.min(pageCount, currentPage + 1))}>›</button></footer>
      <p className="measurement-history-note">Local prototype samples only. Missing samples are not treated as zero readings. Values are from parsed fields already used in station messages and totalizer views.</p>
    </> : <Empty title="No matching readings" detail="Adjust the measurement or filters to see available samples." />}
  </section>
}

function MeasurementChart({ rows, measurement }: { rows: Reading[]; measurement: MeasurementName }) {
  const chronological = [...rows].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const groups = [...new Set(chronological.map(row => row.equipment))]
  const values = chronological.map(row => row.value)
  const min = Math.min(...values), max = Math.max(...values)
  const margin = Math.max((max - min) * .15, Math.abs(max) * .08, .1)
  const low = Math.max(0, min - margin), high = max + margin
  const width = 760, height = 220
  return <div className="measurement-history-chart"><div><strong>{measurement} trend</strong><small>{low.toLocaleString()}–{high.toLocaleString()} {chronological[0]?.unit}</small></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${measurement} readings over time`}>
      {[0, 1, 2, 3].map(index => { const y = 25 + index * 48; const value = high - ((high - low) * index / 3); return <g key={index}><line x1="60" x2={width - 15} y1={y} y2={y} stroke="#e6edf4"/><text x="54" y={y + 4} textAnchor="end" fill="#708399" fontSize="10">{value.toLocaleString()}</text></g> })}
      {groups.map((group, groupIndex) => {
        const series = chronological.filter(row => row.equipment === group)
        const points = series.map((row, index) => ({
          row,
          x: 64 + index * (width - 100) / Math.max(series.length - 1, 1),
          y: height - 24 - ((row.value - low) / (high - low || 1)) * (height - 55),
        }))
        return <g key={group}><polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={colors[groupIndex % colors.length]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>{points.map(point => <circle key={point.row.id} cx={point.x} cy={point.y} r="4" fill="#fff" stroke={colors[groupIndex % colors.length]} strokeWidth="2"><title>{formatTime(point.row.at)}: {point.row.value} {point.row.unit}</title></circle>)}</g>
      })}
      <text x="60" y={height - 3} fill="#708399" fontSize="10">{formatDate(chronological[0].at)}</text><text x={width - 15} y={height - 3} textAnchor="end" fill="#708399" fontSize="10">{formatDate(chronological.at(-1)!.at)}</text>
    </svg>
  </div>
}
