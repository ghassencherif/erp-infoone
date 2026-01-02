const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Parse .env
const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const aramexUser = envFile.match(/ARAMEX_USERNAME=([^\n]+)/)?.[1]?.trim();
const aramexPass = envFile.match(/ARAMEX_PASSWORD=([^\n]+)/)?.[1]?.trim();
const aramexAccount = envFile.match(/ARAMEX_ACCOUNT_NUMBER=([^\n]+)/)?.[1]?.trim();
const aramexPin = envFile.match(/ARAMEX_ACCOUNT_PIN=([^\n]+)/)?.[1]?.trim();
const aramexEntity = envFile.match(/ARAMEX_ACCOUNT_ENTITY=([^\n]+)/)?.[1]?.trim() || 'TUN';
const fdKey = envFile.match(/FIRST_DELIVERY_API_KEY=([^\n]+)/)?.[1]?.trim();

console.log('🚀 Testing both APIs with FIXED credentials\n');

// Test 1: Aramex with correct entity code
async function testAramex() {
  console.log('📦 ARAMEX TEST (Tracking: 51331931571)');
  
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://ws.aramex.net/ShippingAPI/v1/">
  <soap:Body>
    <ShipmentTrackingRequest xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      <ClientInfo>
        <UserName>${aramexUser}</UserName>
        <Password>${aramexPass}</Password>
        <Version>v1.0</Version>
        <AccountNumber>${aramexAccount}</AccountNumber>
        <AccountPin>${aramexPin}</AccountPin>
        <AccountEntity>${aramexEntity}</AccountEntity>
        <AccountCountryCode>TN</AccountCountryCode>
      </ClientInfo>
      <Transaction>
        <Reference1></Reference1>
        <Reference2></Reference2>
        <Reference3></Reference3>
        <Reference4></Reference4>
        <Reference5></Reference5>
      </Transaction>
      <Shipments>
        <string xmlns="http://schemas.microsoft.com/2003/10/Serialization/Arrays">51331931571</string>
      </Shipments>
      <GetLastTrackingUpdateOnly>true</GetLastTrackingUpdateOnly>
    </ShipmentTrackingRequest>
  </soap:Body>
</soap:Envelope>`;

  try {
    const resp = await axios.post(
      'http://ws.aramex.net/shippingapi/tracking/service_1_0.svc',
      soapRequest,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://ws.aramex.net/ShippingAPI/v1/Service_1_0/TrackShipments'
        },
        timeout: 10000
      }
    );

    if (resp.data.includes('<HasErrors>true</HasErrors>')) {
      const errorMatch = resp.data.match(/<Code>([^<]+)<\/Code>.*?<Message>([^<]+)<\/Message>/s);
      console.log(`   ❌ Error: ${errorMatch?.[1]} - ${errorMatch?.[2]}`);
    } else {
      const desc = resp.data.match(/<UpdateDescription>([^<]+)<\/UpdateDescription>/)?.[1];
      const date = resp.data.match(/<UpdateDateTime>([^<]+)<\/UpdateDateTime>/)?.[1];
      console.log(`   ✅ Status: ${desc}`);
      console.log(`   📅 Date: ${date}`);
    }
  } catch (e) {
    console.log(`   ❌ Network error: ${e.message}`);
  }
}

// Test 2: First Delivery with correct auth header
async function testFirstDelivery() {
  console.log('\n📦 FIRST DELIVERY TEST (Tracking: 582269900000)');
  
  try {
    const resp = await axios.post(
      'https://www.firstdeliverygroup.com/api/v2/etat',
      { barCode: '582269900000' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fdKey}`
        },
        timeout: 5000
      }
    );

    if (resp.status === 200 && !resp.data.isError) {
      console.log(`   ✅ Status: ${resp.data.result.state}`);
      console.log(`   📦 BarCode: ${resp.data.result.barCode}`);
    } else {
      console.log(`   ❌ ${resp.data.message || 'Unknown error'}`);
    }
  } catch (e) {
    console.log(`   ❌ Network error: ${e.message}`);
  }
}

async function run() {
  await testAramex();
  await testFirstDelivery();
  console.log('\n✨ Testing complete!');
}

run();
