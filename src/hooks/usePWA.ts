import { useContext } from 'react';
import { PWAContext } from '../context/PWAContext';

export function usePWA() {
  return useContext(PWAContext);
}
