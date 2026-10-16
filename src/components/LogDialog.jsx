import React from 'react'

import { field } from './DevicePicker'

const timeFormat = new Intl.DateTimeFormat('zh-TW', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

// Hidden stock-change log, opened with the "L" key.
export default function LogDialog({ log, open, onClose, onClear }) {
  const dialog = React.useRef(null)

  React.useEffect(() => {
    const el = dialog.current
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="log-title"
      onClose={onClose}
      onClick={e => e.target === dialog.current && onClose()}
      className="m-0 h-dvh max-h-none w-dvw max-w-none bg-white p-0 text-gray-900 backdrop:bg-black/50 sm:m-auto sm:h-auto sm:max-h-[85dvh] sm:w-full sm:max-w-2xl sm:rounded-xl"
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 p-4">
          <h2 id="log-title" className="text-lg font-semibold">
            庫存變化紀錄
            <span className="ml-2 text-sm font-normal text-gray-700">{log.length} 筆</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="關閉" className={`${field} w-11 px-0 hover:bg-gray-100`}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {log.length === 0 ? (
            <p className="p-4 text-sm text-gray-700">
              開啟頁面後尚無庫存變化。每次更新都會與上一次比對,有變動才會記在這裡(重新整理頁面會清空)。
            </p>
          ) : (
            <ul>
              {log.map(entry => (
                <li key={entry.id} className="flex items-start gap-3 border-b border-gray-200 px-4 py-2 text-sm">
                  <time dateTime={new Date(entry.at).toISOString()} className="w-28 shrink-0 tabular-nums text-gray-700">
                    {timeFormat.format(entry.at)}
                  </time>
                  <span
                    className={`w-16 shrink-0 font-semibold ${entry.type === 'available' ? 'text-green-900' : 'text-gray-700'}`}
                  >
                    <span aria-hidden="true">{entry.type === 'available' ? '✔ ' : '✖ '}</span>
                    {entry.type === 'available' ? '有貨' : '售完'}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{entry.device}</span>
                    <span className="text-gray-700"> · {entry.detail}</span>
                    <span className="block text-gray-700">
                      {entry.store}
                      {entry.type === 'available' && entry.quote ? `:${entry.quote}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-200 p-4">
          <button
            type="button"
            disabled={log.length === 0}
            onClick={onClear}
            className={`${field} hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400`}
          >
            清除紀錄
          </button>
          <p className="text-xs text-gray-600">按 L 或 Esc 關閉</p>
        </div>
      </div>
    </dialog>
  )
}
