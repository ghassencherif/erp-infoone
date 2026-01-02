import axios from 'axios'

// Alternative API client to bypass cache issues
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

console.log('✅ New API Client initialized with baseURL:', apiClient.defaults.baseURL)

export default apiClient
