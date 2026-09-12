import { MovieCard } from './MovieCard';
import type { MediaSearchResult } from '../../services/tmdb';
import './MovieRow.css';

interface MovieRowProps {
  title: string;
  movies: MediaSearchResult[];
}

export function MovieRow({ title, movies }: MovieRowProps) {
  if (movies.length === 0) return null;

  return (
    <section className="movie-row-section">
      <div className="movie-row-header">
        <h2 className="movie-row-title">{title}</h2>
        {/* Optional: Add "See all ->" link here later if needed */}
      </div>
      
      <div className="movie-row-container">
        <div className="movie-row-scroll">
          {movies.map(movie => (
            <div key={movie.id} className="movie-row-item">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
