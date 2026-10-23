export function buildLiftIQStationUrl(stationId: string, tab = 'Alarms') {
  const base = import.meta.env.VITE_LIFTIQ_APP_URL || 'http://localhost:5173'
  const url = new URL('/', base)
  url.searchParams.set('station', stationId)
  url.searchParams.set('tab', tab)
  return url.toString()
}
