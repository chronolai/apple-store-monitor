// Selected SKUs are kept in the URL hash as base64-encoded JSON so a view can be shared.

export function encodeHash(skus) {
  return skus.length > 0 ? btoa(JSON.stringify(skus)) : ''
}

export function decodeHash(hash) {
  const raw = hash.replace(/^#/, '')
  if (!raw) return []
  try {
    const skus = JSON.parse(atob(raw))
    return Array.isArray(skus) ? skus.filter(sku => typeof sku === 'string') : []
  } catch {
    return []
  }
}
