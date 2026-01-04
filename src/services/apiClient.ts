import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/,'')

// Alternative API client to bypass cache issues
const apiClient = axios.create({
  baseURL: `${baseURL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

console.log('✅ New API Client initialized with baseURL:', apiClient.defaults.baseURL)

export default apiClient
