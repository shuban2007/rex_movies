import { useContext } from 'react';
import { GuestStoreContext, type GuestStoreContextValue } from '../context/GuestStoreContext';

export function useGuestStore(): GuestStoreContextValue {
  const ctx = useContext(GuestStoreContext);
  if (!ctx) {
    throw new Error('useGuestStore must be used within a GuestStoreProvider');
  }
  return ctx;
}
