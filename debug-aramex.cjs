const axios = require('axios');

const trackingNumber = '51331931571';
const username = 'contact.infooneplus@gmail.com';
const password = 'INFO-oneplus1@';
const accountNumber = '153595';
const accountPin = '332432';

// Try different Entity/Country combinations
const configs = [
  { entity: 'TN', country: 'TN', label: 'TN/TN' },
  { entity: 'Infoone', country: 'TN', label: 'Infoone/TN' },
  { entity: '', country: 'TN', label: 'empty/TN' },
  { entity: 'TN', country: '', label: 'TN/empty' },
  { entity: '', country: '', label: 'both empty' }
];

async function testAramex(entity, country, label) {
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
        <AccountCountryCode>${country}</AccountCountryCode>
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
        timeout: 15000
      }
    );

    // Extract error/result
    const hasErrors = resp.data.includes('<HasErrors>true</HasErrors>');
    const errorMatch = resp.data.match(/<Notification>.*?<Code>([^<]+)<\/Code>.*?<Message>([^<]+)<\/Message>/s);
    const trackMatch = resp.data.match(/<UpdateCode>([^<]+)<\/UpdateCode>/);

    if (hasErrors && errorMatch) {
      console.log(`❌ ${label}: ${errorMatch[1]} - ${errorMatch[2]}`);
    } else if (trackMatch) {
      console.log(`✅ ${label}: Got tracking result - ${trackMatch[1]}`);
    } else {
      console.log(`⚠️  ${label}: Unknown response`);
    }
  } catch (e) {
    console.log(`❌ ${label}: Network error - ${e.message}`);
  }
}

async function runTests() {
  console.log('🧪 Testing Aramex with different Entity/Country combos...\n');
  for (const config of configs) {
    await testAramex(config.entity, config.country, config.label);
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }
}

runTests();
