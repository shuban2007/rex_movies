import { Link } from 'react-router-dom';
import { useGuestStore } from '../hooks/useGuestStore';
import { MovieCard } from '../components/movies/MovieCard';
import './WatchlistPage.css';

export function WatchlistPage() {
  const { watchlist } = useGuestStore();

  return (
    <div className="collection-page">
      <div className="collection-header">
        <h1 className="collection-title">Your Watchlist</h1>
        <p className="collection-subtitle">Movies you've saved for later.</p>
      </div>

      <div className="collection-content">
        {watchlist.length === 0 ? (
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
            {watchlist.map((movie) => (
              <MovieCard 
                key={movie.id} 
                movie={{
                  id: movie.tmdb_id,
                  mediaType: movie.media_type || 'movie',
                  title: movie.title,
                  year: movie.year,
                  posterPath: movie.poster_path,
                  backdropPath: movie.backdrop_path,
                  overview: ''
                } as any} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
