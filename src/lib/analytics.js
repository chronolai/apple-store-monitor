const MEASUREMENT_ID = 'G-6TXVJSZDZ0'

// Only production traffic is counted, not `pnpm dev` on localhost.
export function initAnalytics() {
  if (!import.meta.env.PROD) return

  window.dataLayer = window.dataLayer || []
  window.gtag = function () {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', MEASUREMENT_ID)

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  document.head.appendChild(script)
}
