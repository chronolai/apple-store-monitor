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

const target = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'devices.json')

const queryHTML = (html, selector) => HTMLParser.parse(html).querySelectorAll(selector)

const getSKUsV1 = (html) => {
  const skus = []
  const v1 = queryHTML(html, '[type="application/ld+json"]')
    .map(item => JSON.parse(item.text))
    .filter(json => json['@type'] === 'Product')
  v1.forEach(p => {
    p.offers.forEach(o => {
      if (o['@type'] === 'Offer') {
        skus.push(o.sku)
      }
    })
  })
  return skus
}

const getSKUsV2 = (html) => {
  let skus = []
  const v2 = queryHTML(html, 'script').map(s => s.text).filter(t => t.includes('PRODUCT_SELECTION_BOOTSTRAP'))
  if (v2.length > 0) {
    const content = v2[0].split('\n')[2].replace('        productSelectionData: ', '')
    skus = JSON.parse(content).products.map(p => p.partNumber)
  }
  return skus
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
    const html = await axios.get(hub).then(r => r.data)
    const pattern = new RegExp(`/tw/shop/${category}/${category.replace('buy-', '')}[a-z0-9-]*(?=["'?#/])`, 'g')
    for (const match of html.matchAll(pattern)) {
      found.add(ORIGIN + match[0])
    }
  }
  return [...found]
}

/**
 * Crawl every product page and write src/devices.json.
 * Progress is reported through `onEvent` so any UI can render it.
 */
export async function sync(onEvent = () => {}) {
  const data = []

  onEvent({ type: 'discover' })
  const urls = await discoverUrls()
  onEvent({ type: 'pages', urls })

  for (const url of urls) {
    onEvent({ type: 'page-start', url })
    const html = await axios.get(url).then(r => r.data)
    const skus = [...getSKUsV1(html), ...getSKUsV2(html)]
    onEvent({ type: 'page-skus', url, total: skus.length })

    let found = 0
    for (const sku of skus) {
      const seo = seoUrlOf(sku)
      const res = await axios.get(seo).then(r => r.data)
      const marketing = res.body.marketingData
      const products = marketing.microdataList.filter(m => JSON.parse(m)['@type'] === 'Product')
      if (products.length !== 1) {
        onEvent({ type: 'warning', message: `${sku}: 預期 1 筆 Product,實際 ${products.length} 筆` })
        continue
      }

      const microdata = JSON.parse(products[0])
      const offer = microdata.offers[0]
      microdata.name = microdata.name.replaceAll(' ', ' ')
      microdata.sku = offer.sku
      microdata.price = offer.price
      microdata.priceCurrency = offer.priceCurrency
      microdata.seoUrl = seo
      delete microdata['@context']
      delete microdata['@type']
      delete microdata['mainEntityOfPage']
      delete microdata['offers']
      data.push(microdata)
      found++

      if (!seo.includes(encodeURIComponent(microdata.sku))) {
        onEvent({ type: 'warning', message: `${microdata.sku}: SEO 網址與 SKU 不符` })
      }
      onEvent({ type: 'product', url, name: microdata.name, found, total: skus.length })
    }
    onEvent({ type: 'page-done', url, found })
  }

  fs.writeFileSync(target, JSON.stringify(data, null, 2))
  onEvent({ type: 'done', total: data.length, target })
  return data
}
