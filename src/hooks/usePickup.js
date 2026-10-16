import React from 'react'
import axios from 'axios'

import useInterval from './useInterval'
import { buildPickupUrl, transData } from '../lib/pickup'

const proxy = 'https://asm.chrono.tw/corsproxy/'
const refreshDelay = 10000
const retryDelay = 3000

// Polls the pickup availability of `codes`. A row has `stores: null` until its
// first response arrives.
export default function usePickup(codes, devices) {
  const [fetched, setFetched] = React.useState([])
  const [progress, setProgress] = React.useState(100)
  const [lastUpdated, setLastUpdated] = React.useState(null)
  const [failures, setFailures] = React.useState(0)

  const controller = React.useRef(null)
  const retryTimer = React.useRef(null)

  const cancel = React.useCallback(() => {
    controller.current?.abort()
    controller.current = null
    clearTimeout(retryTimer.current)
  }, [])

  // `force` replaces the request in flight (selection changed); otherwise a
  // tick is skipped while the previous request is still pending.
  const load = (force = false) => {
    if (codes.length === 0) {
      cancel()
      setFetched([])
      setLastUpdated(null)
      setFailures(0)
      setProgress(100)
      return
    }
    if (controller.current && !force) return

    cancel()
    const current = new AbortController()
    controller.current = current
    setProgress(0)

    const url = `${proxy}?apiurl=${encodeURIComponent(buildPickupUrl(codes))}`
    axios
      .get(url, { signal: current.signal })
      .then(resp => {
        if (!resp.data?.body) throw new Error('Unexpected response')
        setFetched(transData(resp.data, codes, devices))
        setLastUpdated(Date.now())
        setFailures(0)
      })
      .catch(e => {
        if (axios.isCancel(e)) return
        console.error('Error:', e)
        setFailures(f => f + 1)
        retryTimer.current = setTimeout(() => load(true), retryDelay)
      })
      .finally(() => {
        // a replaced request must not clear the state of the one that replaced it
        if (controller.current === current) {
          controller.current = null
          setProgress(100)
        }
      })
  }

  React.useEffect(() => {
    load(true)
    return cancel
  }, [codes])

  useInterval(() => load(), refreshDelay)

  const rows = React.useMemo(
    () =>
      codes.map(
        code =>
          fetched.find(row => row.sku === code) ?? {
            ...devices.find(device => device.sku === code),
            stores: null,
          }
      ),
    [codes, fetched, devices]
  )

  return { rows, progress, lastUpdated, failures }
}
