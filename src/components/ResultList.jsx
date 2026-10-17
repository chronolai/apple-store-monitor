import React from 'react'

import { describe, groupBySeries, hasStock } from '../lib/devices'
import { formatPrice } from '../lib/format'

const HIGHLIGHT_MS = 60000

function StockBadge({ row }) {
  if (row.stores === null) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-sm text-gray-700">… 查詢中</span>
  }
  return hasStock(row) ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-sm font-semibold text-green-900">
      <span aria-hidden="true">✔</span> 有貨
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-sm text-gray-700">
      <span aria-hidden="true">✖</span> 無貨
    </span>
  )
}

function ChangeBadge({ change, now }) {
  if (!change || now - change.at > HIGHLIGHT_MS) return null
  return change.type === 'available' ? (
    <span className="ml-2 rounded bg-green-700 px-1.5 py-0.5 text-xs font-semibold text-white motion-safe:animate-pulse">
      剛剛有貨
    </span>
  ) : (
    <span className="ml-2 rounded bg-gray-600 px-1.5 py-0.5 text-xs font-semibold text-white">剛剛售完</span>
  )
}

function DeviceTitle({ row, change, now }) {
  return (
    <>
      <span className="font-medium">{row.capacity || row.name}</span>
      <span className="text-sm text-gray-700"> · {describe(row)}</span>
      <ChangeBadge change={change} now={now} />
    </>
  )
}

function StoreList({ stores }) {
  if (stores === null) return <span className="text-sm text-gray-700">查詢中…</span>
  if (stores.length === 0) return <span className="text-sm text-gray-700">沒有門市資料</span>

  // in-stock stores first
  const sorted = [...stores].sort((a, b) => Number(b.status) - Number(a.status))
  return (
    <ul className="text-sm">
      {sorted.map(store => (
        <li key={store.number} className={store.status ? 'font-medium text-green-900' : 'text-gray-700'}>
          <span aria-hidden="true">{store.status ? '✔ ' : '✖ '}</span>
          {store.store}:{store.quote}
        </li>
      ))}
    </ul>
  )
}

// Both actions are same-sized square icon buttons so the column lines up.
const iconButton =
  'inline-flex h-11 w-11 items-center justify-center rounded-md border md:h-8 md:w-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  className: 'h-5 w-5 md:h-4 md:w-4',
}

function RemoveButton({ row, onRemove }) {
  return (
    <button
      type="button"
      onClick={() => onRemove(row.sku)}
      title="移除"
      className={`${iconButton} border-gray-400 bg-white text-gray-700 hover:bg-gray-100`}
    >
      <svg {...iconProps}>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
      <span className="sr-only">移除 {row.name}</span>
    </button>
  )
}

function BuyLink({ row }) {
  const buy = hasStock(row)
  return (
    <a
      href={`https://www.apple.com/tw/shop/product/${row.sku}`}
      target="_blank"
      rel="noopener noreferrer"
      title={buy ? '前往購買' : '查看商品頁'}
      className={`${iconButton} border-transparent text-white ${
        buy ? 'bg-green-700 hover:bg-green-800' : 'bg-gray-600 hover:bg-gray-700'
      }`}
    >
      <svg {...iconProps}>
        {buy ? (
          <>
            <circle cx="9" cy="20" r="1" />
            <circle cx="19" cy="20" r="1" />
            <path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L22 7H6" />
          </>
        ) : (
          <>
            <path d="M14 4h6v6" />
            <path d="M20 4 10 14" />
            <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </>
        )}
      </svg>
      <span className="sr-only">
        {buy ? '前往購買' : '查看'} {row.name}(在新視窗開啟)
      </span>
    </a>
  )
}

const sorters = {
  status: (a, b) => Number(hasStock(b)) - Number(hasStock(a)),
  // rows are already grouped by series, so capacity is what tells them apart
  spec: (a, b) => a.capacityGB - b.capacityGB || a.color.localeCompare(b.color, 'zh-Hant'),
  // devices without a price sort last
  price: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || 0,
}

