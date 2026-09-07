import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService } from '../services/auth';
import { watchlistService } from '../services/watchlist';
import { historyService } from '../services/history';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleAuthUser = async (authUser: User) => {
      try {
        await watchlistService.mergeGuestWatchlist(authUser.id);
        await historyService.mergeGuestHistory(authUser.id);
      } catch (err) {
        console.error('Failed to merge guest data:', err);
      }
    };

    // 1. Subscribe to auth state changes to handle SIGNED_IN, SIGNED_OUT, and token refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setAuthLoading(false);
          
          if (event === 'SIGNED_IN' && currentSession?.user) {
            handleAuthUser(currentSession.user);
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setAuthLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
            setAuthLoading(false);
            if (currentSession.user) {
              handleAuthUser(currentSession.user);
            }
          }
        }
      }
    );

    // 2. Call supabase.auth.getSession() on initialization and use the returned session/user to set global auth state
    supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('Error fetching initial session:', error.message);
        }
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          setAuthLoading(false);
        } else {
          // If URL contains OAuth parameters (#access_token= or ?code=), keep authLoading true
          // so UI does not prematurely render "Not signed in" before onAuthStateChange handles SIGNED_IN
          const hasOAuthParams =
            window.location.hash.includes('access_token=') ||
            window.location.search.includes('code=');

          if (!hasOAuthParams) {
            setAuthLoading(false);
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('Failed to initialize auth session:', err);
          setAuthLoading(false);
        }
      });

    // Safety timeout to prevent infinite authLoading if OAuth code exchange fails
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setAuthLoading(false);
      }
    }, 4000);

    // 3. Properly unsubscribe from the listener on cleanup
    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading: authLoading,
    authLoading,
    signInWithGoogle: authService.signInWithGoogle,
    signOut: authService.signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
