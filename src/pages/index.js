import React from "react"
import axios from 'axios';

import LoadingBar from 'react-top-loading-bar'

import useInterval from '../hooks/useInterval';

import Layout from '../components/layout';
import Seo from '../components/seo';

import Table from '../components/Table';

import { beep } from '../utils';

const defaultDelay = 10000;
const defaultWorker = 'https://apple.info-tech6931.workers.dev/corsproxy/';
const defaultCodes = [
  'MMXN3TA/A',
  'MKGP3TA/A',

  'MQ9U3TA/A',
  'MQ9X3TA/A',
  'MQ9W3TA/A',
  'MQ9V3TA/A',

  'MQAF3TA/A',
  'MQAM3TA/A',
  'MQAJ3TA/A',
  'MQAH3TA/A',
];

const columns = [{
  header: 'Status',
  accessorKey: 'status',
  cell: (props) => {
    const color = props.row.original.status ? 'bg-green-500' : 'bg-red-500';
    return (
      <div className={`mx-auto p-1 w-px h-px rounded-full ${color}`} />
    );
  },
}, {
  header: 'Store',
  accessorKey: 'store',
}, {
  header: 'Code',
  accessorKey: 'code',
}, {
  header: 'Title',
  accessorKey: 'title',
}, {
  header: 'Quote',
  accessorKey: 'quote',
}, {
  header: '',
  accessorKey: 'code',
  cell: (props) => {
    const color = props.row.original.status ? 'bg-blue-500 hover:bg-blue-700' : 'bg-gray-400 hover:bg-gray-600';
    const text = props.row.original.status ? 'Buy' : 'View';
    return (
      <a
        className={`text-white font-bold py-1 px-2 rounded ${color}`}
        target="_blank"
        href={`https://www.apple.com/tw/shop/product/${props.row.original.code}`}
      >
        {text}
      </a>
    );
  },
}];

const IndexPage = () => {
  const [worker] = React.useState(defaultWorker);
  const [codes] = React.useState(defaultCodes);
  const [data, setData] = React.useState([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(100);

  React.useEffect(() => {
    loadAPI();
  }, []);

  useInterval(() => {
    loadAPI();
  }, defaultDelay);

  function loadAPI() {
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
      const newData = transData(resp.data);
      if (JSON.stringify(data) !== JSON.stringify(newData)) {
        beep(5);
      }
      setData(newData);
    }).finally(() => {
      setLoading(100);
    });
  }

  function transData(resp) {
    const data = [];
    (resp?.body?.stores??[]).forEach((store, index) => {
      Object.keys(store.partsAvailability).forEach((code) => {
        const device = store.partsAvailability[code];
        data.push({
          store: store.storeName,
          number: store.storeNumber,
          code,
          status: device.pickupDisplay === 'available',
          title: device.messageTypes.regular.storePickupProductTitle,
          quote: device.pickupSearchQuote,
        });
      });
    });
    return data;
  }

  return (
    <Layout>
      <div className="text-right">
        Count: {count}
      </div>
      <hr />
      <div className="relative">
        <LoadingBar
          color='#0000FF'
          progress={loading}
          shadow
        />
        <Table data={data} columns={columns} />
      </div>
    </Layout>
  )
}

export default IndexPage

export const Head = () => <Seo title="Home" />
