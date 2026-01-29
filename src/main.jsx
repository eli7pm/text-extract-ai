import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Intercept all fetch requests to add ngrok-skip-browser-warning header
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [resource, config] = args;

  // Add ngrok bypass header to all requests
  const newConfig = {
    ...config,
    headers: {
      ...(config?.headers || {}),
      'ngrok-skip-browser-warning': 'true',
    },
  };

  return originalFetch(resource, newConfig);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);