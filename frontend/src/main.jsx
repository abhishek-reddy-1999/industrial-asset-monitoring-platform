import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DMProvider } from './views/dm/dmContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DMProvider>
      <App />
    </DMProvider>
  </StrictMode>,
)

