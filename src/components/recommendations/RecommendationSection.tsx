import { useEffect, useState } from 'react';
import { getRecommendations, type MovieSearchResult } from '../../services/tmdb';
import { MovieCard } from '../movies/MovieCard';
import './RecommendationSection.css';

interface RecommendationSectionProps {
  tmdbId: number;
}

export function RecommendationSection({ tmdbId }: RecommendationSectionProps) {
  const [recommendations, setRecommendations] = useState<MovieSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    
    setIsLoading(true);
    setError(false);

    getRecommendations(tmdbId, controller.signal)
      .then(results => {
        setRecommendations(results);
        setIsLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Failed to load recommendations', err);
          setError(true);
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [tmdbId]);

  if (error || (!isLoading && recommendations.length === 0)) {
    return null; // Gracefully degrade if unavailable or empty
  }

  return (
    <section className="recommendations-section">
      <h2 className="recommendations-title">You might also like</h2>
      
      <div className="recommendations-grid">
        {isLoading ? (
          // Skeleton loaders
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="recommendation-placeholder-card">
               <div className="recommendation-placeholder-poster"></div>
            </div>
          ))
        ) : (
          recommendations.map(movie => (
            <MovieCard key={movie.id} movie={movie} />
          ))
        )}
      </div>
    </section>
  );
}
