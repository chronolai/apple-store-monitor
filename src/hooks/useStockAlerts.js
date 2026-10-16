import React from 'react'

import { describe, hasStock, shortName } from '../lib/devices'

const MAX_LOG = 200

// Compares every refresh with the previous one (the first response of a row is
// only a baseline) and reports
// - `changes`: per device, whether it just came into / went out of stock,
//   and calls `onAvailable` for restocks;
// - `log`: every per-store stock change, newest first.
export default function useStockAlerts(rows, onAvailable) {
  const previous = React.useRef(new Map()) // sku -> Map(store number -> in stock)
  const callback = React.useRef(onAvailable)
  callback.current = onAvailable
  const counter = React.useRef(0)
  const [changes, setChanges] = React.useState({})
  const [log, setLog] = React.useState([])

  React.useEffect(() => {
    const next = new Map()
    const found = {}
    const entries = []
    const at = Date.now()

    for (const row of rows) {
      if (row.stores === null) continue
      const stores = new Map(row.stores.map(store => [store.number, store.status]))
      const before = previous.current.get(row.sku)
      next.set(row.sku, stores)
      if (!before) continue

      const stock = hasStock(row)
      if ([...before.values()].some(Boolean) !== stock) {
        found[row.sku] = { type: stock ? 'available' : 'soldout', at }
        if (stock) callback.current?.(row)
      }

      for (const store of row.stores) {
        if (before.has(store.number) && before.get(store.number) !== store.status) {
          entries.push({
            id: counter.current++,
            at,
            sku: row.sku,
            device: shortName(row),
            detail: describe(row),
            store: store.store,
            quote: store.quote,
            type: store.status ? 'available' : 'soldout',
          })
        }
      }
    }

    previous.current = next
    if (Object.keys(found).length > 0) setChanges(c => ({ ...c, ...found }))
    if (entries.length > 0) setLog(l => [...entries.reverse(), ...l].slice(0, MAX_LOG))
  }, [rows])

  const clearLog = React.useCallback(() => setLog([]), [])

  return { changes, log, clearLog }
}
