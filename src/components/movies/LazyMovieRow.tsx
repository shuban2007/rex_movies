import { useState, useEffect, useRef } from 'react';
import { MovieRow } from './MovieRow';
import { getHomeSection } from '../../services/tmdb';
import type { MediaSearchResult } from '../../services/tmdb';
import type { HomeSectionConfig } from '../../config/homeSections';
import './LazyMovieRow.css';

interface LazyMovieRowProps {
  config: HomeSectionConfig;
  initialData?: MediaSearchResult[];
  seenIdsRef?: React.MutableRefObject<Set<number>>;
}

export function LazyMovieRow({ config, initialData, seenIdsRef }: LazyMovieRowProps) {
  const [movies, setMovies] = useState<MediaSearchResult[]>(initialData || []);
  const [hasLoaded, setHasLoaded] = useState(!!initialData);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasLoaded) return;

    const loadData = async () => {
      try {
        const results = await getHomeSection(config);
        
        let finalResults = results;
        if (seenIdsRef) {
          // Only keep movies we haven't seen yet in other rows
          finalResults = results.filter(movie => !seenIdsRef.current.has(movie.id));
          
          // Add these new movies to the seen list
          finalResults.forEach(movie => seenIdsRef.current.add(movie.id));
        }

        setMovies(finalResults);
        setHasLoaded(true);
      } catch (err) {
        console.error(`Failed to load section: ${config.title}`, err);
        setError(true);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadData();
          observer.disconnect();
        }
      },
      { rootMargin: '400px' } // Load slightly before it comes into view
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasLoaded, config, seenIdsRef]);

  if (error || (hasLoaded && movies.length === 0)) {
    return null; // Gracefully degrade if API fails or returns no results
  }

  if (!hasLoaded) {
    return (
      <section ref={containerRef} className="movie-row-section">
        <div className="movie-row-header">
          <h2 className="movie-row-title">{config.title}</h2>
        </div>
        <div className="movie-row-container">
          <div className="movie-row-scroll">
            {/* Skeleton Loaders */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="movie-row-item">
                <div className="recommendation-placeholder-card" style={{ width: '100%', aspectRatio: '2/3', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <div className="recommendation-placeholder-poster"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return <MovieRow title={config.title} movies={movies} />;
}
