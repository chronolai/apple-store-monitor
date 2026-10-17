import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import axios from 'axios'
import HTMLParser from 'node-html-parser'

const SEO_URL = 'https://www.apple.com/tw/shop/updateSEO'

const ORIGIN = 'https://www.apple.com'
const HUB_URLS = [
  `${ORIGIN}/tw/shop/buy-iphone`,
  `${ORIGIN}/tw/shop/buy-ipad`,
]

// Macs are monitored only for these models (the Mac hub also lists MacBook, iMac, displays…).
const MAC_SLUGS = ['mac-mini', 'mac-studio']
const isMacPage = (url) => url.includes('/tw/shop/buy-mac/')

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const target = path.join(dataDir, 'devices.json')
const metaTarget = path.join(dataDir, 'meta.json')

// Every HTTP call goes through here so the UI can show how many requests were made.
const requests = { count: 0, failed: 0, report: () => {} }
const request = async (url, config) => {
  requests.count++
  try {
    return await axios.get(url, config)
  } catch (err) {
    requests.failed++
    throw err
  } finally {
    requests.report({ type: 'request', count: requests.count, failed: requests.failed })
  }
}

const queryHTML = (html, selector) => HTMLParser.parse(html).querySelectorAll(selector)

// Each helper returns `{ sku, label }`; the label is only used to tell
// products apart in warnings, since a bare part number means nothing to a human.
const getSKUsV1 = (html) => {
  const skus = []
  const v1 = queryHTML(html, '[type="application/ld+json"]')
    .map(item => JSON.parse(item.text))
    .filter(json => json['@type'] === 'Product')
  v1.forEach(p => {
    p.offers.forEach(o => {
      if (o['@type'] === 'Offer') {
        skus.push({ sku: o.sku, label: p.name })
      }
    })
  })
  return skus
}

const describeV2 = (p) => {
  const dimensions = Object.entries(p)
    .filter(([key, value]) => key.startsWith('dimension') && !key.endsWith('order') && value)
    .map(([, value]) => value)
  return [p.familyType, ...dimensions].filter(Boolean).join(' ')
}

const getSKUsV2 = (html) => {
  let skus = []
  const v2 = queryHTML(html, 'script').map(s => s.text).filter(t => t.includes('PRODUCT_SELECTION_BOOTSTRAP'))
  if (v2.length > 0) {
    const content = v2[0].split('\n')[2].replace('        productSelectionData: ', '')
    skus = JSON.parse(content).products.map(p => ({ sku: p.partNumber, label: describeV2(p) }))
  }
  return skus
}

// Fallback for products whose Product block is missing: no price or image, but
// enough to list, search and monitor them (stock lookups only need the SKU).
const fromTitle = (sku, marketing, seo) => {
  const name = (marketing?.title || '')
    .replaceAll('\u00a0', ' ')
    .replace(/^購買\s*/, '')
    .replace(/\s*-\s*Apple\s*\(台灣\)\s*$/, '')
    .trim()
  if (!name) return null
  return {
    name,
    url: marketing?.canonicalURL,
    description: marketing?.metaDescription,
    sku,
    prices: [],
    seoUrl: seo,
  }
}

// Mac mini / Mac Studio are configurable, so the overview page only links to
// ready-made configurations. Each of those pages carries its own SKU and price
// in JSON-LD (updateSEO has nothing for them), so read the product from there.
const getMacSKUs = async (html, url) => {
  const slug = url.split('/').pop()
  const links = new Set(html.match(new RegExp(`/tw/shop/buy-mac/${slug}/[^"'<> ?#]+`, 'g')) ?? [])
  const items = []
  for (const link of links) {
    const page = await request(ORIGIN + link).then(r => r.data)
    const products = queryHTML(page, '[type="application/ld+json"]')
      .map(item => JSON.parse(item.text))
      .filter(json => json['@type'] === 'Product')
    for (const product of products) {
      for (const offer of product.offers.filter(o => o['@type'] === 'Offer')) {
        items.push({
          sku: offer.sku,
          label: product.name,
          lookup: async () => ({ product: { ...product, offers: [offer] } }),
        })
      }
    }
  }
  return items
}

