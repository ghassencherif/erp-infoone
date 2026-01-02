import 'dotenv/config';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

async function fetchProduct() {
  const baseUrl = process.env.PRESTASHOP_API_URL;
  const apiKey = process.env.PRESTASHOP_API_KEY;
  const url = `${baseUrl}/products/3980?display=full&ws_key=${apiKey}`;
  const res = await axios.get(url, { headers: { Accept: 'application/xml', 'Content-Type': 'application/xml' } });
  const parsed = parser.parse(res.data);
  const p = parsed.prestashop?.product;
  
  console.log('=== PrestaShop Product 3980 (Tapis de Souris) ===');
  console.log('Name:', p.name?.language?._text || p.name?.language?.['#text'] || p.name);
  console.log('Reference:', p.reference);
  console.log('Price (raw field):', p.price?.[0] || p.price);
  console.log('id_tax_rules_group:', p.id_tax_rules_group?.[0] || p.id_tax_rules_group);
  console.log('Active:', p.active);
}

fetchProduct().catch(console.error);
