import React from 'react'
import { render, Box, Text } from 'ink'
import Spinner from 'ink-spinner'

import { sync } from './crawler.js'

// Segments: green = ok, yellow = ok but no price, red = failed, dim = still to go.
function ProgressBar({ ok, noPrice, failed, expected, width = 20 }) {
  const cells = n => Math.max(0, Math.round((n / expected) * width))
  const green = cells(ok)
  const yellow = cells(noPrice)
  const red = cells(failed)
  const rest = Math.max(0, width - green - yellow - red)
  // must stay inline (no Box) so it can sit inside a single line of text
  return (
    <>
      <Text color="green">{'█'.repeat(green)}</Text>
      <Text color="yellow">{'█'.repeat(yellow)}</Text>
      <Text color="red">{'█'.repeat(red)}</Text>
      <Text dimColor>{'░'.repeat(rest)}</Text>
    </>
  )
}

const slugOf = (url) => url.split('/').slice(-2).join('/')

function PageRow({ page, current }) {
  const icon = {
    pending: <Text dimColor>·</Text>,
    running: <Text color="cyan"><Spinner type="dots" /></Text>,
    done: <Text color="green">✔</Text>,
    scanning: <Text color="cyan"><Spinner type="dots" /></Text>,
    scanned: <Text dimColor>○</Text>,
    skipped: <Text color="yellow">–</Text>,
  }[page.status]
  const progress =
    page.status === 'pending'
      ? ''
      : page.status === 'skipped'
        ? `已下架(頁面導向 ${page.to})`
        : page.status === 'scanning' || page.status === 'scanned'
          ? page.total != null ? `${page.total} 個型號` : ''
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
  const [requests, setRequests] = React.useState({ count: 0, failed: 0 })
  const [skipped, setSkipped] = React.useState([])
  const [expected, setExpected] = React.useState(null)
  const [noPrice, setNoPrice] = React.useState(0) // requests that succeeded but carried no price
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
        case 'scan-start':
          patchPage(event.url, { status: 'scanning' })
          break
        case 'page-skus':
          patchPage(event.url, { status: 'scanned', total: event.total })
          break
        case 'no-price':
          setNoPrice(n => n + 1)
          break
        case 'plan':
          setExpected(event.expected)
          break
        case 'product':
          patchPage(event.url, { found: event.found })
          setCurrent(event.name)
          break
        case 'page-done':
          patchPage(event.url, { status: 'done', found: event.found })
          break
        case 'request':
          setRequests({ count: event.count, failed: event.failed })
          break
        case 'price-skipped':
          setSkipped(event.names)
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

      {requests.count > 0 && (
        <Box marginTop={1}>
          <Text>
            {expected && (
              <>
                <ProgressBar
                  ok={requests.count - requests.failed - noPrice}
                  noPrice={noPrice}
                  failed={requests.failed}
                  expected={expected}
                />{' '}
              </>
            )}
            已發出 {requests.count}
            {expected ? ` / 預估 ${expected}` : ''} 個請求:
            <Text color="green"> 成功 {requests.count - requests.failed - noPrice}</Text>
            <Text color="yellow"> · 沒取到價格 {noPrice}</Text>
            <Text color={requests.failed > 0 ? 'red' : undefined} dimColor={requests.failed === 0}>
              {' '}· 失敗 {requests.failed}
            </Text>
          </Text>
        </Box>
      )}

      {notes.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {notes.map((n, i) => <Text key={i} color={n.color}>• {n.text}</Text>)}
        </Box>
      )}

      {skipped.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">⚠ {skipped.length} 個型號這次沒取到價格,沿用舊價格:</Text>
          {skipped.map((name, i) => <Text key={i} color="yellow" dimColor>  · {name}</Text>)}
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
            ✔ 完成:共 {result.total} 筆商品(新增 {result.added}、價格變更 {result.priceChanged}、新下架 {result.discontinued}、價格未更新 {result.priceSkipped})
            {'\n'}發出 {result.requests} 個請求(失敗 {result.failedRequests}),已寫入 {result.target}
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
