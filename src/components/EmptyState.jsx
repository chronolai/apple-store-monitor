import React from 'react'

export default function EmptyState({ series, onPickSeries }) {
  return (
    <section className="rounded-lg border border-dashed border-gray-400 p-6 text-center">
      <h2 className="font-semibold">還沒有選擇要監控的機型</h2>
      <p className="mt-2 text-sm text-gray-700">
        從上方挑選最多 10 台,有貨時會即時通知你。也可以先從系列開始找:
      </p>
      <ul className="mt-4 flex flex-wrap justify-center gap-2">
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
