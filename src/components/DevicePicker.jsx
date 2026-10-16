import React from 'react'

import { describe, groupBySeries, shortName } from '../lib/devices'
import { formatPrice } from '../lib/format'

const field =
  'min-h-11 rounded-md border border-gray-400 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'

const unique = (devices, key) => [...new Set(devices.map(d => d[key]).filter(Boolean))]

export const emptyFilters = { query: '', series: '', capacity: '', color: '' }

export default function DevicePicker({
  devices,
  codes,
  max,
  filters,
  onFilters,
  open,
  onOpen,
  onToggle,
  onClear,
}) {
  const seriesOptions = React.useMemo(() => unique(devices, 'series'), [devices])
  const capacityOptions = React.useMemo(
    () => [...devices].sort((a, b) => a.capacityGB - b.capacityGB).map(d => d.capacity).filter((v, i, a) => v && a.indexOf(v) === i),
    [devices]
  )
  const colorOptions = React.useMemo(() => unique(devices, 'color').sort((a, b) => a.localeCompare(b, 'zh-Hant')), [devices])

  const groups = React.useMemo(() => {
    const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const matched = devices.filter(
      d =>
        (!filters.series || d.series === filters.series) &&
        (!filters.capacity || d.capacity === filters.capacity) &&
        (!filters.color || d.color === filters.color) &&
        terms.every(term => d.name.toLowerCase().includes(term))
    )
    return { list: groupBySeries(matched), count: matched.length }
  }, [devices, filters])

  const selected = codes.map(code => devices.find(d => d.sku === code)).filter(Boolean)
  const full = codes.length >= max
  const filtered = Object.values(filters).some(Boolean)
  const set = patch => onFilters({ ...filters, ...patch })

  return (
    <section aria-labelledby="picker-title" className="rounded-lg border border-gray-300 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <h2 id="picker-title" className="font-semibold">
          選擇機型 <span className="ml-1 text-sm font-normal text-gray-700">已選 {codes.length} / {max}</span>
        </h2>
        <div className="flex gap-2">
          {codes.length > 0 && (
            <button type="button" onClick={onClear} className={`${field} hover:bg-gray-100`}>
              清除全部
            </button>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="picker-body"
            onClick={() => onOpen(!open)}
            className={`${field} hover:bg-gray-100`}
          >
            {open ? '收合清單' : '展開清單'}
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-3 pb-3" aria-label="已選擇的機型">
          {selected.map(d => (
            <li key={d.sku} className="flex items-center rounded-full bg-sky-100 pl-3 text-sm text-sky-900">
              <span>
                {shortName(d)} · {d.color}
              </span>
              <button
                type="button"
                aria-label={`移除 ${d.name}`}
                onClick={() => onToggle(d.sku)}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full hover:bg-sky-200 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div id="picker-body" className="border-t border-gray-200 p-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <label className="sm:col-span-4">
              <span className="sr-only">搜尋機型</span>
              <input
                type="search"
                value={filters.query}
                onChange={e => set({ query: e.target.value })}
                placeholder="搜尋,例如:iPad Air 256 藍"
                className={`${field} w-full`}
              />
            </label>
            {[
              ['series', '系列', seriesOptions],
              ['capacity', '容量', capacityOptions],
              ['color', '顏色', colorOptions],
            ].map(([key, label, options]) => (
              <label key={key} className="flex flex-col gap-1 text-sm text-gray-700">
                {label}
                <select value={filters[key]} onChange={e => set({ [key]: e.target.value })} className={field}>
                  <option value="">全部</option>
                  {options.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <div className="flex items-end">
              <button
                type="button"
                disabled={!filtered}
                onClick={() => onFilters(emptyFilters)}
                className={`${field} w-full hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400`}
              >
                重設篩選
              </button>
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-700" role="status" aria-live="polite">
            符合 {groups.count} 項{full ? `(已達上限 ${max} 台,請先移除其他機型)` : ''}
          </p>

          <div className="mt-2 max-h-96 overflow-y-auto rounded-md border border-gray-200">
            {groups.list.map(({ series, items }) => (
              <fieldset key={series} className="border-b border-gray-200 last:border-b-0">
                <legend className="sticky top-0 w-full bg-gray-100 px-3 py-1.5 text-sm font-semibold">
                  {series}
                </legend>
                <ul>
                  {items.map(d => {
                    const checked = codes.includes(d.sku)
                    const disabled = full && !checked
                    return (
                      <li key={d.sku}>
                        <label
                          className={`flex min-h-11 items-center gap-3 px-3 py-2 text-sm ${
                            disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => onToggle(d.sku)}
                            className="h-5 w-5 shrink-0 accent-blue-700"
                          />
                          <span className="flex-1">
                            {d.capacity} · {describe(d)}
                          </span>
                          <span className="tabular-nums">{formatPrice(d.price)}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
            ))}
            {groups.count === 0 && <p className="p-4 text-sm text-gray-700">沒有符合的機型,請調整篩選條件。</p>}
          </div>
        </div>
      )}
    </section>
  )
}
