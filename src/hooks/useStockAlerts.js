import React from 'react'

import { hasStock } from '../lib/devices'

// Detects rows whose stock status flipped between two refreshes (the first
// response of a row is only a baseline) and calls `onAvailable` for restocks.
export default function useStockAlerts(rows, onAvailable) {
  const previous = React.useRef(new Map())
  const callback = React.useRef(onAvailable)
  callback.current = onAvailable
  const [changes, setChanges] = React.useState({})

  React.useEffect(() => {
    const next = new Map()
    const found = {}
    for (const row of rows) {
      if (row.stores === null) continue
      const stock = hasStock(row)
      next.set(row.sku, stock)
      if (previous.current.has(row.sku) && previous.current.get(row.sku) !== stock) {
        found[row.sku] = { type: stock ? 'available' : 'soldout', at: Date.now() }
        if (stock) callback.current?.(row)
      }
    }
    previous.current = next
    if (Object.keys(found).length > 0) setChanges(c => ({ ...c, ...found }))
  }, [rows])

  return changes
}
