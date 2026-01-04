import axios from 'axios'

// Configuration de l'API - Updated: 2026-01-02
// Use a root API URL (no trailing /api) because routes already include the /api prefix
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
console.log('🔧 API Configuration loaded - baseURL:', baseURL)

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
