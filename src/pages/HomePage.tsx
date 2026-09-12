import { useState, useEffect, useRef } from 'react';
import { HeroMovie } from '../components/hero/HeroMovie';
import { LazyMovieRow } from '../components/movies/LazyMovieRow';
import { getHomeSection } from '../services/tmdb';
import type { MediaSearchResult } from '../services/tmdb';
import { homeSections } from '../config/homeSections';
import { WatchRandomModal } from '../components/movies/WatchRandomModal';
import './HomePage.css';

export function HomePage() {
  const [heroMovies, setHeroMovies] = useState<MediaSearchResult[]>([]);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const seenIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    
    // We only actively pre-fetch the Hero content (first section usually)
    const heroSection = homeSections[0];
    
    getHomeSection(heroSection, controller.signal)
      .then(results => {
        setHeroMovies(results);
        results.forEach(m => seenIdsRef.current.add(m.id));
      })
      .catch(console.error);

    return () => controller.abort();
  }, []);

  const heroMovie = heroMovies.find(m => m.backdropPath) || heroMovies[0];

  return (
    <div className="home-page">
      {/* ── HERO SECTION ── */}
      {heroMovie && (
        <HeroMovie movie={heroMovie} />
      )}

      <div className="home-content">
        <div className="watch-random-banner">
          <button className="watch-random-trigger" onClick={() => setIsRandomModalOpen(true)}>
            🎲 Watch Random
          </button>
        </div>

        <div className="discovery-sections">
          {homeSections.map((section, index) => {
            // First section is preloaded for hero, pass it down
            if (index === 0 && heroMovies.length > 0) {
              return (
                <LazyMovieRow 
                  key={section.id} 
                  config={section} 
                  initialData={heroMovies} 
                  seenIdsRef={seenIdsRef} 
                />
              );
            }
            
            return (
              <LazyMovieRow 
                key={section.id} 
                config={section} 
                seenIdsRef={seenIdsRef} 
              />
            );
          })}
        </div>
      </div>

      {isRandomModalOpen && (
        <WatchRandomModal onClose={() => setIsRandomModalOpen(false)} />
      )}
    </div>
  );
}
