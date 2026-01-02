import axios from 'axios';

const PRESTASHOP_API_URL = process.env.PRESTASHOP_API_URL || 'http://your-prestashop-url/api';
const PRESTASHOP_API_KEY = process.env.PRESTASHOP_API_KEY || 'your-api-key';

export async function fetchPrestashopClients() {
  try {
    console.log('Fetching customers from:', `${PRESTASHOP_API_URL}/customers`);
    const res = await axios.get(`${PRESTASHOP_API_URL}/customers`, {
      auth: {
        username: PRESTASHOP_API_KEY,
        password: ''
      },
      headers: {
        'Accept': 'application/json',
      },
      params: {
        'display': 'full',
        'output_format': 'JSON'
      }
    });
    console.log('PrestaShop customers response sample:', JSON.stringify(res.data.customers?.[0], null, 2));
    
    // Fetch addresses for each customer if they have address associations
    if (res.data.customers && Array.isArray(res.data.customers)) {
      for (const customer of res.data.customers) {
        if (customer.id_default_address || customer.associations?.addresses) {
          try {
            const addressId = customer.id_default_address || customer.associations?.addresses?.[0]?.id;
            if (addressId) {
              const addrRes = await axios.get(`${PRESTASHOP_API_URL}/addresses/${addressId}`, {
                auth: { username: PRESTASHOP_API_KEY, password: '' },
                headers: { 'Accept': 'application/json' },
                params: { 'output_format': 'JSON' }
              });
              customer.addressData = addrRes.data.address || addrRes.data.addresses;
              console.log(`Fetched address for customer ${customer.id}:`, customer.addressData);
            }
          } catch (addrError) {
            console.error(`Failed to fetch address for customer ${customer.id}`);
          }
        }
      }
    }
    
    return res.data;
  } catch (error: any) {
    console.error('PrestaShop API error:', error.response?.data || error.message);
    throw error;
  }
}
