// Test Aramex SOAP API with tracking number
const axios = require('axios');

const trackingNumber = '51331931571';
const accountNumber = '153595';
const accountPin = '332432';
const username = 'contact.infooneplus@gmail.com'; // Add from .env
const password = 'INFO-oneplus1@'; // Add from .env
const accountEntity = 'TN';
const accountCountry = 'TN';
const version = 'v1.0';

// Build SOAP request
const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://ws.aramex.net/ShippingAPI/v1/">
  <soap:Body>
    <ShipmentTrackingRequest xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      <ClientInfo>
        <UserName>${username}</UserName>
        <Password>${password}</Password>
        <Version>${version}</Version>
        <AccountNumber>${accountNumber}</AccountNumber>
        <AccountPin>${accountPin}</AccountPin>
        <AccountEntity>${accountEntity}</AccountEntity>
        <AccountCountryCode>${accountCountry}</AccountCountryCode>
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

console.log('🚀 Testing Aramex SOAP API...');
console.log('📦 Tracking Number:', trackingNumber);
console.log('🏢 Account Number:', accountNumber);
console.log('🔑 Account PIN:', accountPin);
console.log('📍 Country:', accountCountry);
console.log('');

axios.post(
  'http://ws.aramex.net/shippingapi/tracking/service_1_0.svc',
  soapRequest,
  {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'http://ws.aramex.net/ShippingAPI/v1/Service_1_0/TrackShipments'
    },
    timeout: 20000
  }
)
.then(response => {
  console.log('✅ SUCCESS! Aramex API Response:');
  console.log('=====================================');
  console.log(response.data);
  console.log('=====================================\n');

  // Try to extract key info
  const updateCodeMatch = response.data.match(/<tns:UpdateCode>(.*?)<\/tns:UpdateCode>/);
  const updateDescMatch = response.data.match(/<tns:UpdateDescription>(.*?)<\/tns:UpdateDescription>/);
  const updateDateMatch = response.data.match(/<tns:UpdateDateTime>(.*?)<\/tns:UpdateDateTime>/);
  const updateLocMatch = response.data.match(/<tns:UpdateLocation>(.*?)<\/tns:UpdateLocation>/);
  const commentsMatch = response.data.match(/<tns:Comments>(.*?)<\/tns:Comments>/);

  if (updateCodeMatch || updateDescMatch) {
    console.log('📋 Parsed Tracking Info:');
    console.log('  Status Code:', updateCodeMatch ? updateCodeMatch[1] : 'N/A');
    console.log('  Description:', updateDescMatch ? updateDescMatch[1] : 'N/A');
    console.log('  Date:', updateDateMatch ? updateDateMatch[1] : 'N/A');
    console.log('  Location:', updateLocMatch ? updateLocMatch[1] : 'N/A');
    console.log('  Comments:', commentsMatch ? commentsMatch[1] : 'N/A');
  } else {
    console.log('⚠️  Could not parse tracking details. Check raw XML above.');
  }
})
.catch(error => {
  console.error('❌ ERROR calling Aramex API:');
  console.error('Error message:', error.message);
  
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response data:', error.response.data);
    
    // Try to extract SOAP fault
    const faultMatch = error.response.data.match(/<faultstring>(.*?)<\/faultstring>/);
    if (faultMatch) {
      console.error('SOAP Fault:', faultMatch[1]);
    }
  } else if (error.code === 'ECONNREFUSED') {
    console.error('Cannot reach Aramex server. Check internet connection.');
  }
  
  process.exit(1);
});
