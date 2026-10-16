// Device names look like "iPhone 17 Pro Max 512GB 藏藍色" or
// "11 吋 iPad Pro Wi‑Fi + 行動網路機型 1TB 配備標準玻璃 - 銀色".
export function parseDevice(device) {
  const m = device.name.match(/^(.*?)\s*(\d+)\s?(GB|TB)\s*(.*)$/)
  const model = m ? m[1] : device.name
  const capacity = m ? `${m[2]}${m[3]}` : ''
  const capacityGB = m ? Number(m[2]) * (m[3] === 'TB' ? 1024 : 1) : 0
  const parts = (m ? m[4] : '').replace(/^-\s*/, '').split(' - ').filter(Boolean)

  const wifi = /Wi[-‑]Fi/.test(model)
  return {
    ...device,
    series: model.replace(/\s*Wi[-‑]Fi.*$/, ''),
    capacity,
    capacityGB,
    connectivity: /行動網路/.test(model) ? 'Wi‑Fi + 行動網路' : wifi ? 'Wi‑Fi' : '',
    color: device.color || parts.at(-1) || '',
    extra: parts.length > 1 ? parts.slice(0, -1).join(' ') : '',
  }
}

export const hasStock = row => Array.isArray(row.stores) && row.stores.some(store => store.status)

export function describe(device) {
  return [device.color, device.connectivity, device.extra].filter(Boolean).join(' · ')
}

export function shortName(device) {
  return `${device.series} ${device.capacity}`.trim()
}

const byCapacity = (a, b) =>
  a.capacityGB - b.capacityGB || a.connectivity.localeCompare(b.connectivity) || a.color.localeCompare(b.color)

// Series keep the order they appear in (newest first, as on apple.com).
export function groupBySeries(devices) {
  const groups = new Map()
  for (const device of devices) {
    if (!groups.has(device.series)) groups.set(device.series, [])
    groups.get(device.series).push(device)
  }
  return [...groups].map(([series, items]) => ({ series, items: items.sort(byCapacity) }))
}
