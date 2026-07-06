import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { SofiaPublic } from './pages/SofiaPublic.jsx'

// Ruta pública de Sofía — sin auth
const RootComponent = window.location.pathname === "/sofia" ? SofiaPublic : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
)
