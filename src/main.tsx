import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GuestStoreProvider } from './context/GuestStoreContext';
import { registerPWA } from './pwa';
import App from './App';
import './index.css';

registerPWA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GuestStoreProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GuestStoreProvider>
  </StrictMode>,
);
