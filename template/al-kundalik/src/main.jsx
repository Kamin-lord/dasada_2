import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './kundalik/App.jsx';
import './kundalik/index.css';
import { initI18n } from './kundalik/i18n';
import { loadSite } from './kundalik/site';

initI18n();
loadSite();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
