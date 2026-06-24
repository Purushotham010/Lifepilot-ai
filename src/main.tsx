import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign iframe-specific WebSocket/HMR errors and cross-origin "Script error" logs
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg === 'Script error.' || 
      msg.includes('WebSocket') || 
      event.filename?.includes('vite') ||
      msg.includes('connection failed')
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (
      reason.includes('WebSocket') || 
      reason.includes('vite') ||
      reason.includes('HMR') ||
      reason.includes('connection')
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

