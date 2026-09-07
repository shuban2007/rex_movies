import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Prevent crash in browser but log a loud warning for developers.
  console.error(
    'Supabase configuration is missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.'
  );
}

const createFallbackClient = () => {
  const defaultResult = { data: null, error: new Error('Supabase is not configured.') };
  const dummyFn = () => defaultResult;

  return new Proxy({} as any, {
    get: (_target, prop) => {
      if (prop === 'auth') {
        return new Proxy({} as any, {
          get: (_t, authProp) => {
            if (authProp === 'onAuthStateChange') {
              return () => ({ data: { subscription: { unsubscribe: () => {} } } });
            }
            if (authProp === 'getSession' || authProp === 'getUser') {
              return async () => ({ data: { session: null, user: null }, error: null });
            }
            return async () => defaultResult;
          }
        });
      }
      if (prop === 'from') {
        const queryChain: any = () => queryChain;
        queryChain.select = () => queryChain;
        queryChain.insert = () => queryChain;
        queryChain.update = () => queryChain;
        queryChain.delete = () => queryChain;
        queryChain.eq = () => queryChain;
        queryChain.order = () => queryChain;
        queryChain.single = async () => defaultResult;
        queryChain.then = (resolve: any) => resolve({ data: [], error: null });
        return () => queryChain;
      }
      return dummyFn;
    }
  });
};

// Create a single supabase client for interacting with your database
// If configuration is missing, export a Proxy that gracefully fails on usage, 
// rather than crashing the entire React application on load.
export const supabase: SupabaseClient = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createFallbackClient() as unknown as SupabaseClient;
