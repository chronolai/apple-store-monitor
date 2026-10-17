import React from 'react'
import { render, Box, Text } from 'ink'
import Spinner from 'ink-spinner'

import { sync } from './crawler.js'

const slugOf = (url) => url.split('/').slice(-2).join('/')

function PageRow({ page, current }) {
  const icon = {
    pending: <Text dimColor>·</Text>,
    running: <Text color="cyan"><Spinner type="dots" /></Text>,
    done: <Text color="green">✔</Text>,
    skipped: <Text color="yellow">–</Text>,
  }[page.status]
  const progress =
    page.status === 'pending'
      ? ''
      : page.status === 'skipped'
        ? `已下架(頁面導向 ${page.to})`
        : `${page.found}${page.total != null ? ` / ${page.total}` : ''}`

  return (
    <Box flexDirection="column">
      <Box>
        <Box width={2}>{icon}</Box>
        <Box width={28}><Text dimColor={page.status === 'pending'}>{slugOf(page.url)}</Text></Box>
        <Text>{progress}</Text>
      </Box>
      {page.status === 'running' && current && (
        <Box marginLeft={2}><Text dimColor>↳ {current}</Text></Box>
      )}
    </Box>
  )
}

function App() {
  const [pages, setPages] = React.useState([])
  const [current, setCurrent] = React.useState('')
  const [warnings, setWarnings] = React.useState([])
  const [notes, setNotes] = React.useState([])
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState(null)

  const patchPage = (url, patch) =>
    setPages(prev => prev.map(p => (p.url === url ? { ...p, ...patch } : p)))

  React.useEffect(() => {
    sync(event => {
      switch (event.type) {
        case 'pages':
          setPages(event.urls.map(url => ({ url, status: 'pending', found: 0, total: null })))
          break
        case 'page-start':
          patchPage(event.url, { status: 'running' })
          break
        case 'page-skipped':
          patchPage(event.url, { status: 'skipped', to: new URL(event.to, event.url).pathname })
          break
        case 'page-skus':
          patchPage(event.url, { total: event.total })
          break
        case 'product':
          patchPage(event.url, { found: event.found })
          setCurrent(event.name)
          break
        case 'page-done':
          patchPage(event.url, { status: 'done', found: event.found })
          break
        case 'price-change':
          setNotes(prev => [...prev, { color: 'cyan', text: `價格變更 ${event.name}:${event.from ?? '—'} → ${event.to}` }])
          break
        case 'added':
          setNotes(prev => [...prev, { color: 'green', text: `新增 ${event.name}` }])
          break
        case 'discontinued':
          setNotes(prev => [...prev, { color: 'magenta', text: `下架 ${event.name}` }])
          break
        case 'warning':
          setWarnings(prev => [...prev, event.message])
          break
        case 'done':
          setResult(event)
          break
      }
    }).catch(err => {
      process.exitCode = 1
      setError(err)
    })
  }, [])

  const finished = result || error

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>🍎 Apple Store Monitor · 同步商品資料</Text>
      <Box flexDirection="column" marginTop={1}>
        {pages.map(page => <PageRow key={page.url} page={page} current={current} />)}
      </Box>

      {notes.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {notes.map((n, i) => <Text key={i} color={n.color}>• {n.text}</Text>)}
        </Box>
      )}

      {warnings.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {warnings.map((w, i) => <Text key={i} color="yellow">⚠ {w}</Text>)}
        </Box>
      )}

      {result && (
        <Box marginTop={1}>
          <Text color="green">
            ✔ 完成:共 {result.total} 筆商品(新增 {result.added}、價格變更 {result.priceChanged}、新下架 {result.discontinued}),已寫入 {result.target}
          </Text>
        </Box>
      )}
      {error && (
        <Box marginTop={1}>
          <Text color="red">✖ 同步失敗:{error.message}</Text>
        </Box>
      )}
      {!finished && (
        <Box marginTop={1}>
          <Text dimColor>{pages.length === 0 ? '正在從 apple.com 取得商品頁清單…' : '同步中…'}</Text>
        </Box>
      )}
    </Box>
  )
}

render(<App />)