const seoUrlOf = (sku) => {
  const refererUrl = 'https://www.apple.com/'
  const params = new URLSearchParams({ m: JSON.stringify({ product: sku, refererUrl }) }).toString()
  return `${SEO_URL}?${params}`
}

/**
 * Find every product page linked from the iPhone / iPad hub pages,
 * e.g. /tw/shop/buy-iphone/iphone-17 or /tw/shop/buy-ipad/ipad-air.
 */
export async function discoverUrls() {
  const found = new Set()
  for (const hub of HUB_URLS) {
    const category = hub.split('/').pop()
    const html = await request(hub).then(r => r.data)
    const pattern = new RegExp(`/tw/shop/${category}/${category.replace('buy-', '')}[a-z0-9-]*(?=["'?#/])`, 'g')
    for (const match of html.matchAll(pattern)) {
      found.add(ORIGIN + match[0])
    }
  }
  for (const slug of MAC_SLUGS) {
    found.add(`${ORIGIN}/tw/shop/buy-mac/${slug}`)
  }
  return [...found]
}

const lookup = async (sku) => {
  const seo = seoUrlOf(sku)
  const res = await request(seo).then(r => r.data)
  const marketing = res.body.marketingData
  const products = marketing.microdataList.filter(m => JSON.parse(m)['@type'] === 'Product')
  return { seo, marketing, product: products.length === 1 ? JSON.parse(products[0]) : null }
}

const priceOf = (product) => {
  const price = Number(product?.offers?.[0]?.price)
  return Number.isFinite(price) ? price : undefined
}

// Full entry from Apple's Product block. `prices` is a history: the last item is the latest.
const fromProduct = (product, seo, now) => {
  const offer = product.offers[0]
  const price = priceOf(product)
  const device = { ...product }
  delete device['@context']
  delete device['@type']
  delete device['mainEntityOfPage']
  delete device['offers']
  return {
    ...device,
    name: product.name.replaceAll(' ', ' '),
    sku: offer.sku,
    priceCurrency: offer.priceCurrency,
    prices: price === undefined ? [] : [{ price, at: now }],
    seoUrl: seo,
  }
}

// Older files stored a single `price`; turn it into a one-item history.
const migrate = (device, at) => {
  const { price, ...rest } = device
  if (Array.isArray(rest.prices)) return rest
  return { ...rest, prices: price == null ? [] : [{ price: Number(price), at }] }
}

const readJSON = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback)

/**
 * Sync data/devices.json with apple.com.
 *
 * Device details rarely change, so existing entries are kept as they are:
 *  - new SKUs are added with full details,
 *  - known SKUs only get their price refreshed (appended to `prices` when it changed;
 *    if Apple does not answer, the old data stays),
 *  - SKUs no longer listed are marked `discontinued` (never deleted, price frozen).
 * The sync time goes to data/meta.json. Progress is reported through `onEvent` so any UI can render it.
 */
