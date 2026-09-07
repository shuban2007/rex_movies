import { useState, useEffect } from 'react';
import { HeroMovie } from '../components/hero/HeroMovie';
import { MovieRow } from '../components/movies/MovieRow';
import { 
  getTrendingMovies, 
  getPopularMovies, 
  getTopRatedMovies, 
  type MovieSearchResult 
} from '../services/tmdb';
import './HomePage.css';

export function HomePage() {
  const [trending, setTrending] = useState<MovieSearchResult[]>([]);
  const [popular, setPopular] = useState<MovieSearchResult[]>([]);
  const [topRated, setTopRated] = useState<MovieSearchResult[]>([]);

  useEffect(() => {
    // Fetch all sections independently
    const controller = new AbortController();

    Promise.allSettled([
      getTrendingMovies(controller.signal).then(setTrending),
      getPopularMovies(controller.signal).then(setPopular),
      getTopRatedMovies(controller.signal).then(setTopRated)
    ]).catch(console.error);

    return () => controller.abort();
  }, []);

  // Use the first valid trending movie with a backdrop for the Hero
  const heroMovie = trending.find(m => m.backdropPath) || trending[0];

  return (
    <div className="home-page">
      {/* ── HERO SECTION ── */}
      {heroMovie && (
        <HeroMovie movie={heroMovie} />
      )}

      <div className="home-content">
        <div className="discovery-sections">
          <MovieRow title="Trending Now" movies={trending} />
          <MovieRow title="Popular Movies" movies={popular} />
          <MovieRow title="Top Rated" movies={topRated} />
        </div>
      </div>
    </div>
  );
}
