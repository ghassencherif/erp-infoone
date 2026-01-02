require('dotenv').config();
const axios = require('axios');

const creds = {
  user: process.env.ARAMEX_USERNAME,
  pass: process.env.ARAMEX_PASSWORD,
  acc: process.env.ARAMEX_ACCOUNT_NUMBER,
  pin: process.env.ARAMEX_ACCOUNT_PIN,
  entity: process.env.ARAMEX_ACCOUNT_ENTITY || 'TN',
  country: process.env.ARAMEX_ACCOUNT_COUNTRY || 'TN',
  version: process.env.ARAMEX_VERSION || 'v1.0'
};

const numbers = process.argv.slice(2);
if (!numbers.length) {
  console.error('Usage: node tmp-check-aramex-batch.cjs <tracking1> <tracking2> ...');
  process.exit(1);
}

async function trackOne(n) {
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://ws.aramex.net/ShippingAPI/v1/">
  <soap:Body>
    <ShipmentTrackingRequest xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      <ClientInfo>
        <UserName>${creds.user}</UserName>
        <Password>${creds.pass}</Password>
        <Version>${creds.version}</Version>
        <AccountNumber>${creds.acc}</AccountNumber>
        <AccountPin>${creds.pin}</AccountPin>
        <AccountEntity>${creds.entity}</AccountEntity>
        <AccountCountryCode>${creds.country}</AccountCountryCode>
      </ClientInfo>
      <Transaction>
        <Reference1></Reference1>
        <Reference2></Reference2>
        <Reference3></Reference3>
        <Reference4></Reference4>
        <Reference5></Reference5>
      </Transaction>
      <Shipments>
        <string xmlns="http://schemas.microsoft.com/2003/10/Serialization/Arrays">${n}</string>
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
        timeout: 20000
      }
    );

    const hasErrors = resp.data.includes('<HasErrors>true</HasErrors>');
    const errorMatch = resp.data.match(/<Notification>.*?<Code>([^<]+)<\/Code>.*?<Message>([^<]+)<\/Message>/s);
    const updateCodeMatch = resp.data.match(/<UpdateCode>([^<]+)<\/UpdateCode>/);
    const updateDescMatch = resp.data.match(/<UpdateDescription>([^<]+)<\/UpdateDescription>/);

    if (hasErrors && errorMatch) {
      console.log(`${n}: ERROR ${errorMatch[1]} - ${errorMatch[2]}`);
    } else if (updateCodeMatch || updateDescMatch) {
      console.log(`${n}: ${updateCodeMatch ? updateCodeMatch[1] : ''} ${updateDescMatch ? '(' + updateDescMatch[1] + ')' : ''}`.trim());
    } else {
      console.log(`${n}: Unknown response`);
    }
  } catch (e) {
    console.log(`${n}: Network error - ${e.message}`);
  }
}

(async () => {
  for (const n of numbers) {
    await trackOne(n);
    await new Promise(r => setTimeout(r, 500));
  }
})();
