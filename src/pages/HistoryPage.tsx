import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { historyService } from '../services/history';
import type { HistoryItem } from '../types/database';
import { MovieCard } from '../components/movies/MovieCard';
import { useAuth } from '../hooks/useAuth';
import './HistoryPage.css';
import './WatchlistPage.css'; // Reusing collection grid styles

export function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      setLoading(true);
      const data = await historyService.getHistory(user?.id);
      if (mounted) {
        setHistory(data);
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadHistory();
    }

    const handleUpdate = () => {
      loadHistory();
    };

    window.addEventListener('history-updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('history-updated', handleUpdate);
    };
  }, [user?.id, authLoading]);

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear your watch history?')) {
      await historyService.clearHistory(user?.id);
    }
  };

  if (authLoading) return null;

  return (
    <div className="collection-page">
      <div className="collection-header history-header">
        <div>
          <h1 className="collection-title">Recently Watched</h1>
          <p className="collection-subtitle">Continue where you left off.</p>
        </div>
        
        {history.length > 0 && !loading && (
          <button className="clear-history-btn" onClick={handleClear}>
            Clear History
          </button>
        )}
      </div>

      <div className="collection-content">
        {loading ? (
          <div className="collection-empty">
            <p>Loading your history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="collection-empty">
            <div className="empty-icon">◷</div>
            <h2>No watch history yet.</h2>
            <p>Movies you watch will appear here.</p>
            <Link to="/" className="discover-btn">
              Discover Movies
            </Link>
          </div>
        ) : (
          <div className="collection-grid">
            {history.map((movie) => (
              <MovieCard 
                key={movie.id} 
                movie={{
                  id: movie.tmdb_id,
                  title: movie.title,
                  year: movie.year,
                  posterPath: movie.poster_path,
                  backdropPath: null,
                  overview: ''
                }} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
