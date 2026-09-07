import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { MovieSearchResult } from '../../services/tmdb';
import { getImageUrl } from '../../utils/imageUrl';
import { watchlistService } from '../../services/watchlist';
import { useAuth } from '../../hooks/useAuth';
import './HeroMovie.css';

interface HeroMovieProps {
  movie: MovieSearchResult;
}

export function HeroMovie({ movie }: HeroMovieProps) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    setInWatchlist(watchlistService.isInWatchlistSync(movie.id));
    
    const handleWatchlistUpdate = () => {
      setInWatchlist(watchlistService.isInWatchlistSync(movie.id));
    };
    
    window.addEventListener('watchlist-updated', handleWatchlistUpdate);
    return () => window.removeEventListener('watchlist-updated', handleWatchlistUpdate);
  }, [movie.id, user]);

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      signInWithGoogle();
      return;
    }

    if (inWatchlist) {
      await watchlistService.removeMedia(movie.id, user.id);
    } else {
      await watchlistService.addMedia(movie, 'movie', user.id);
    }
  };

  const backdropUrl = getImageUrl(movie.backdropPath || movie.posterPath, 'original');

  return (
    <div className="hero-container">
      {backdropUrl ? (
        <img src={backdropUrl} alt={movie.title} className="hero-backdrop" />
      ) : (
        <div className="hero-backdrop placeholder"></div>
      )}
      
      <div className="hero-vignette"></div>
      
      <div className="hero-content">
        <h1 className="hero-title">{movie.title}</h1>
        
        <div className="hero-meta">
          {movie.year && <span className="hero-year">{movie.year}</span>}
          <span className="hero-type">Movie</span>
        </div>
        
        {movie.overview && (
          <p className="hero-overview">
            {movie.overview.length > 200 
              ? movie.overview.substring(0, 200) + '...' 
              : movie.overview}
          </p>
        )}
        
        <div className="hero-actions">
          <Link to={`/watch/movie/${movie.id}`} className="hero-btn primary">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Now
          </Link>
          
          <button className={`hero-btn secondary ${inWatchlist ? 'active' : ''}`} onClick={handleWatchlistClick}>
            {inWatchlist ? (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                In Watchlist
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Watchlist
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
