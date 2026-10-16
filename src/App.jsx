import React from 'react'
import LoadingBar from 'react-top-loading-bar'

import useNow from './hooks/useNow'
import usePickup from './hooks/usePickup'
import useStockAlerts from './hooks/useStockAlerts'
import { decodeHash, encodeHash } from './lib/hash'
import { hasStock, parseDevice, shortName } from './lib/devices'
import {
  beep,
  notificationPermission,
  notifyAvailable,
  primeAudio,
  requestNotificationPermission,
} from './lib/alerts'

import Layout from './components/Layout'
import Header from './components/Header'
import DevicePicker, { emptyFilters } from './components/DevicePicker'
import ResultList from './components/ResultList'
import LogDialog from './components/LogDialog'
import EmptyState from './components/EmptyState'

const maxSelected = 10
const baseTitle = 'Apple Store Monitor'
const ALERTS_KEY = 'asm.alerts'

const readAlertsPref = () => {
  try {
    return localStorage.getItem(ALERTS_KEY) === '1'
  } catch {
    return false
  }
}

function Monitor({ devices }) {
  // SKUs in the hash that no longer exist (e.g. discontinued) are dropped.
  const [codes, setCodes] = React.useState(() =>
    decodeHash(window.location.hash).filter(sku => devices.some(d => d.sku === sku))
  )
  const [filters, setFilters] = React.useState(emptyFilters)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [logOpen, setLogOpen] = React.useState(false)
  const [alertsOn, setAlertsOn] = React.useState(readAlertsPref)
  const [permission, setPermission] = React.useState(notificationPermission)

  const now = useNow()
  const { rows, progress, lastUpdated, failures, error } = usePickup(codes, devices)

  const { changes, log, clearLog } = useStockAlerts(rows, row => {
    if (!alertsOn) return
    beep()
    notifyAvailable(row)
  })

  // Hidden shortcut: "L" toggles the stock change log.
  React.useEffect(() => {
    const onKeyDown = e => {
      if (e.key.toLowerCase() !== 'l' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const target = e.target
      if (target.closest?.('input, textarea, select, [contenteditable]')) return
      // don't stack on top of the device picker
      if (!logOpen && document.querySelector('dialog[open]')) return
      setLogOpen(open => !open)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [logOpen])

  React.useEffect(() => {
    const hash = encodeHash(codes)
    history.replaceState(null, '', hash ? `#${hash}` : window.location.pathname + window.location.search)
  }, [codes])

  const inStock = rows.filter(hasStock).length
  React.useEffect(() => {
    document.title = inStock > 0 ? `(${inStock}) 有貨 · ${baseTitle}` : baseTitle
  }, [inStock])

  const toggleAlerts = async () => {
    const next = !alertsOn
    setAlertsOn(next)
    try {
      localStorage.setItem(ALERTS_KEY, next ? '1' : '0')
    } catch {
      // storage unavailable: the preference only lasts for this visit
    }
    if (next) {
      primeAudio()
      setPermission(await requestNotificationPermission())
    }
  }

  const toggleCode = sku =>
    setCodes(current =>
      current.includes(sku) ? current.filter(c => c !== sku) : current.length < maxSelected ? [...current, sku] : current
    )

  const seriesNames = React.useMemo(() => [...new Set(devices.map(d => d.series))], [devices])

  const latest = Object.entries(changes)
    .filter(([sku, change]) => change.type === 'available' && now - change.at < 15000 && codes.includes(sku))
    .sort((a, b) => b[1].at - a[1].at)[0]
  const latestDevice = latest && devices.find(d => d.sku === latest[0])
  const announcement = [
    failures > 0 ? '連線不穩,重試中' : lastUpdated ? '連線正常' : '',
    latestDevice ? `${shortName(latestDevice)} ${latestDevice.color} 有貨了` : '',
  ]
    .filter(Boolean)
    .join(';')

  return (
    <Layout>
      <LoadingBar color="#1d4ed8" progress={progress} shadow />
      <Header
        total={codes.length}
        max={maxSelected}
        onOpenPicker={() => setPickerOpen(true)}
        inStock={inStock}
        announcement={announcement}
        alertsOn={alertsOn}
        permission={permission}
        onToggleAlerts={toggleAlerts}
        failures={failures}
        error={error}
        lastUpdated={lastUpdated}
        now={now}
      />
      <div>
        {codes.length === 0 ? (
          <EmptyState
            series={seriesNames}
            onOpen={() => setPickerOpen(true)}
            onPickSeries={series => {
              setFilters({ ...emptyFilters, series })
              setPickerOpen(true)
            }}
          />
        ) : (
          <ResultList rows={rows} changes={changes} now={now} onRemove={toggleCode} />
        )}
      </div>
      <DevicePicker
        devices={devices}
        codes={codes}
        max={maxSelected}
        filters={filters}
        onFilters={setFilters}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onToggle={toggleCode}
        onClear={() => setCodes([])}
      />
      <LogDialog log={log} open={logOpen} onClose={() => setLogOpen(false)} onClear={clearLog} />
    </Layout>
  )
}

// The device list is large, so it is loaded as a separate chunk.
const App = () => {
  const [devices, setDevices] = React.useState(null)

  React.useEffect(() => {
    import('../data/devices.json').then(module => setDevices(module.default.map(parseDevice)))
  }, [])

  if (!devices) {
    return (
      <Layout>
        <p className="text-gray-700" role="status">
          載入中…
        </p>
      </Layout>
    )
  }
  return <Monitor devices={devices} />
}

export default App
