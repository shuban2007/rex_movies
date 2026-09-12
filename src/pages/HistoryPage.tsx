import { Link } from 'react-router-dom';
import { useGuestStore } from '../context/GuestStoreContext';
import { MovieCard } from '../components/movies/MovieCard';
import './HistoryPage.css';
import './WatchlistPage.css'; // Reusing collection grid styles

export function HistoryPage() {
  const { history, clearHistory } = useGuestStore();

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your watch history?')) {
      clearHistory();
    }
  };

  return (
    <div className="collection-page">
      <div className="collection-header history-header">
        <div>
          <h1 className="collection-title">Recently Watched</h1>
          <p className="collection-subtitle">Continue where you left off.</p>
        </div>
        
        {history.length > 0 && (
          <button className="clear-history-btn" onClick={handleClear}>
            Clear History
          </button>
        )}
      </div>

      <div className="collection-content">
        {history.length === 0 ? (
          <div className="collection-empty">
            <div className="empty-icon">◷</div>
            <h2>No watch history yet.</h2>
            <p>Content you watch will appear here.</p>
            <Link to="/" className="discover-btn">
              Discover Content
            </Link>
          </div>
        ) : (
          <div className="collection-grid">
            {history.map((movie) => (
              <MovieCard 
                key={movie.id} 
                movie={{
                  id: movie.tmdb_id,
                  mediaType: movie.media_type || 'movie',
                  title: movie.media_type === 'tv' 
                    ? `${movie.title}` 
                    : movie.title,
                  year: movie.media_type === 'tv' && movie.season_number != null
                    ? `S${movie.season_number} E${movie.episode_number}${movie.episode_title ? ` - ${movie.episode_title}` : ''}`
                    : movie.year,
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