export async function sync(onEvent = () => {}) {
  const now = new Date().toISOString()
  const previousSyncedAt = readJSON(metaTarget, {}).syncedAt ?? now
  const previous = readJSON(target, []).map(d => migrate(d, previousSyncedAt))
  const previousBySku = new Map(previous.map(d => [d.sku, d]))
  const stats = { added: 0, priceChanged: 0, discontinued: 0 }
  const priceMissed = [] // known devices whose price could not be refreshed this time
  Object.assign(requests, { count: 0, failed: 0, report: onEvent })

  const data = []
  const seen = new Set()

  onEvent({ type: 'discover' })
  const urls = await discoverUrls()
  onEvent({ type: 'pages', urls })

  // Phase 1: read every page first, so the number of lookups (and requests) is known up front.
  const pages = []
  for (const url of urls) {
    onEvent({ type: 'scan-start', url })
    // A retired product page redirects elsewhere (e.g. ipad-10-2 -> /tw/ipad); don't follow it.
    const res = await request(url, { maxRedirects: 0, validateStatus: status => status < 400 })
    if (res.status >= 300) {
      onEvent({ type: 'page-skipped', url, to: res.headers.location })
      continue
    }
    const html = res.data
    const skus = isMacPage(url) ? await getMacSKUs(html, url) : [...getSKUsV1(html), ...getSKUsV2(html)]
    onEvent({ type: 'page-skus', url, total: skus.length })
    pages.push({ url, skus })
  }
  // Mac entries already carry their data; every other new SKU costs one updateSEO request.
  const lookups = new Set(pages.flatMap(page => page.skus).filter(item => !item.lookup).map(item => item.sku))
  onEvent({ type: 'plan', expected: requests.count + lookups.size })

  // Phase 2: look up each SKU once.
  for (const { url, skus } of pages) {
    onEvent({ type: 'page-start', url })

    let found = 0
    for (const { sku, label, lookup: find } of skus) {
      // the same SKU shows up on several pages (and twice within one page)
      if (seen.has(sku)) {
        found++
        continue
      }
      seen.add(sku)

      const known = previousBySku.get(sku)
      let result
      let failedLookup = false
      try {
        result = await (find ?? (() => lookup(sku)))()
      } catch (err) {
        if (!known) {
          onEvent({ type: 'warning', message: `${sku}(${label || '未知機型'}):查詢失敗(${err.message}),已略過` })
          continue
        }
        failedLookup = true
        result = { product: null }
      }
      const { seo, marketing, product } = result

      let device
      if (known) {
        const { discontinued, discontinuedAt, ...active } = known // listed again, so back on sale
        device = active
        const price = priceOf(product)
        const latest = device.prices.at(-1)?.price
        if (price === undefined) priceMissed.push(device.name)
        if (price === undefined && !failedLookup && !find) onEvent({ type: 'no-price' })
        if (product && device.prices.length === 0) {
          // earlier only the title was available; now we have the real details
          device = { ...fromProduct(product, seo, now), seoUrl: device.seoUrl }
        } else if (price !== undefined && price !== latest) {
          device = { ...device, prices: [...device.prices, { price, at: now }] }
          stats.priceChanged++
          onEvent({ type: 'price-change', name: device.name, from: latest, to: price })
        }
      } else {
        // Apple sometimes leaves the Product block out (only a breadcrumb comes back);
        // fall back to what the page title tells us.
        device = product ? fromProduct(product, seo, now) : fromTitle(sku, marketing, seo)
        if (!device) {
          onEvent({ type: 'warning', message: `${sku}(${label || '未知機型'}):沒有商品資料,也沒有標題可用,已略過` })
          continue
        }
        if (!product) {
          if (!find) onEvent({ type: 'no-price' })
          onEvent({ type: 'warning', message: `${sku}(${device.name}):Apple 沒回商品資料,依標題建立,暫無價格` })
        }
        stats.added++
        onEvent({ type: 'added', name: device.name })
      }

      data.push(device)
      found++
      onEvent({ type: 'product', url, name: device.name, found, total: skus.length })
    }
    onEvent({ type: 'page-done', url, found })
  }

  // A broken page layout yields few or no SKUs, which would mark everything as discontinued.
  const activeBefore = previous.filter(d => !d.discontinued).length
  if (seen.size === 0 || seen.size < activeBefore * 0.5) {
    throw new Error(`只找到 ${seen.size} 個型號(原本上架 ${activeBefore} 個),不覆寫 devices.json`)
  }

  for (const device of previous) {
    if (seen.has(device.sku)) continue // still listed, already in `data`
    if (device.discontinued) {
      data.push(device)
    } else {
      data.push({ ...device, discontinued: true, discontinuedAt: now })
      stats.discontinued++
      onEvent({ type: 'discontinued', name: device.name })
    }
  }

  // one summary instead of a line per device: Apple rate limiting can hit dozens at once
  if (priceMissed.length > 0) {
    onEvent({ type: 'price-skipped', names: priceMissed })
  }

  fs.writeFileSync(target, JSON.stringify(data, null, 2))
  fs.writeFileSync(metaTarget, JSON.stringify({ syncedAt: now }, null, 2) + '\n')
  onEvent({
    type: 'done',
    total: data.length,
    ...stats,
    priceSkipped: priceMissed.length,
    requests: requests.count,
    failedRequests: requests.failed,
    target,
  })
  return data
}
