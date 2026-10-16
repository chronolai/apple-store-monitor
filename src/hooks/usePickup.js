import React from 'react'
import axios from 'axios'

import useInterval from './useInterval'
import { buildPickupUrl, transData } from '../lib/pickup'

const proxy = 'https://asm.chrono.tw/corsproxy/'
const refreshDelay = 10000
const retryDelay = 3000
const maxRetryDelay = 60000

// Polls the pickup availability of `codes`. A row has `stores: null` until its
// first response arrives.
export default function usePickup(codes, devices) {
  const [fetched, setFetched] = React.useState([])
  const [progress, setProgress] = React.useState(100)
  const [lastUpdated, setLastUpdated] = React.useState(null)
  const [failures, setFailures] = React.useState(0)
  const [error, setError] = React.useState('')
  const failureCount = React.useRef(0)

  const controller = React.useRef(null)
  const retryTimer = React.useRef(null)

  const cancel = React.useCallback(() => {
    controller.current?.abort()
    controller.current = null
    clearTimeout(retryTimer.current)
    retryTimer.current = null
  }, [])

  // `force` replaces the request in flight (selection changed or retry);
  // otherwise a tick is skipped while a request is pending or a retry is queued.
  const load = (force = false) => {
    if (codes.length === 0) {
      cancel()
      setFetched([])
      setLastUpdated(null)
      failureCount.current = 0
      setFailures(0)
      setError('')
      setProgress(100)
      return
    }
    // ticks also wait out a pending retry, so the backoff is not bypassed
    if ((controller.current || retryTimer.current) && !force) return

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
        // the proxy may serve cached data; X-Data-Age is how old it is (seconds)
        const age = Number(resp.headers?.['x-data-age']) || 0
        setLastUpdated(Date.now() - age * 1000)
        failureCount.current = 0
        setFailures(0)
        setError('')
      })
      .catch(e => {
        if (axios.isCancel(e)) return
        console.error('Error:', e)
        failureCount.current += 1
        setFailures(failureCount.current)
        setError(e.response?.status ? `HTTP ${e.response.status}` : e.message)
        // back off while Apple keeps rejecting us, so the retries don't make it worse
        const delay = Math.min(retryDelay * 2 ** (failureCount.current - 1), maxRetryDelay)
        retryTimer.current = setTimeout(() => load(true), delay)
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

  return { rows, progress, lastUpdated, failures, error }
}
