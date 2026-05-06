import React from 'react'
import ReactDOM from 'react-dom/client'
// import App from '@/App.jsx' // Base44 version
import SupabaseApp from '@/SupabaseApp.jsx' // NEW: Supabase version
import '@/index.css'
import 'leaflet/dist/leaflet.css'

// TESTING: Using Supabase version
// To switch back to Base44: comment line 4, uncomment line 3, change line 9 to <App />
ReactDOM.createRoot(document.getElementById('root')).render(
  <SupabaseApp />
)