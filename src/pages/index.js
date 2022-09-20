import React from "react"
import axios from 'axios';

import useInterval from '../hooks/useInterval';

import Layout from '../components/layout'
import Seo from '../components/seo'


const defaultWorker = 'https://apple.info-tech6931.workers.dev/corsproxy/';
const defaultCodes = [
  'MMXN3TA/A',

  'MQ9U3TA/A',
  'MQ9X3TA/A',
  'MQ9W3TA/A',
  'MQ9V3TA/A',

  'MQAF3TA/A',
  'MQAM3TA/A',
  'MQAJ3TA/A',
  'MQAH3TA/A',
];

const IndexPage = () => {
  const [worker, setWorker] = React.useState(defaultWorker);
  const [codes, setCodes] = React.useState(defaultCodes);
  const [resp, setResp] = React.useState({});
  const [data, setData] = React.useState([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadAPI();
  }, []);

  useInterval(() => {
    loadAPI();
  }, 60000);

  function loadAPI() {
    setLoading(true);
    const params = new URLSearchParams({
      pl: true,
      location: 330,
      ...codes.reduce((a, v, i) => ({ ...a, [`parts.${i}`]: v}), {}),
    }).toString();
    const url = `https://www.apple.com/tw/shop/retail/pickup-message?${params}`;
    const proxy = `${worker}?apiurl=${encodeURIComponent(url)}`;
    axios.get(proxy).then(resp => {
      setCount(count + 1);
      setResp(resp.data);
      setData(transData(resp.data));
    }).finally(() => {
      setLoading(false);
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
          status: device.pickupDisplay,
          title: device.messageTypes.regular.storePickupProductTitle,
          quote: device.pickupSearchQuote,
        });
      });
    });
    return data;
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold underline">
        Hello world! {count} - {loading ? 'T' : 'F'}
      </h1>
      <hr />
      {data.map((item, index) => {
        return (
          <div key={index}>
            {JSON.stringify(item)}
          </div>
        );
      })}
    </Layout>
  )
}

export default IndexPage

export const Head = () => <Seo title="Home" />
