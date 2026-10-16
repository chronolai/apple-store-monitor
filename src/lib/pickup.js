const PICKUP_URL = 'https://www.apple.com/tw/shop/retail/pickup-message'

export function buildPickupUrl(codes, location = 330) {
  const params = new URLSearchParams({
    pl: true,
    location,
    ...Object.fromEntries(codes.map((code, i) => [`parts.${i}`, code])),
  })
  return `${PICKUP_URL}?${params}`
}

// Merge the pickup-message response into one row per selected device.
export function transData(resp, codes, devices) {
  const rows = codes.map(code => ({
    ...devices.find(device => device.sku === code),
    stores: [],
  }))

  for (const store of resp?.body?.stores ?? []) {
    for (const [code, part] of Object.entries(store.partsAvailability ?? {})) {
      const row = rows.find(item => item.sku === code)
      if (!row) continue
      row.stores.push({
        store: store.storeName,
        number: store.storeNumber,
        code,
        status: part.pickupDisplay === 'available',
        name: part.messageTypes?.regular?.storePickupProductTitle,
        quote: part.pickupSearchQuote,
      })
    }
  }
  return rows
}
