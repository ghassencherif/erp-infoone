const axios = require('axios');
require('dotenv').config();

async function testFirstDelivery() {
  try {
    const apiKey = process.env.FIRST_DELIVERY_API_KEY;
    const trackingNumber = '582269900000';

    console.log('📦 Testing First Delivery API...');
    console.log('Tracking:', trackingNumber);

    const resp = await axios.post(
      'https://www.firstdeliverygroup.com/api/v2/etat',
      {
        barCode: trackingNumber
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('\n📋 Full API Response:');
    console.log(JSON.stringify(resp.data, null, 2));

    if (resp.data?.result) {
      console.log('\n🔍 Result object keys:', Object.keys(resp.data.result));
      console.log('\n📅 Date-related fields:');
      const result = resp.data.result;
      if (result.deliveryDate) console.log('  - deliveryDate:', result.deliveryDate);
      if (result.updatedAt) console.log('  - updatedAt:', result.updatedAt);
      if (result.createdAt) console.log('  - createdAt:', result.createdAt);
      if (result.date) console.log('  - date:', result.date);
      if (result.dateDelivery) console.log('  - dateDelivery:', result.dateDelivery);
      if (result.dateLivraison) console.log('  - dateLivraison:', result.dateLivraison);
      if (result.delivered_at) console.log('  - delivered_at:', result.delivered_at);
      if (result.delivery_date) console.log('  - delivery_date:', result.delivery_date);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testFirstDelivery();
