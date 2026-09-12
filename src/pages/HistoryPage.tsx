import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGuestStore } from '../hooks/useGuestStore';
import { MovieCard } from '../components/movies/MovieCard';
import { getMovieDetails, getTvDetails, type MediaSearchResult } from '../services/tmdb';
import './HistoryPage.css';
import './WatchlistPage.css'; // Reusing collection grid styles

export function HistoryPage() {
  const { history, clearHistory } = useGuestStore();
  const [items, setItems] = useState<MediaSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function fetchMetadata() {
      if (history.length === 0) {
        if (mounted) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      
      setLoading(true);
      try {
        const results = await Promise.all(
          history.map(async (item) => {
            try {
              const data = item.mediaType === 'tv' 
                ? await getTvDetails(item.tmdbId) 
                : await getMovieDetails(item.tmdbId);
              
              if (data) {
                // Merge TMDB metadata with history state (season, episode)
                return {
                  ...data,
                  mediaType: item.mediaType,
                  // Hack to display season/episode in the MovieCard year slot
                  year: item.mediaType === 'tv' && item.season != null
                    ? `S${item.season} E${item.episode}`
                    : data.year
                } as MediaSearchResult;
              }
            } catch (err) {
              console.error(`Failed to fetch ${item.mediaType} ${item.tmdbId}`, err);
            }
            return null;
          })
        );
        
        if (mounted) {
          setItems(results.filter((res): res is MediaSearchResult => res !== null));
        }
      } catch (err) {
        console.error('Failed to load history metadata', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchMetadata();
    
    return () => {
      mounted = false;
    };
  }, [history]);

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
        {loading ? (
          <div className="collection-loading" style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
            Loading history...
          </div>
        ) : history.length === 0 ? (
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
            {items.map((movie) => (
              <MovieCard 
                key={`${movie.mediaType}_${movie.id}`} 
                movie={movie} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
