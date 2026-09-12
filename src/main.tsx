import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GuestStoreProvider } from './context/GuestStoreContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GuestStoreProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GuestStoreProvider>
  </StrictMode>,
);
