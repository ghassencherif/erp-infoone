import axios from 'axios';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function test() {
  try {
    // Use the valid JWT token we saw in server logs
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJpbmZvb25lQGFkbWluLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc2NzA4OTcyMiwiZXhwIjoxNzY3Njk0NTIyfQ.furM5zkWSNRXRU9w5LdfBruECuQ-1iobzIu1HaMYJ6Q';

    console.log('⏳ Waiting for server...');
    let serverReady = false;
    for (let i = 0; i < 10; i++) {
      try {
        await axios.get('http://localhost:5000/api/health', { timeout: 1000 });
        serverReady = true;
        break;
      } catch {
        await sleep(500);
      }
    }
    
    if (!serverReady) {
      console.error('❌ Server not responding after 5 seconds');
      process.exit(1);
    }

    console.log('✅ Server is ready\n');

    console.log('📦 Fetching in-transit orders...');
    try {
      const res = await axios.get('http://localhost:5000/api/tracking/commandes-client/in-transit', {
        headers: { 
          Cookie: `token=${token}` 
        }
      });

      console.log('✅ SUCCESS!');
      console.log('Orders:', JSON.stringify(res.data, null, 2));
    } catch (e: any) {
      console.error('❌ Error:', e.response?.status, e.response?.statusText);
      console.error('Response body:', JSON.stringify(e.response?.data, null, 2));
      console.error('Message:', e.message);
    }
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  }
}

test();
