import axios from 'axios'

// Configuration de l'API - Updated: 2025-11-10
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
console.log('🔧 API Configuration loaded - baseURL:', baseURL)

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
