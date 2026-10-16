import React from 'react'

export default function EmptyState({ series, onOpen, onPickSeries }) {
  return (
    <section className="rounded-lg border border-dashed border-gray-400 p-6 text-center">
      <h2 className="font-semibold">還沒有選擇要監控的機型</h2>
      <p className="mt-2 text-sm text-gray-700">
        最多可同時監控 10 台,有貨時會即時通知你。
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 min-h-11 rounded-md bg-blue-700 px-6 py-2 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        選擇機型
      </button>
      <p className="mt-4 text-sm text-gray-700">或從系列開始找:</p>
      <ul className="mt-2 flex flex-wrap justify-center gap-2">
        {series.map(name => (
          <li key={name}>
            <button
              type="button"
              onClick={() => onPickSeries(name)}
              className="min-h-11 rounded-full border border-gray-400 bg-white px-4 py-2 text-sm hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
