import react from '@vitejs/plugin-react';
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
      const handleTmdbRequest = async (tmdbPath: string, queryParams: URLSearchParams = new URLSearchParams()) => {
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
          const results = (data.results || []).slice(0, 20).map((movie: any) => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : null,
            posterPath: movie.poster_path || null,
            backdropPath: movie.backdrop_path || null,
            overview: movie.overview || '',
          }));

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

      // If we reach here, 404 the API
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } }));
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
});
