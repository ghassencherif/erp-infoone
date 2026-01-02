const axios = require('axios');

const trackingNumber = '582269900000';
const apiKey = 'a03e7b52-d4de-4312-acac-12aaa17aba06';
const baseUrl = 'https://www.firstdeliverygroup.com/api/v2';

// Test different header formats
const authFormats = [
  { header: `Bearer ${apiKey}`, label: 'Bearer token' },
  { header: apiKey, label: 'Plain key' },
  { header: `Key ${apiKey}`, label: 'Key prefix' },
  { header: `${apiKey}`, label: 'UUID only' }
];

async function testFD(authHeader, label) {
  try {
    console.log(`Testing ${label}...`);
    const resp = await axios.post(
      `${baseUrl}/etat`,
      { barCode: trackingNumber },
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log(`✅ ${label}: Success`);
    console.log(`   Status: ${resp.data.status || resp.data.state}`);
    if (resp.data.result) console.log(`   Result:`, JSON.stringify(resp.data.result).substring(0, 100));
  } catch (e) {
    if (e.response) {
      console.log(`❌ ${label}: HTTP ${e.response.status} - ${e.response.data?.message || e.message}`);
    } else {
      console.log(`❌ ${label}: ${e.message}`);
    }
  }
}

async function runTests() {
  console.log('🧪 Testing First Delivery with different auth formats...\n');
  for (const auth of authFormats) {
    await testFD(auth.header, auth.label);
    console.log('');
  }
}

runTests();
