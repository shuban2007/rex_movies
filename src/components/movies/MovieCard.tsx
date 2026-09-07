import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { MovieSearchResult } from '../../services/tmdb';
import { getImageUrl } from '../../utils/imageUrl';
import { watchlistService } from '../../services/watchlist';
import { useAuth } from '../../hooks/useAuth';
import './MovieCard.css';

interface MovieCardProps {
  movie: MovieSearchResult;
}

export function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    // Initial sync check based on cached data
    setInWatchlist(watchlistService.isInWatchlistSync(movie.id));
    
    const handleWatchlistUpdate = () => {
      setInWatchlist(watchlistService.isInWatchlistSync(movie.id));
    };
    
    window.addEventListener('watchlist-updated', handleWatchlistUpdate);
    return () => window.removeEventListener('watchlist-updated', handleWatchlistUpdate);
  }, [movie.id, user]);

  const handleCardClick = () => {
    navigate(`/watch/${movie.id}`);
  };

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    if (inWatchlist) {
      await watchlistService.removeMovie(movie.id, user.id);
    } else {
      await watchlistService.addMovie(movie, user.id);
    }
  };

  const posterUrl = getImageUrl(movie.posterPath, 'w500');

  return (
    <div 
      className="movie-card" 
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div className="movie-card-poster-wrapper">
        {posterUrl ? (
          <img 
            src={posterUrl} 
            alt={movie.title} 
            className="movie-card-poster" 
            loading="lazy" 
          />
        ) : (
          <div className="movie-card-poster placeholder">
            <span>No Image</span>
          </div>
        )}
        
        <div className="movie-card-overlay">
          <div className="play-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        
        <button 
          className={`watchlist-btn ${inWatchlist ? 'active' : ''}`}
          onClick={handleWatchlistClick}
          aria-label={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
        >
          {inWatchlist ? '♥' : '♡'}
        </button>

        {showAuthPrompt && (
          <div className="auth-prompt-overlay" onClick={(e) => e.stopPropagation()}>
            <p>Sign in to add movies to your watchlist.</p>
            <button className="auth-prompt-btn" onClick={() => signInWithGoogle()}>
              Sign in with Google
            </button>
            <button className="auth-prompt-close" onClick={(e) => {
              e.stopPropagation();
              setShowAuthPrompt(false);
            }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="movie-card-info">
        <h3 className="movie-card-title">{movie.title}</h3>
        {movie.year && <span className="movie-card-year">{movie.year}</span>}
      </div>
    </div>
  );
}
