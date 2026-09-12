import { Link } from 'react-router-dom';
import type { MovieSearchResult } from '../../services/tmdb';
import { getImageUrl } from '../../utils/imageUrl';
import { useGuestStore } from '../../hooks/useGuestStore';
import './HeroMovie.css';

interface HeroMovieProps {
  movie: MovieSearchResult;
}

export function HeroMovie({ movie }: HeroMovieProps) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useGuestStore();

  const inWatchlist = isInWatchlist(movie.id, 'movie');

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (inWatchlist) {
      removeFromWatchlist(movie.id, 'movie');
    } else {
      addToWatchlist(movie, 'movie');
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
