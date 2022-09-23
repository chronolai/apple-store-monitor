const fs = require('fs');
const path = require('path');

const axios = require('axios');
const HTMLParser = require('node-html-parser');

const SHOP_URL = 'https://www.apple.com/tw/shop/product';

const urls = [
  'https://www.apple.com/tw/shop/buy-iphone/iphone-14-pro',
  'https://www.apple.com/tw/shop/buy-iphone/iphone-14',
  // 'https://www.apple.com/tw/shop/buy-iphone/iphone-13',
  // 'https://www.apple.com/tw/shop/buy-iphone/iphone-se',
  // 'https://www.apple.com/tw/shop/buy-iphone/iphone-12',
  // 'https://www.apple.com/tw/shop/buy-ipad/ipad-pro',
  // 'https://www.apple.com/tw/shop/buy-ipad/ipad-air',
  // 'https://www.apple.com/tw/shop/buy-ipad/ipad-10-2',
  // 'https://www.apple.com/tw/shop/buy-ipad/ipad-mini',
  // 'https://www.apple.com/tw/shop/buy-mac/macbook-pro',
];

const getLdJsons = (url) => {
  console.error(` => ${url}`);
  return axios.get(url).then((response) => {
    const html = response.data;
    const root = HTMLParser.parse(html);
    const results = root.querySelectorAll('[type="application/ld+json"]')
                          .map(item => JSON.parse(item.text))
                          .filter(json => json['@type'] === 'Product');
    return Promise.resolve(results);
  }).catch((err) => {
    console.error(err);
  });
};

async function main() {
  let data = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    const jsons = await getLdJsons(urls[i]);

    let products = [];
    jsons.forEach(({ offers, name: series }) => {
      offers.forEach(({ sku, price}) => {
        products.push({ series, sku, price });
      });
    });

    for (let j = 0; j < products.length; j++) {
      const product = products[j];
      const detail = await getLdJsons(`${SHOP_URL}/${product.sku}`);
      product.name = detail[0].name;
    }

    data = [...data, ...products];
  }
  console.error(data);

  const target = path.join(__dirname, '..', 'src', 'devcies.json');
  fs.writeFileSync(target, JSON.stringify(data, null, 2));
}

main();
