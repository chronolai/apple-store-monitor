import React from 'react'

import { formatAgo } from '../lib/format'

function ConnectionStatus({ monitoring, failures, error, lastUpdated, now }) {
  let tone = 'bg-gray-400'
  let text = '尚未開始監控'
  if (monitoring) {
    if (failures > 0) {
      tone = 'bg-amber-500'
      text = `連線不穩,重試中(第 ${failures} 次${error ? `・${error}` : ''})`
    } else if (lastUpdated) {
      tone = 'bg-green-600'
      text = '連線正常'
    } else {
      tone = 'bg-sky-500'
      text = '查詢中…'
    }
  }
  return (
    <p className="flex items-center gap-2">
      <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-full ${tone}`} />
      <span>
        {text}
        {monitoring && lastUpdated ? ` · 最後更新 ${formatAgo(now - lastUpdated)}` : ''}
      </span>
    </p>
  )
}

const actionButton =
  'min-h-11 rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:min-h-9 md:py-1'

export default function Header({
  total,
  max,
  inStock,
  announcement,
  alertsOn,
  permission,
  onToggleAlerts,
  onOpenPicker,
  ...connection
}) {
  const hint =
    !alertsOn || permission === 'granted' || permission === 'default'
      ? ''
      : permission === 'denied'
        ? '瀏覽器已封鎖通知,請到網址列的網站設定開啟;目前只會播放提示音並更新分頁標題。'
        : '此瀏覽器不支援系統通知,只會播放提示音並更新分頁標題。'

  return (
    <header className="pb-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-lg font-bold">Apple Store 取貨監控</h1>
          <p className="text-sm text-gray-700">
            {total === 0 ? '選擇機型後開始監控' : `監控中 ${total} 台 · 有貨 ${inStock} 台`}
          </p>
          <div className="text-sm text-gray-700">
            <ConnectionStatus monitoring={total > 0} {...connection} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <button
              type="button"
              onClick={onOpenPicker}
              className={`${actionButton} border-gray-400 bg-white text-gray-800 hover:bg-gray-100`}
            >
              ＋ 選擇機型({total} / {max})
            </button>
          )}
          <button
            type="button"
            aria-pressed={alertsOn}
            onClick={onToggleAlerts}
            className={`${actionButton} ${
              alertsOn ? 'border-blue-700 bg-blue-700 text-white' : 'border-gray-400 bg-white text-gray-800 hover:bg-gray-100'
            }`}
          >
            {alertsOn ? '🔔 有貨通知:開' : '🔕 有貨通知:關'}
          </button>
        </div>
      </div>
      {hint && <p className="mt-1 text-right text-xs text-gray-600">{hint}</p>}
      {/* announced to screen readers only when it changes, not every second */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </header>
  )
}
