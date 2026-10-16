import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { initAnalytics } from './lib/analytics'
import './styles/global.css'

initAnalytics()
createRoot(document.getElementById('root')).render(<App />)
