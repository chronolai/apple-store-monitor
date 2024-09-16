const fs = require('fs');
const path = require('path');

const axios = require('axios');
const { setupCache } = require('axios-cache-interceptor');
const HTMLParser = require('node-html-parser');

// const request = setupCache(axios, { ttl: 1000 * 60 * 60 * 24 });
const request = axios;

const SEO_URL = 'https://www.apple.com/tw/shop/updateSEO';

const urls = [
  'https://www.apple.com/tw/shop/buy-iphone/iphone-16-pro',
  'https://www.apple.com/tw/shop/buy-iphone/iphone-16',
  'https://www.apple.com/tw/shop/buy-iphone/iphone-15',
  'https://www.apple.com/tw/shop/buy-iphone/iphone-14',
  'https://www.apple.com/tw/shop/buy-iphone/iphone-se',
  'https://www.apple.com/tw/shop/buy-ipad/ipad-pro',
  'https://www.apple.com/tw/shop/buy-ipad/ipad-air',
  'https://www.apple.com/tw/shop/buy-ipad/ipad',
  'https://www.apple.com/tw/shop/buy-ipad/ipad-mini',
  'https://www.apple.com/tw/shop/buy-mac/macbook-pro',
];

const queryHTML = (html, selector) => {
  return HTMLParser.parse(html).querySelectorAll(selector);
};

const getSKUsV1 = (html) => {
  let skus = [];
  const v1 = queryHTML(html, '[type="application/ld+json"]').map(item => JSON.parse(item.text)).filter(json => json['@type'] === 'Product');
  v1.forEach(p => {
    p.offers.forEach(o => {
      if (o['@type'] === 'Offer') {
        skus.push(o.sku);
      }
    });
  });
  return skus;
};

const getSKUsV2 = (html) => {
  let skus = [];
  const v2 = queryHTML(html, 'script').map(s => s.text).filter(t => t.includes('PRODUCT_SELECTION_BOOTSTRAP'));
  if (v2.length > 0) {
    const content = v2[0].split('\n')[2].replace('        productSelectionData: ', '')
    skus = JSON.parse(content).products.map(p => p.partNumber);
  }
  return skus;
};

async function main() {
  let data = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.error(` => ${url}`);
    const html = await request.get(url).then((response) => response.data);

    const skus = [
      ...getSKUsV1(html),
      ...getSKUsV2(html),
    ];

    const seos = skus.map((sku) => {
      const refererUrl = 'https://www.apple.com/';
      const params = new URLSearchParams({ m: JSON.stringify({ product: sku, refererUrl }) }).toString();
      const seoUrl = `${SEO_URL}?${params}`;
      return seoUrl;
    });

    for (const seo of seos) {
      const productHtml = await request.get(seo).then((response) => response.data);
      console.error(` ==> ${seo}`, productHtml);
      const microdataList = productHtml.body.marketingData.microdataList.filter(m => JSON.parse(m)['@type'] === 'Product');
      if (microdataList.length === 1) {
        const microdata = JSON.parse(microdataList[0]);
        microdata.name = microdata.name.replaceAll(' ', ' ');
        microdata.sku = microdata.offers[0].sku;
        microdata.price = microdata.offers[0].price;
        microdata.priceCurrency = microdata.offers[0].priceCurrency;
        microdata.seoUrl = seo;
        delete microdata['@context'];
        delete microdata['@type'];
        delete microdata['mainEntityOfPage'];
        delete microdata['offers'];
        data.push(microdata);

        if (microdataList.length > 1) {
          console.error("[WARINING]: ", microdataList);
        }
        if (!seo.includes(encodeURIComponent(microdata.sku))) {
          console.error("[WARINING]: ", microdata.sku, seo);
        }
      }
    };
  }

  const target = path.join(__dirname, '..', 'src', 'devices.json');
  fs.writeFileSync(target, JSON.stringify(data, null, 2));
}

main();
