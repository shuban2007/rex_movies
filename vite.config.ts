import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig, loadEnv } from 'vite';

/**
 * Rex.io — Development API plugin
 *
 * Provides /api/search-movies during `vite dev`.
 * In production, this same logic should run as a serverless function
 * or Node server endpoint — never bundled into the client.
 */
const apiPlugin = () => ({
  name: 'rex-api-plugin',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (!req.url?.startsWith('/api/')) {
        return next();
      }

      res.setHeader('Content-Type', 'application/json');

      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      // ── Load TMDB token ───────────────────────────────
      const env = loadEnv(server.config.mode, process.cwd(), '');
      const token = env.TMDB_API_READ_ACCESS_TOKEN;

      if (!token) {
        console.error('[TMDB] TMDB_API_READ_ACCESS_TOKEN is missing in server environment.');
        res.statusCode = 500;
        return res.end(JSON.stringify({
          error: { code: 'SERVER_CONFIG_ERROR', message: 'TMDB is not configured on the server.' }
        }));
      }

      // ── Helper: Perform TMDB Request ──────────────────
      const handleTmdbRequest = async (tmdbPath: string, queryParams: URLSearchParams = new URLSearchParams(), defaultMediaType: 'movie' | 'tv' = 'movie') => {
        try {
          const tmdbUrl = `https://api.tmdb.org/3${tmdbPath}?${queryParams.toString()}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10_000);

          let tmdbRes: Response;
          try {
            tmdbRes = await fetch(tmdbUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'accept': 'application/json',
              },
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeout);
          }

          if (!tmdbRes.ok) {
            if (tmdbRes.status === 401) {
              res.statusCode = 500;
              return res.end(JSON.stringify({
                error: { code: 'TMDB_AUTH_FAILED', message: 'TMDB authentication failed. Check the server token.' }
              }));
            }
            if (tmdbRes.status === 429) {
              res.statusCode = 429;
              return res.end(JSON.stringify({
                error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' }
              }));
            }
            res.statusCode = 502;
            return res.end(JSON.stringify({
              error: { code: 'TMDB_UNAVAILABLE', message: 'Service is temporarily unavailable.' }
            }));
          }

          const data = await tmdbRes.json() as any;
          const results = (data.results || []).slice(0, 20).map((item: any) => {
            const type = item.media_type || defaultMediaType;
            return {
              id: item.id,
              mediaType: type,
              title: type === 'movie' ? item.title : item.name,
              year: type === 'movie' 
                ? (item.release_date ? item.release_date.split('-')[0] : null)
                : (item.first_air_date ? item.first_air_date.split('-')[0] : null),
              posterPath: item.poster_path || null,
              backdropPath: item.backdrop_path || null,
              overview: item.overview || '',
            };
          });

          res.statusCode = 200;
          return res.end(JSON.stringify({ results }));

        } catch (error: any) {
          if (error.name === 'AbortError') {
            res.statusCode = 504;
            return res.end(JSON.stringify({
              error: { code: 'TMDB_TIMEOUT', message: 'TMDB took too long to respond. Please try again.' }
            }));
          }
          if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || error.message?.includes('fetch failed')) {
            res.statusCode = 504;
            return res.end(JSON.stringify({
              error: { code: 'TMDB_UNREACHABLE', message: "Couldn't reach TMDB. Check your connection and try again." }
            }));
          }
          res.statusCode = 500;
          return res.end(JSON.stringify({
            error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' }
          }));
        }
      };

      // ── Endpoints ─────────────────────────────────────
      if (pathname === '/api/section') {
        const targetPath = url.searchParams.get('path');
        const mediaType = url.searchParams.get('type') as 'movie' | 'tv' | null;

        if (!targetPath || !targetPath.startsWith('/')) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: { code: 'INVALID_PATH', message: 'Valid TMDB path required.' } }));
        }

        const params = new URLSearchParams(url.searchParams);
        params.delete('path');
        params.delete('type');
        
        if (!params.has('language')) {
          params.set('language', 'en-US');
        }

        return handleTmdbRequest(targetPath, params, mediaType || 'movie');
      }

      if (pathname === '/api/search-movies') {
        const rawQuery = url.searchParams.get('q');
        if (!rawQuery || !rawQuery.trim()) {
          res.statusCode = 400;
          return res.end(JSON.stringify({
            error: { code: 'INVALID_QUERY', message: 'Search query is required.' }
          }));
        }
        const query = rawQuery.trim();
        if (query.length > 200) {
          res.statusCode = 400;
          return res.end(JSON.stringify({
            error: { code: 'QUERY_TOO_LONG', message: 'Search query is too long.' }
          }));
        }
        
        const params = new URLSearchParams({
          query,
          include_adult: 'false',
          language: 'en-US',
          page: '1'
        });
        return handleTmdbRequest('/search/movie', params);
      }

      if (pathname === '/api/search-multi') {
        const rawQuery = url.searchParams.get('q');
        if (!rawQuery || !rawQuery.trim()) {
          res.statusCode = 400;
          return res.end(JSON.stringify({
            error: { code: 'INVALID_QUERY', message: 'Search query is required.' }
          }));
        }
        const query = rawQuery.trim();
        if (query.length > 200) {
          res.statusCode = 400;
          return res.end(JSON.stringify({
            error: { code: 'QUERY_TOO_LONG', message: 'Search query is too long.' }
          }));
        }
        
        try {
          const params = new URLSearchParams({
            query,
            include_adult: 'false',
            language: 'en-US',
            page: '1'
          });
          const tmdbUrl = `https://api.tmdb.org/3/search/multi?${params.toString()}`;
          
          const tmdbRes = await fetch(tmdbUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json',
            }
          });
          
          if (!tmdbRes.ok) throw new Error('Failed to fetch multi search');
          
          const data = await tmdbRes.json() as any;
          
          const results = (data.results || [])
            .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
            .slice(0, 20)
            .map((item: any) => ({
              id: item.id,
              mediaType: item.media_type,
              title: item.media_type === 'movie' ? item.title : item.name,
              year: item.media_type === 'movie' 
                ? (item.release_date ? item.release_date.split('-')[0] : null)
                : (item.first_air_date ? item.first_air_date.split('-')[0] : null),
              posterPath: item.poster_path || null,
              backdropPath: item.backdrop_path || null,
              overview: item.overview || '',
            }));
            
          res.statusCode = 200;
          return res.end(JSON.stringify({ results }));
        } catch {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch search results.' } }));
        }
      }

      if (pathname === '/api/trending-movies') {
        return handleTmdbRequest('/trending/movie/day', new URLSearchParams({ language: 'en-US' }));
      }

      if (pathname === '/api/popular-movies') {
        return handleTmdbRequest('/movie/popular', new URLSearchParams({ language: 'en-US', page: '1' }));
      }

      if (pathname === '/api/top-rated-movies') {
        return handleTmdbRequest('/movie/top_rated', new URLSearchParams({ language: 'en-US', page: '1' }));
      }

      if (pathname.startsWith('/api/movie/')) {
        const id = pathname.split('/').pop();
        if (!id || isNaN(Number(id))) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: { code: 'INVALID_ID', message: 'Valid movie ID required.' } }));
        }
        
        // Custom handler for single movie details because TMDB returns a different object shape than lists
        try {
          const tmdbUrl = `https://api.tmdb.org/3/movie/${id}?language=en-US`;
          const tmdbRes = await fetch(tmdbUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json',
            }
          });
          
          if (!tmdbRes.ok) throw new Error('Failed to fetch movie');
          
          const movie = await tmdbRes.json() as any;
          const result = {
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : null,
            posterPath: movie.poster_path || null,
            backdropPath: movie.backdrop_path || null,
            overview: movie.overview || '',
          };
          
          res.statusCode = 200;
          return res.end(JSON.stringify(result));
        } catch {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch movie details.' } }));
        }
      }

      if (pathname.startsWith('/api/recommendations/')) {
        const id = pathname.split('/').pop();
        if (!id || isNaN(Number(id))) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: { code: 'INVALID_ID', message: 'Valid movie ID required.' } }));
        }
        return handleTmdbRequest(`/movie/${id}/recommendations`, new URLSearchParams({ language: 'en-US', page: '1' }));
      }

      if (pathname.startsWith('/api/tv/') && !pathname.includes('/season/')) {
        const id = pathname.split('/').pop();
        if (!id || isNaN(Number(id))) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: { code: 'INVALID_ID', message: 'Valid TV ID required.' } }));
        }
        
        try {
          const tmdbUrl = `https://api.tmdb.org/3/tv/${id}?language=en-US`;
          const tmdbRes = await fetch(tmdbUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json',
            }
          });
          
          if (!tmdbRes.ok) throw new Error('Failed to fetch tv series');
          
          const series = await tmdbRes.json() as any;
          const result = {
            id: series.id,
            title: series.name,
            year: series.first_air_date ? series.first_air_date.split('-')[0] : null,
            posterPath: series.poster_path || null,
            backdropPath: series.backdrop_path || null,
            overview: series.overview || '',
            seasons: (series.seasons || []).map((s: any) => ({
              seasonNumber: s.season_number,
              name: s.name,
              episodeCount: s.episode_count,
            })),
          };
          
          res.statusCode = 200;
          return res.end(JSON.stringify(result));
        } catch {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch TV details.' } }));
        }
      }

      if (pathname.startsWith('/api/tv/') && pathname.includes('/season/')) {
        const parts = pathname.split('/');
        const seasonIndex = parts.indexOf('season');
        const id = parts[seasonIndex - 1];
        const seasonNumber = parts[seasonIndex + 1];

        if (!id || isNaN(Number(id)) || !seasonNumber || isNaN(Number(seasonNumber))) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: { code: 'INVALID_ID', message: 'Valid TV ID and season number required.' } }));
        }

        try {
          const tmdbUrl = `https://api.tmdb.org/3/tv/${id}/season/${seasonNumber}?language=en-US`;
          const tmdbRes = await fetch(tmdbUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json',
            }
          });
          
          if (!tmdbRes.ok) throw new Error('Failed to fetch season details');
          
          const season = await tmdbRes.json() as any;
          const episodes = (season.episodes || []).map((ep: any) => ({
            id: ep.id,
            episodeNumber: ep.episode_number,
            title: ep.name,
            airDate: ep.air_date || null,
            overview: ep.overview || '',
            stillPath: ep.still_path || null,
          }));
          
          res.statusCode = 200;
          return res.end(JSON.stringify(episodes));
        } catch {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch season details.' } }));
        }
      }

      // If we reach here, 404 the API
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } }));
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    apiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'REX_Logo.png', 'pwa-icon-192.png', 'pwa-icon-512.png'],
      manifest: {
        name: 'REX.io',
        short_name: 'REX.io',
        description: 'REX.io — A premium movie and TV streaming web app. Discover, search, and watch movies and TV shows instantly.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0a0a0f',
        background_color: '#07070b',
        orientation: 'any',
        icons: [
          {
            src: '/pwa-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Only cache the app shell — HTML, JS, CSS, safe static assets
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff,woff2}'],
        // NEVER cache API, TMDB, streaming iframes, or external media
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // TMDB images — cache with StaleWhileRevalidate for poster/backdrop images
            urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'tmdb-images-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
