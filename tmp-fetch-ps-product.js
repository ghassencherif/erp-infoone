import 'dotenv/config';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const baseUrl = process.env.PRESTASHOP_API_URL;
const apiKey = process.env.PRESTASHOP_API_KEY;
const ref = 'SJ606-1-BK';

if (!baseUrl || !apiKey) {
  console.error('Missing PRESTASHOP_API_URL or PRESTASHOP_API_KEY');
  process.exit(1);
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

async function fetchProduct() {
  const url = `${baseUrl}/products?filter[reference]=[${encodeURIComponent(ref)}]&display=full&ws_key=${apiKey}`;
  const res = await axios.get(url, {
    headers: { Accept: 'application/xml', 'Content-Type': 'application/xml' },
    timeout: 60000,
  });
  const parsed = parser.parse(res.data);
  let products = parsed.prestashop?.products?.product;
  if (!Array.isArray(products)) products = products ? [products] : [];
  return products;
}

fetchProduct()
  .then((products) => {
    console.log('Products found:', products.length);
    for (const p of products) {
      const id = p.id?.[0] ?? p.id;
      const name = p.name?.language?._text || p.name?.language?.['#text'] || p.name?.language || p.name;
      const reference = p.reference;
      const price = p.price?.[0] || p.price;
      const stockId = p.associations?.stock_availables?.stock_available?.id || p.associations?.stock_availables?.stock_available?.[0]?.id;
      const taxRule = p.id_tax_rules_group;
      console.log({ id, name, reference, price, taxRule, stockId });
    }
  })
  .catch((err) => {
    console.error('Error fetching product:', err.message);
  });
