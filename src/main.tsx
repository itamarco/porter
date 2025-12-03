import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (!window.electronAPI) {
  console.warn('window.electronAPI is not available. Make sure you are running in Electron.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

