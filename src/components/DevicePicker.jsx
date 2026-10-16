import React from 'react'

import { describe, groupBySeries } from '../lib/devices'
import { formatPrice } from '../lib/format'

export const field =
  'min-h-11 rounded-md border border-gray-400 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'

const unique = (devices, key) => [...new Set(devices.map(d => d[key]).filter(Boolean))]

export const emptyFilters = { query: '', series: '', capacity: '', color: '', selectedOnly: false }

// Modal for choosing which devices to monitor. A native <dialog> gives us the
// focus trap, Esc to close and an inert background for free.
export default function DevicePicker({ devices, codes, max, filters, onFilters, open, onClose, onToggle, onClear }) {
  const dialog = React.useRef(null)

  React.useEffect(() => {
    const el = dialog.current
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
    document.documentElement.style.overflow = open ? 'hidden' : ''
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [open])

  const seriesOptions = React.useMemo(() => unique(devices, 'series'), [devices])
  const capacityOptions = React.useMemo(
    () =>
      [...devices]
        .sort((a, b) => a.capacityGB - b.capacityGB)
        .map(d => d.capacity)
        .filter((v, i, a) => v && a.indexOf(v) === i),
    [devices]
  )
  const colorOptions = React.useMemo(
    () => unique(devices, 'color').sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [devices]
  )

  const groups = React.useMemo(() => {
    const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const matched = devices.filter(
      d =>
        (!filters.selectedOnly || codes.includes(d.sku)) &&
        (!filters.series || d.series === filters.series) &&
        (!filters.capacity || d.capacity === filters.capacity) &&
        (!filters.color || d.color === filters.color) &&
        terms.every(term => d.name.toLowerCase().includes(term))
    )
    return { list: groupBySeries(matched), count: matched.length }
  }, [devices, filters, codes])

  const full = codes.length >= max
  const filtered = Boolean(filters.query || filters.series || filters.capacity || filters.color || filters.selectedOnly)
  const set = patch => onFilters({ ...filters, ...patch })

  return (
    <dialog
      ref={dialog}
      aria-labelledby="picker-title"
      onClose={onClose}
      onClick={e => e.target === dialog.current && onClose()}
      className="m-0 h-dvh max-h-none w-dvw max-w-none bg-white p-0 text-gray-900 backdrop:bg-black/50 sm:m-auto sm:h-auto sm:max-h-[85dvh] sm:w-full sm:max-w-2xl sm:rounded-xl"
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 p-4">
          <h2 id="picker-title" className="text-lg font-semibold">
            選擇機型
            <span className="ml-2 text-sm font-normal text-gray-700">
              已選 {codes.length} / {max}
            </span>
          </h2>
          <button type="button" onClick={onClose} aria-label="關閉" className={`${field} w-11 px-0 hover:bg-gray-100`}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="space-y-2 border-b border-gray-200 p-4">
          <label className="block">
            <span className="sr-only">搜尋機型</span>
            <input
              type="search"
              value={filters.query}
              onChange={e => set({ query: e.target.value })}
              placeholder="搜尋,例如:iPad Air 256 藍"
              className={`${field} w-full`}
            />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.selectedOnly}
                onChange={e => set({ selectedOnly: e.target.checked })}
                className="h-5 w-5 accent-blue-700"
              />
              只顯示已選
            </label>
            <button
              type="button"
              disabled={!filtered}
              onClick={() => onFilters(emptyFilters)}
              className={`${field} hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400`}
            >
              重設篩選
            </button>
          </div>
          <p className="text-sm text-gray-700" role="status" aria-live="polite">
            符合 {groups.count} 項{full ? `(已達上限 ${max} 台,請先取消其他機型)` : ''}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {groups.list.map(({ series, items }) => (
            <fieldset key={series} className="border-b border-gray-200">
              <legend className="sticky top-0 z-10 w-full bg-gray-100 px-4 py-1.5 text-sm font-semibold">{series}</legend>
              <ul>
                {items.map(d => {
                  const checked = codes.includes(d.sku)
                  const disabled = full && !checked
                  return (
                    <li key={d.sku}>
                      <label
                        className={`flex min-h-11 items-center gap-3 px-4 py-2 text-sm ${
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

        <div className="flex items-center justify-between gap-2 border-t border-gray-200 p-4">
          <button
            type="button"
            disabled={codes.length === 0}
            onClick={onClear}
            className={`${field} hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400`}
          >
            清除全部
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md bg-blue-700 px-6 py-2 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            完成
          </button>
        </div>
      </div>
    </dialog>
  )
}
