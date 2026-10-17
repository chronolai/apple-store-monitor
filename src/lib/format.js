const priceFormat = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  maximumFractionDigits: 0,
})

export const formatPrice = price => (Number.isFinite(Number(price)) && price != null ? priceFormat.format(Number(price)) : '—')

export function formatAgo(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 5) return '剛剛'
  if (seconds < 60) return `${seconds} 秒前`
  return `${Math.floor(seconds / 60)} 分鐘前`
}
