const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Manual .env parsing for CJS
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/FIRST_DELIVERY_API_KEY\s*=\s*(.+)(?:\n|$)/);
const baseUrlMatch = envContent.match(/FIRST_DELIVERY_API_URL\s*=\s*(.+)(?:\n|$)/);
const apiKey = apiKeyMatch?.[1]?.trim() || 'your_fd_api_key_here';
const baseUrl = baseUrlMatch?.[1]?.trim() || 'https://www.firstdeliverygroup.com/api/v2';

// First Delivery API test
const trackingNumber = '582269900000';

console.log('🚀 Testing First Delivery API...');
console.log('📦 Tracking Number (barCode):', trackingNumber);
console.log('🔑 API Key:', apiKey === 'your_fd_api_key' ? '⚠️  NOT CONFIGURED' : apiKey.substring(0, 10) + '...');
console.log('🌐 Endpoint:', baseUrl + '/etat');
console.log('');

async function testFirstDelivery() {
  try {
    const response = await axios.post(
      `${baseUrl}/etat`,
      {
        barCode: trackingNumber
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('✅ SUCCESS! First Delivery API Response:');
    console.log('=====================================');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('=====================================');
    console.log('');

    // Parse state
    const state = response.data?.state;
    const stateMap = {
      0: 'PENDING (En attente)',
      1: 'IN_TRANSIT (En cours)',
      2: 'DELIVERED (Livré)',
      3: 'IN_TRANSIT (Echange)',
      5: 'FAILED (Retour Expéditeur)',
      6: 'CANCELLED (Supprimé)',
      100: 'PENDING (Demande d\'enlèvement)',
      101: 'IN_TRANSIT (Demande assignée)',
      102: 'IN_TRANSIT (En cours d\'enlèvement)',
      103: 'PICKED_UP (Enlevé)'
    };

    console.log('📊 Tracking Details:');
    console.log('   State Code:', state);
    console.log('   Status:', stateMap[state] || 'UNKNOWN');
    console.log('   Comment:', response.data?.comment || 'N/A');
    console.log('   Created:', response.data?.createdAt || 'N/A');
    console.log('   Updated:', response.data?.updatedAt || 'N/A');

  } catch (error) {
    console.log('❌ ERROR calling First Delivery API:');
    console.log('Error message:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401 || error.response.status === 403) {
        console.log('');
        console.log('🔑 Authentication Error!');
        console.log('   - Check FIRST_DELIVERY_API_KEY in .env file');
        console.log('   - Make sure the API key is valid and active');
        console.log('   - Verify you\'re using Bearer token format');
      } else if (error.response.status === 404) {
        console.log('');
        console.log('📦 Tracking number not found!');
        console.log('   - Verify tracking number:', trackingNumber);
        console.log('   - Check if it exists in First Delivery system');
      } else if (error.response.status === 429) {
        console.log('');
        console.log('⚠️  Rate Limit Error!');
        console.log('   - First Delivery limits: 1 request/second');
        console.log('   - Wait a moment and try again');
      }
    } else {
      console.log('Network error or timeout. Check your internet connection.');
    }
    
    process.exit(1);
  }
}

testFirstDelivery();
