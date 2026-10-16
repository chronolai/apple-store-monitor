// Cloudflare Worker: CORS proxy for Apple's pickup availability API.
//
// Deploy by pasting this file (new_worker.js) into the Worker (module syntax), routed at
// https://asm.chrono.tw/corsproxy/.
//
// - Only the pickup-message endpoint is proxied (this used to be an open proxy).
// - Responses are cached for FRESH_MS so many users watching the same devices
//   share one upstream request, which keeps us under Apple's rate limit.
// - A failed or malformed upstream response is retried, and if Apple keeps
//   rejecting us, a cached copy up to STALE_MS old is served instead.
// - `X-Data-Age` (seconds) tells the client how old the data really is.

const PROXY_ENDPOINT = '/corsproxy/'
const ALLOWED_ENDPOINT = 'https://www.apple.com/tw/shop/retail/pickup-message'

const FRESH_MS = 3000
const STALE_MS = 60000
const RETRY_DELAYS = [150, 400]
const MAX_PARTS = 10
const SKU_PATTERN = /^[A-Z0-9]{4,14}\/[A-Z]$/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Expose-Headers': 'X-Data-Age, X-Stale',
  'Access-Control-Max-Age': '86400',
}

const upstreamHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
  Referer: 'https://www.apple.com/tw/shop/buy-iphone',
  Origin: 'https://www.apple.com',
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8', 'Cache-Control': 'no-store', ...corsHeaders },
  })
}

// Rebuild the upstream URL from validated parts only. SKUs are sorted so the
// same set of devices always maps to the same cache key.
function buildUpstreamUrl(apiUrl) {
  let target
  try {
    target = new URL(apiUrl)
  } catch {
    return null
  }
  if (target.origin + target.pathname !== ALLOWED_ENDPOINT) return null

  const parts = [...target.searchParams]
    .filter(([key]) => key.startsWith('parts.'))
    .map(([, value]) => value)
  const skus = [...new Set(parts)].sort()
  if (skus.length === 0 || skus.length > MAX_PARTS || !skus.every(sku => SKU_PATTERN.test(sku))) return null

  const location = target.searchParams.get('location') ?? '330'
  if (!/^\d{1,5}$/.test(location)) return null

  const params = new URLSearchParams({ pl: 'true', location })
  skus.forEach((sku, i) => params.set(`parts.${i}`, sku))
  return `${ALLOWED_ENDPOINT}?${params}`
}

// Apple sometimes answers 5xx, an error page, or an empty `{"body":{"content":{}}}`
// when it is throttling us. Only a response with a `stores` list counts as success.
async function fetchUpstream(url) {
  let lastError
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS[attempt - 1])
    try {
      const res = await fetch(url, { headers: upstreamHeaders })
      if (!res.ok) {
        lastError = new Error(`Upstream HTTP ${res.status}`)
        continue
      }
      const text = await res.text()
      if (Array.isArray(JSON.parse(text)?.body?.stores)) return text
      lastError = new Error('Upstream returned no stores')
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

function pickupResponse(text, ageMs, stale) {
  return new Response(text, {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Cache-Control': 'no-store',
      'X-Data-Age': String(Math.round(ageMs / 1000)),
      ...(stale ? { 'X-Stale': '1' } : {}),
      ...corsHeaders,
    },
  })
}

async function handlePickup(upstreamUrl, ctx) {
  const cache = caches.default
  const key = new Request(upstreamUrl)
  const cached = await cache.match(key)
  const ageOf = response => Date.now() - Number(response.headers.get('X-Cached-At'))

  if (cached && ageOf(cached) < FRESH_MS) {
    return pickupResponse(await cached.text(), ageOf(cached), false)
  }

  try {
    const text = await fetchUpstream(upstreamUrl)
    ctx.waitUntil(
      cache.put(
        key,
        new Response(text, {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Cache-Control': 'public, max-age=120',
            'X-Cached-At': String(Date.now()),
          },
        })
      )
    )
    return pickupResponse(text, 0, false)
  } catch (e) {
    if (cached && ageOf(cached) < STALE_MS) {
      return pickupResponse(await cached.text(), ageOf(cached), true)
    }
    return jsonResponse({ error: 'upstream_unavailable', message: String(e.message ?? e) }, 502)
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith(PROXY_ENDPOINT)) {
      return new Response('Not Found', { status: 404 })
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') ?? '*',
        },
      })
    }
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, OPTIONS' } })
    }

    const upstreamUrl = buildUpstreamUrl(url.searchParams.get('apiurl'))
    if (!upstreamUrl) {
      return jsonResponse({ error: 'invalid_request' }, 400)
    }
    return handlePickup(upstreamUrl, ctx)
  },
}
