import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './tokens.css'
import './app.css'
import './site.css'
import './brand-overrides.css'
import './film-media.css'
import './sections-motion.css'
import App from './App.jsx'
import { AuthProvider } from './lib/auth'
import { LocaleProvider } from './lib/locale'
import { SettingsProvider, loadSettings } from './lib/settings'

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

loadSettings().then(() => {
  createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <LocaleProvider>
            <App />
          </LocaleProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>,
  )
})
