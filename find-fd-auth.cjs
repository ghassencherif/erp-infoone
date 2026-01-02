const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Parse .env file
const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const apiKey = envFile.match(/FIRST_DELIVERY_API_KEY=([^\n]+)/)?.[1]?.trim();

if (!apiKey) {
  console.log('❌ FIRST_DELIVERY_API_KEY not found in .env');
  process.exit(1);
}

console.log(`Using API Key: ${apiKey.substring(0, 8)}...`);

const barCode = '582269900000';
const baseUrl = 'https://www.firstdeliverygroup.com/api/v2';

const authHeaders = [
  { name: 'Bearer Token (standard)', Authorization: `Bearer ${apiKey}` },
  { name: 'X-API-Key header', 'X-API-Key': apiKey },
  { name: 'Key prefix (API Key: ...)', Authorization: `Key ${apiKey}` },
  { name: 'Plain UUID in Authorization', Authorization: apiKey },
];

async function testAuth(headerConfig) {
  const { name, ...headers } = headerConfig;
  
  try {
    console.log(`\n🔄 Testing: ${name}`);
    console.log(`   Headers: ${JSON.stringify({ ...headers, Authorization: headers.Authorization ? '***' : headers['X-API-Key'] ? '***' : undefined })}`);
    
    const response = await axios.post(
      `${baseUrl}/etat`,
      { barCode },
      {
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 5000,
        validateStatus: () => true // Don't throw on any status
      }
    );

    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200 || response.status === 201) {
      console.log(`   ✅ SUCCESS!`);
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}`);
      return true;
    } else if (response.status === 401) {
      console.log(`   ❌ 401 Unauthorized`);
    } else if (response.status === 404) {
      console.log(`   ❌ 404 Not Found`);
    } else {
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
}

async function runTests() {
  console.log('🔍 Testing First Delivery API authorization formats...');
  console.log(`   Endpoint: ${baseUrl}/etat`);
  console.log(`   BarCode: ${barCode}\n`);
  
  for (const headerConfig of authHeaders) {
    await testAuth(headerConfig);
    await new Promise(r => setTimeout(r, 500));
  }
}

runTests();