const columns = [
  { key: 'status', label: '狀態', fit: true },
  { key: 'spec', label: '規格' },
  { key: 'price', label: '價格', fit: true },
  { key: null, label: '門市取貨' },
  { key: null, label: '操作', fit: true },
]

export default function ResultList({ rows, seriesOrder, changes, now, onRemove }) {
  const [sort, setSort] = React.useState({ key: 'status', dir: 'asc' })

  // Same grouping as the device picker: one block per series, newest series first.
  const groups = React.useMemo(() => {
    const compare = sorters[sort.key]
    const sign = sort.dir === 'asc' ? 1 : -1
    const rank = series => {
      const index = seriesOrder.indexOf(series)
      return index === -1 ? seriesOrder.length : index
    }
    return groupBySeries(rows)
      .map(({ series, items }) => ({ series, items: [...items].sort((a, b) => sign * compare(a, b)) }))
      .sort((a, b) => rank(a.series) - rank(b.series))
  }, [rows, seriesOrder, sort])

  const toggleSort = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  const highlight = row => {
    const change = changes[row.sku]
    return change?.type === 'available' && now - change.at <= HIGHLIGHT_MS
  }

  return (
    <section aria-labelledby="results-title">
      <h2 id="results-title" className="sr-only">
        監控結果
      </h2>

      {/* md and up: table */}
      <table className="hidden w-full border-collapse text-left md:table">
        <caption className="sr-only">監控結果,依系列分組,可依狀態、規格、價格排序</caption>
        <thead>
          <tr className="border-b border-gray-300 bg-gray-100 text-sm">
            {columns.map(({ key, label, fit }) => (
              <th
                key={label}
                scope="col"
                aria-sort={key && sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={`px-3 py-1 font-semibold ${fit ? 'w-px whitespace-nowrap' : ''}`}
              >
                {key ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="min-h-11 font-semibold md:min-h-8 focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    {label}
                    <span aria-hidden="true">{sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</span>
                  </button>
                ) : (
                  label
                )}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map(({ series, items }) => (
          <tbody key={series}>
            <tr className="border-b border-gray-300 bg-gray-100">
              <th scope="colgroup" colSpan={columns.length} className="px-3 py-1.5 text-left text-sm font-bold">
                {series}
              </th>
            </tr>
            {items.map(row => (
              <tr key={row.sku} className={`border-b border-gray-200 align-top ${highlight(row) ? 'bg-green-50' : ''}`}>
                <td className="whitespace-nowrap px-3 py-1.5">
                  <StockBadge row={row} />
                </td>
                <td className="px-3 py-1.5">
                  <DeviceTitle row={row} change={changes[row.sku]} now={now} />
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">{formatPrice(row.price)}</td>
                <td className="px-3 py-1.5">
                  <StoreList stores={row.stores} />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex gap-1.5">
                    <BuyLink row={row} />
                    <RemoveButton row={row} onRemove={onRemove} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      {/* below md: cards */}
      <div className="space-y-3 md:hidden">
        {groups.map(({ series, items }) => (
          <section key={series} aria-label={series}>
            <h3 className="mb-1.5 rounded bg-gray-100 px-2.5 py-1 text-sm font-bold">{series}</h3>
            <ul className="space-y-2">
              {items.map(row => (
                <li
                  key={row.sku}
                  className={`rounded-lg border p-2.5 ${highlight(row) ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <DeviceTitle row={row} change={changes[row.sku]} now={now} />
                      <div className="mt-1 text-sm tabular-nums">{formatPrice(row.price)}</div>
                    </div>
                    <StockBadge row={row} />
                  </div>
                  <div className="mt-2">
                    <StoreList stores={row.stores} />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <BuyLink row={row} />
                    <RemoveButton row={row} onRemove={onRemove} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  )
}
