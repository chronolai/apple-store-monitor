import React from "react"
import axios from 'axios';
import numeral from 'numeral';

import Select from 'react-select';
import LoadingBar from 'react-top-loading-bar'

import useInterval from '../hooks/useInterval';

import Layout from '../components/layout';
import Seo from '../components/seo';

import Table from '../components/Table';

import devices from '../devices.json';

const options = devices.map(device => ({ label: device.name, value: device.sku }));

const defaultMaxSelected = 10;
const defaultDelay = 10000;
const defaultWorker = 'https://asm.chrono.tw/corsproxy/';
const defaultCodes = [];
const defaultSelected = Array.from(Array(5)).map(v => options[Math.floor(Math.random() * options.length)]);

function StatusIndicator(props) {
  const color = props.status ? 'bg-green-500' : 'bg-red-500';
  return (
    <div className={`mx-5 p-1 w-px h-px rounded-full ${color}`} />
  );
}

function Label(props) {
  return (
    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded text-sky-600 bg-sky-200 uppercase last:mr-0 mr-1">
      {props.children}
    </span>
  );
}

const IndexPage = () => {
  const [worker] = React.useState(defaultWorker);
  const [codes, setCodes] = React.useState(defaultCodes);
  const [selected, setSelected] = React.useState(defaultSelected);

  const [data, setData] = React.useState([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(100);

  const columns = [{
    header: 'Status',
    accessorKey: 'status',
    cell: (props) => {
      const stores = props.row.original.stores;
      const status = stores.reduce((acc, val) => acc + (val.status ? 1 : 0), 0) > 0;
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
      const status = stores.reduce((acc, val) => acc + (val.status ? 1 : 0), 0) > 0;

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

  React.useEffect(() => {
    loadAPI();
  }, []);

  React.useEffect(() => {
    setCodes(selected.map(option => option.value));
  }, [selected]);

  React.useEffect(() => {
    loadAPI();
  }, [codes]);

  useInterval(() => {
    loadAPI();
  }, defaultDelay);

  function loadAPI() {
    if (codes.length === 0) {
      setData([]);
      return;
    }
    setLoading(0);
    const params = new URLSearchParams({
      pl: true,
      location: 330,
      ...codes.reduce((a, v, i) => ({ ...a, [`parts.${i}`]: v}), {}),
    }).toString();
    const url = `https://www.apple.com/tw/shop/retail/pickup-message?${params}`;
    const proxy = `${worker}?apiurl=${encodeURIComponent(url)}`;
    axios.get(proxy).then(resp => {
      setCount(count + 1);
      setData(transData(resp.data));
    }).finally(() => {
      setLoading(100);
    });
  }

  function findDevice(sku) {
    return devices.find(device => device.sku === sku);
  }

  function transData(resp) {
    const data = codes.map((code) => ({
      ...findDevice(code),
      stores: [],
    }));
    (resp?.body?.stores??[]).forEach((store, index) => {
      Object.keys(store.partsAvailability).forEach((code) => {
        const index = data.findIndex(item => item.sku === code);
        const device = store.partsAvailability[code];
        data[index].stores.push({
          store: store.storeName,
          number: store.storeNumber,
          code,
          status: device.pickupDisplay === 'available',
          name: device.messageTypes.regular.storePickupProductTitle,
          quote: device.pickupSearchQuote,
        });
      });
    });
    return data;
  }

  return (
    <Layout>
      <Select
        className="m-3"
        options={options}
        value={selected}
        onChange={(selected) => {
          setSelected(selected);
        }}
        isOptionDisabled={() => codes.length >= defaultMaxSelected}
        closeMenuOnSelect={false}
        isMulti
      />
      <div>
        <LoadingBar
          color='#0000FF'
          progress={loading}
          shadow
        />
        <Table data={data} columns={columns} />
      </div>
      <div className="text-right m-3">
        <Label>
          Selected: {codes.length} / {defaultMaxSelected}
        </Label>
        <Label>
          Count: {count}
        </Label>
      </div>
    </Layout>
  )
}

export default IndexPage

export const Head = () => <Seo title="Home" />
