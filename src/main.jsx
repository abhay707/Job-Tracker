import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Shim window.storage if it does not exist (e.g. running in standard browser)
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const value = localStorage.getItem(key);
        return { value };
      } catch (e) {
        return { value: null };
      }
    },
    set: async (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error('localStorage.setItem error:', e);
      }
    }
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

