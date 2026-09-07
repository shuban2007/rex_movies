import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { getMovieDetails, type MovieSearchResult } from '../services/tmdb';
import { RecommendationSection } from '../components/recommendations/RecommendationSection';
import { historyService } from '../services/history';
import { watchlistService } from '../services/watchlist';
import { useAuth } from '../hooks/useAuth';
import './WatchPage.css';

export function WatchPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const [movie, setMovie] = useState<MovieSearchResult | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  
  const { user } = useAuth();

  const numericId = tmdbId ? parseInt(tmdbId, 10) : null;
  const isValidId = numericId !== null && !isNaN(numericId) && numericId > 0;

  useEffect(() => {
    let mounted = true;
    
    async function loadMovieAndRecord() {
      if (!isValidId || !numericId) return;
      
      try {
        const data = await getMovieDetails(numericId);
        if (mounted && data) {
          setMovie(data);
          
          // Asynchronously record history without blocking player
          historyService.recordMovie(data, user?.id);
          
          // Set initial watchlist state synchronously from cache
          setInWatchlist(watchlistService.isInWatchlistSync(data.id));
        }
      } catch (err) {
        console.error('Failed to load movie for history recording:', err);
      }
    }

    loadMovieAndRecord();
    
    const handleWatchlistUpdate = () => {
      if (movie && mounted) {
        setInWatchlist(watchlistService.isInWatchlistSync(movie.id));
      }
    };
    
    window.addEventListener('watchlist-updated', handleWatchlistUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('watchlist-updated', handleWatchlistUpdate);
    };
  }, [isValidId, numericId, user?.id, movie?.id]);

  const toggleWatchlist = async () => {
    if (!movie) return;

    if (inWatchlist) {
      await watchlistService.removeMovie(movie.id, user?.id);
    } else {
      await watchlistService.addMovie(movie, user?.id);
    }
  };

  if (!isValidId) {
    return (
      <div className="watch-page-error">
        <h1>Invalid Movie ID</h1>
        <p>The requested movie could not be found.</p>
        <Link to="/" className="back-link">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="watch-page">
      <div className="watch-content-container">
        <div className="watch-header-nav">
          <Link to="/" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Browse
          </Link>
        </div>

        <div className="watch-main-layout">
          <div className="player-section">
            <VideoPlayer tmdbId={numericId} />
          </div>

          {movie && (
            <div className="movie-details-section">
              {(movie.backdropPath || movie.posterPath) && (
                <div className="movie-image-wrapper">
                  <img 
                    src={`https://image.tmdb.org/t/p/w780${movie.backdropPath || movie.posterPath}`} 
                    alt={movie.title} 
                    className="movie-details-img" 
                  />
                </div>
              )}
              
              <h1 className="movie-title">{movie.title}</h1>
              <p className="movie-metadata">
                {movie.year || ''} • Movie
              </p>
              
              {movie.overview && (
                <p className="movie-overview">{movie.overview}</p>
              )}
              
              <button 
                className={`watch-watchlist-btn ${inWatchlist ? 'active' : ''}`}
                onClick={toggleWatchlist}
                disabled={!movie}
              >
                {inWatchlist ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    In Watchlist
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    Add to Watchlist
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="recommendations-container">
          <RecommendationSection tmdbId={numericId} />
        </div>
      </div>
    </div>
  );
}
