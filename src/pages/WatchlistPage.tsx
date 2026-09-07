import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { watchlistService } from '../services/watchlist';
import type { WatchlistItem } from '../types/database';
import { MovieCard } from '../components/movies/MovieCard';
import { useAuth } from '../hooks/useAuth';
import './WatchlistPage.css';

export function WatchlistPage() {
  const [movies, setMovies] = useState<WatchlistItem[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadWatchlist() {
      setLoading(true);
      const data = await watchlistService.getWatchlist(user?.id);
      if (mounted) {
        setMovies(data);
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadWatchlist();
    }

    const handleUpdate = () => {
      loadWatchlist();
    };

    window.addEventListener('watchlist-updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('watchlist-updated', handleUpdate);
    };
  }, [user?.id, authLoading]);

  if (authLoading) return null;

  return (
    <div className="collection-page">
      <div className="collection-header">
        <h1 className="collection-title">Your Watchlist</h1>
        <p className="collection-subtitle">Movies you've saved for later.</p>
      </div>

      <div className="collection-content">
        {loading ? (
          <div className="collection-empty">
            <p>Loading your watchlist...</p>
          </div>
        ) : movies.length === 0 ? (
          <div className="collection-empty">
            <div className="empty-icon">♡</div>
            <h2>Your watchlist is empty.</h2>
            <p>Movies you add will appear here.</p>
            <Link to="/" className="discover-btn">
              Discover Movies
            </Link>
          </div>
        ) : (
          <div className="collection-grid">
            {movies.map((movie) => (
              <MovieCard 
                key={movie.id} 
                movie={{
                  id: movie.tmdb_id,
                  mediaType: movie.media_type || 'movie',
                  title: movie.title,
                  year: movie.year,
                  posterPath: movie.poster_path,
                  backdropPath: movie.backdrop_path,
                  overview: '' // We don't store overview in DB currently
                } as any} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
