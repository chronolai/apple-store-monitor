// Broad product family of a series, used to group the series filter.
export const categoryOf = series => (/iPhone/.test(series) ? 'iPhone' : /iPad/.test(series) ? 'iPad' : /^Mac/.test(series) ? 'Mac' : '其他')

const toGB = (amount, unit) => Number(amount) * (unit === 'TB' ? 1024 : 1)

// Mac names are comma separated specs, e.g.
// "Mac mini，M6 晶片，12 核心 CPU，12 核心 GPU，24GB 記憶體，512GB 儲存裝置".
function parseMac(device) {
  const [series, ...specs] = device.name.split('，').map(part => part.trim())
  const storage = specs.find(part => /儲存裝置/.test(part))?.match(/(\d+)\s?(GB|TB)/)
  const memory = specs.find(part => /記憶體/.test(part))?.match(/\d+\s?(?:GB|TB)/)?.[0].replace(/\s/, '')
  const chip = specs.find(part => /晶片/.test(part))?.replace(/\s*晶片/, '')
  const capacity = storage ? `${storage[1]}${storage[2]}` : ''
  return {
    ...device,
    price: device.prices?.at(-1)?.price,
    series,
    capacity,
    capacityGB: storage ? toGB(storage[1], storage[2]) : 0,
    connectivity: '',
    color: device.color || '',
    extra: specs.filter(part => !/儲存裝置/.test(part)).join(' · '),
    short: [series, chip, [memory, capacity].filter(Boolean).join('/')].filter(Boolean).join(' '),
  }
}

// Device names look like "iPhone 17 Pro Max 512GB 藏藍色" or
// "11 吋 iPad Pro Wi‑Fi + 行動網路機型 1TB 配備標準玻璃 - 銀色".
export function parseDevice(device) {
  if (/^Mac(?! ?book)/i.test(device.name) && device.name.includes('，')) return parseMac(device)
  const m = device.name.match(/^(.*?)\s*(\d+)\s?(GB|TB)\s*(.*)$/)
  const model = m ? m[1] : device.name
  const capacity = m ? `${m[2]}${m[3]}` : ''
  const capacityGB = m ? toGB(m[2], m[3]) : 0
  const parts = (m ? m[4] : '').replace(/^-\s*/, '').split(' - ').filter(Boolean)

  const wifi = /Wi[-‑]Fi/.test(model)
  return {
    ...device,
    // `prices` is a history, the last entry is the current price
    price: device.prices?.at(-1)?.price,
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
  return device.short ?? `${device.series} ${device.capacity}`.trim()
}

const byCapacity = (a, b) =>
  a.capacityGB - b.capacityGB ||
  a.connectivity.localeCompare(b.connectivity) ||
  a.color.localeCompare(b.color) ||
  a.extra.localeCompare(b.extra)

// Series keep the order they appear in (newest first, as on apple.com).
export function groupBySeries(devices) {
  const groups = new Map()
  for (const device of devices) {
    if (!groups.has(device.series)) groups.set(device.series, [])
    groups.get(device.series).push(device)
  }
  return [...groups].map(([series, items]) => ({ series, items: items.sort(byCapacity) }))
}
