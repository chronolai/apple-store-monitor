import React from 'react'
import axios from 'axios'
import numeral from 'numeral'

import { MultiSelect } from 'react-multi-select-component'
import LoadingBar from 'react-top-loading-bar'

import useInterval from './hooks/useInterval'
import { decodeHash, encodeHash } from './lib/hash'
import { buildPickupUrl, transData } from './lib/pickup'

import Layout from './components/Layout'
import Table from './components/Table'

const maxSelected = 10
const refreshDelay = 10000
const retryDelay = 3000
const proxy = 'https://asm.chrono.tw/corsproxy/'

function StatusIndicator(props) {
  const color = props.status ? 'bg-green-500' : 'bg-red-500';
  return (
    <div className={`mx-5 p-1 w-px h-px rounded-full ${color}`} />
  );
}

function Label(props) {
  const { className = 'text-sky-600 bg-sky-200' } = props;
  return (
    <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded uppercase last:mr-0 mr-1 ${className}`}>
      {props.children}
    </span>
  );
}

const columns = [{
  header: 'Status',
  accessorKey: 'status',
  cell: (props) => {
    const stores = props.row.original.stores;
    const status = stores.some(store => store.status);
    return <StatusIndicator status={status} />;
  },
}, {
  header: 'Name',
  accessorKey: 'name',
}, {
  header: 'Price',
  accessorKey: 'price',
  cell: props => numeral(props.row.original.price).format('$0,0'),
  // }, {
  // header: 'SKU',
  // accessorKey: 'sku',
}, {
  header: 'Pick Up',
  accessorKey: 'stores',
  cell: (props) => {
    const stores = props.row.original.stores;
    return stores.map((store, index) => {
      return (
        <div key={index} className="flex flex-space items-center">
          <StatusIndicator status={store.status} />
          <div className="text-left">
            {store.store}: {store.quote}
          </div>
        </div>
      );
    });
  },
}, {
  header: '',
  accessorKey: 'cta',
  cell: (props) => {
    const stores = props.row.original.stores;
    const status = stores.some(store => store.status);

    const color = status ? 'bg-blue-500 hover:bg-blue-700' : 'bg-gray-400 hover:bg-gray-600';
    const text = status ? 'Buy' : 'View';
    return (
      <a
        className={`text-white font-bold py-1 px-2 rounded ${color}`}
        target="_blank"
        href={`https://www.apple.com/tw/shop/product/${props.row.original.sku}`}
      >
        {text}
      </a>
    );
  },
}];

function Monitor({ devices }) {
  const allOptions = React.useMemo(
    () =>
      devices
        .map(device => ({ label: device.name, value: device.sku }))
        .sort((a, b) => (a.label < b.label ? 1 : a.label > b.label ? -1 : 0)),
    [devices]
  )

  // SKUs in the hash that no longer exist (e.g. discontinued) are dropped.
  const [selected, setSelected] = React.useState(() =>
    decodeHash(window.location.hash)
      .map(sku => allOptions.find(option => option.value === sku))
      .filter(Boolean)
  )
  const [data, setData] = React.useState([])
  const [count, setCount] = React.useState(0)
  const [loading, setLoading] = React.useState(100)

  const codes = React.useMemo(() => selected.map(option => option.value), [selected])

  // when the limit is reached, disable the options that are not selected yet
  const options = React.useMemo(
    () =>
      selected.length >= maxSelected
        ? allOptions.map(o => ({ ...o, disabled: !codes.includes(o.value) }))
        : allOptions,
    [allOptions, selected, codes]
  )

  React.useEffect(() => {
    const hash = encodeHash(codes)
    history.replaceState(null, '', hash ? `#${hash}` : window.location.pathname + window.location.search)
  }, [codes])

  const controller = React.useRef(null)
  const retryTimer = React.useRef(null)

  const cancel = React.useCallback(() => {
    controller.current?.abort()
    controller.current = null
    clearTimeout(retryTimer.current)
  }, [])

  // `force` replaces the request in flight (selection changed); otherwise a
  // tick is skipped while the previous request is still pending.
  const load = (force = false) => {
    if (codes.length === 0) {
      cancel()
      setData([])
      setLoading(100)
      return
    }
    if (controller.current && !force) return

    cancel()
    const current = new AbortController()
    controller.current = current
    setLoading(0)

    const url = `${proxy}?apiurl=${encodeURIComponent(buildPickupUrl(codes))}`
    axios
      .get(url, { signal: current.signal })
      .then(resp => {
        setCount(c => c + 1)
        setData(transData(resp.data, codes, devices))
      })
      .catch(e => {
        if (axios.isCancel(e)) return
        console.error('Error:', e)
        retryTimer.current = setTimeout(() => load(true), retryDelay)
      })
      .finally(() => {
        // a replaced request must not clear the state of the one that replaced it
        if (controller.current === current) {
          controller.current = null
          setLoading(100)
        }
      })
  }

  React.useEffect(() => {
    load(true)
    return cancel
  }, [codes])

  useInterval(() => load(), refreshDelay)

  const customValueRenderer = selected =>
    selected.length
      ? selected.map(({ label }, index) => (
          <Label key={index} className="text-gray-600 bg-gray-200">
            {label}
          </Label>
        ))
      : 'No Items Selected'

  return (
    <Layout>
      <MultiSelect
        className="m-3"
        options={options}
        value={selected}
        onChange={setSelected}
        hasSelectAll={false}
        valueRenderer={customValueRenderer}
      />
      <div>
        <LoadingBar color="#0000FF" progress={loading} shadow />
        <Table data={data} columns={columns} />
      </div>
      <div className="text-right m-3">
        <Label>
          Selected: {codes.length} / {maxSelected}
        </Label>
        <Label>Count: {count}</Label>
      </div>
    </Layout>
  )
}

// The device list is large, so it is loaded as a separate chunk.
const App = () => {
  const [devices, setDevices] = React.useState(null)

  React.useEffect(() => {
    import('../data/devices.json').then(module => setDevices(module.default))
  }, [])

  if (!devices) {
    return (
      <Layout>
        <p className="m-3 text-gray-500">Loading…</p>
      </Layout>
    )
  }
  return <Monitor devices={devices} />
}

export default App
