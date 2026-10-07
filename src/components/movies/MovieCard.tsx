import { useNavigate } from 'react-router-dom';
import type { MovieSearchResult, MediaSearchResult, TvSeriesDetails } from '../../services/tmdb';
import { getImageUrl } from '../../utils/imageUrl';
import { useGuestStore } from '../../hooks/useGuestStore';
import './MovieCard.css';

interface MovieCardProps {
  movie: MovieSearchResult | MediaSearchResult | TvSeriesDetails;
}

export function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useGuestStore();

  // Infer media type safely
  const mediaType = (movie as MediaSearchResult).mediaType || 'movie';

  // Derive synchronously from context to avoid cascade renders
  const inWatchlist = isInWatchlist(movie.id, mediaType);

  const handleCardClick = () => {
    navigate(`/watch/${mediaType}/${movie.id}`);
  };

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (inWatchlist) {
      removeFromWatchlist(movie.id, mediaType);
    } else {
      addToWatchlist(movie.id, mediaType);
    }
  };

  const posterPath = movie.posterPath || (movie as any).backdropPath;
  const posterUrl = getImageUrl(posterPath, 'w500');

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
        
        {movie.voteAverage !== undefined && movie.voteAverage > 0 && (
          <div className="movie-card-rating">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>{movie.voteAverage.toFixed(1)}</span>
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
      </div>

      <div className="movie-card-info">
        <h3 className="movie-card-title">{movie.title}</h3>
        {movie.year && <span className="movie-card-year">{movie.year}</span>}
      </div>
    </div>
  );
}
