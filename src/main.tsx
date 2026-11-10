import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const view = new URLSearchParams(window.location.search).get('view');
document.documentElement.dataset.view = view === 'dock' ? 'dock' : 'main';
document.documentElement.dataset.environment = window.dock ? 'desktop' : 'browser';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
