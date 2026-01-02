import axios from 'axios'

async function syncWithCategories() {
  try {
    console.log('🚀 Starting PrestaShop sync with categories via API...\n')
    
    const response = await axios.post('http://localhost:5000/api/products/sync', {}, {
      headers: {
        'Cookie': 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJpbmZvb25lQGFkbWluLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc2NTgzMDQxNCwiZXhwIjoxNzY2NDM1MjE0fQ.g-C0e7r4Bk2vW2zLfbbYDpGgFNMfT02r-lSgvqNE8k8'
      }
    })
    
    console.log('\n✅ Sync completed successfully!')
    console.log(`📊 Synced ${response.data.length} products`)
    
    // Count categories
    const categories = new Set()
    response.data.forEach(p => {
      if (p.category) categories.add(p.category)
    })
    
    console.log(`📁 Found ${categories.size} categories:`)
    Array.from(categories).sort().forEach(cat => {
      console.log(`   • ${cat}`)
    })
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    if (error.response) {
      console.error('Response data:', error.response.data)
    }
  }
}

syncWithCategories()
