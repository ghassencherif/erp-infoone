const axios = require('axios');

const trackingNumber = '51331931571';
const username = 'contact.infooneplus@gmail.com';
const password = 'INFO-oneplus1@';
const accountNumber = '153595';
const accountPin = '332432';

// Try various entity codes (common Aramex entities for Middle East/Africa)
const entities = [
  'TN', 'TUN', 'Tunisia', 'AE', 'ARAME', 'ARAMEX_TN', 
  'AMM', 'AMS', 'AXB', 'DXB', // Airport codes
  'TUN', 'TUnis', 'north africa'
];

async function testEntity(entity) {
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://ws.aramex.net/ShippingAPI/v1/">
  <soap:Body>
    <ShipmentTrackingRequest xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      <ClientInfo>
        <UserName>${username}</UserName>
        <Password>${password}</Password>
        <Version>v1.0</Version>
        <AccountNumber>${accountNumber}</AccountNumber>
        <AccountPin>${accountPin}</AccountPin>
        <AccountEntity>${entity}</AccountEntity>
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
        <string xmlns="http://schemas.microsoft.com/2003/10/Serialization/Arrays">${trackingNumber}</string>
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

    const hasErrors = resp.data.includes('<HasErrors>true</HasErrors>');
    if (!hasErrors) {
      console.log(`✅ FOUND: Entity="${entity}"`);
      const trackMatch = resp.data.match(/<UpdateDescription>([^<]+)<\/UpdateDescription>/);
      if (trackMatch) console.log(`   Tracking: ${trackMatch[1]}`);
      return true;
    }
    
    const errorMatch = resp.data.match(/<Code>([^<]+)<\/Code>.*?<Message>([^<]+)<\/Message>/s);
    if (errorMatch?.[1] === 'ERR82') {
      console.log(`❌ "${entity}": ERR82`);
    } else if (errorMatch) {
      console.log(`❌ "${entity}": ${errorMatch[1]}`);
    }
  } catch (e) {
    console.log(`❌ "${entity}": Network error`);
  }
  
  return false;
}

async function runTests() {
  console.log('🔍 Finding correct Aramex Entity code...\n');
  for (const entity of entities) {
    if (await testEntity(entity)) break;
    await new Promise(r => setTimeout(r, 300));
  }
}

runTests();
