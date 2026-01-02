import axios from 'axios';

async function test() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJpbmZvb25lQGFkbWluLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc2NzA4OTcyMiwiZXhwIjoxNzY3Njk0NTIyfQ.furM5zkWSNRXRU9w5LdfBruECuQ-1iobzIu1HaMYJ6Q';

  console.log('Testing Aramex tracking directly...\n');

  try {
    const res = await axios.post(
      'http://localhost:5000/api/tracking/commandes-client/31/check',
      {},
      {
        headers: { Cookie: `token=${token}` }
      }
    );
    console.log('✅ Aramex check result:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.log('❌ Error:', e.response?.data || e.message);
  }

  console.log('\n\nTesting First Delivery tracking directly...\n');

  try {
    const res = await axios.post(
      'http://localhost:5000/api/tracking/commandes-client/32/check',
      {},
      {
        headers: { Cookie: `token=${token}` }
      }
    );
    console.log('✅ First Delivery check result:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.log('❌ Error:', e.response?.data || e.message);
  }
}

test();
