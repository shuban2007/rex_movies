import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGuestStore } from '../hooks/useGuestStore';
import { MovieCard } from '../components/movies/MovieCard';
import { getMovieDetails, getTvDetails, type MediaSearchResult } from '../services/tmdb';
import './WatchlistPage.css';

export function WatchlistPage() {
  const { watchlist } = useGuestStore();
  const [items, setItems] = useState<MediaSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function fetchMetadata() {
      if (watchlist.length === 0) {
        if (mounted) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      
      setLoading(true);
      try {
        const results = await Promise.all(
          watchlist.map(async (item) => {
            try {
              const data = item.type === 'tv' 
                ? await getTvDetails(item.id) 
                : await getMovieDetails(item.id);
              
              if (data) {
                return {
                  ...data,
                  mediaType: item.type
                } as MediaSearchResult;
              }
            } catch (err) {
              console.error(`Failed to fetch ${item.type} ${item.id}`, err);
            }
            return null;
          })
        );
        
        if (mounted) {
          // Filter out failed fetches
          setItems(results.filter((res): res is MediaSearchResult => res !== null));
        }
      } catch (err) {
        console.error('Failed to load watchlist metadata', err);
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
  }, [watchlist]);

  return (
    <div className="collection-page">
      <div className="collection-header">
        <h1 className="collection-title">Your Watchlist</h1>
        <p className="collection-subtitle">Movies and TV shows you've saved for later.</p>
      </div>

      <div className="collection-content">
        {loading ? (
          <div className="collection-loading" style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
            Loading watchlist...
          </div>
        ) : watchlist.length === 0 ? (
          <div className="collection-empty">
            <div className="empty-icon">♡</div>
            <h2>Your watchlist is empty.</h2>
            <p>Content you add will appear here.</p>
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
