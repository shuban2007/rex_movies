import { useState, useRef, useMemo } from 'react';
import type { MediaSearchResult } from '../../services/tmdb';
import { 
  getPreferenceRecommendations, 
  getRandomRecommendation,
} from '../../services/watchRandom';
import type { ContentType } from '../../services/watchRandom';
import { getCompatibleMoods } from '../../config/watchRandomCompatibility';
import {
  WATCH_RANDOM_MOVIE_GENRES,
  WATCH_RANDOM_TV_GENRES,
  WATCH_RANDOM_ANIME_GENRES,
  WATCH_RANDOM_MOODS
} from '../../config/watchRandomConfig';
import { MovieCard } from './MovieCard';
import './WatchRandomModal.css';

interface WatchRandomModalProps {
  onClose: () => void;
}

type Step = 'type' | 'mode' | 'preferences' | 'loading' | 'results';
type Mode = 'random' | 'preferences';

export function WatchRandomModal({ onClose }: WatchRandomModalProps) {
  
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<ContentType | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  
  // Preferences State
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedEra, setSelectedEra] = useState<string>('any');
  const [selectedRating, setSelectedRating] = useState<string>('any');
  const [selectedRuntime, setSelectedRuntime] = useState<string>('any');
  const [selectedStatus, setSelectedStatus] = useState<string>('any');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const [results, setResults] = useState<MediaSearchResult[]>([]);
  const [error, setError] = useState<boolean>(false);
  
  const seenIdsRef = useRef<Set<number>>(new Set());

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const resetPreferences = () => {
    setSelectedGenres([]);
    setSelectedEra('any');
    setSelectedRating('any');
    setSelectedRuntime('any');
    setSelectedStatus('any');
    setSelectedMood(null);
  };

  const handleTypeSelect = (t: ContentType) => {
    setType(t);
    setStep('mode');
  };

  const handleModeSelect = (m: Mode) => {
    setMode(m);
    if (m === 'random') {
      executeRandom(type!);
    } else {
      resetPreferences();
      setStep('preferences');
    }
  };

  const executeRandom = async (t: ContentType) => {
    setStep('loading');
    setError(false);
    
    const result = await getRandomRecommendation(t, seenIdsRef.current);
    if (result) {
      seenIdsRef.current.add(result.id);
      setResults([result]);
    } else {
      setError(true);
    }
    setStep('results');
  };

  const executePreferences = async () => {
    setStep('loading');
    setError(false);

    if (!type) return;

    const fetched = await getPreferenceRecommendations(type, {
      genres: selectedGenres,
      era: selectedEra,
      rating: selectedRating,
      runtime: selectedRuntime,
      status: selectedStatus,
      mood: selectedMood
    });
    
    if (fetched.length > 0) {
      setResults(fetched);
      // If the user selected lots of things but we only got back popular stuff, it's a fallback.
      // We don't have a strict flag from the service yet, but we can assume success.
    } else {
      setResults([]);
      setError(true);
    }
    setStep('results');
  };

  const handleGoBack = () => {
    if (step === 'mode') setStep('type');
    else if (step === 'preferences') setStep('mode');
    else if (step === 'results' && mode === 'preferences') setStep('preferences');
    else if (step === 'results' && mode === 'random') setStep('mode');
  };

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(id)) {
        return prev.filter(g => g !== id);
      }
      if (prev.length >= 2) {
        // Replace oldest
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  // Determine compatible moods
  const compatibleMoods = useMemo(() => getCompatibleMoods(selectedGenres), [selectedGenres]);

  const handleMoodSelect = (moodId: string) => {
    if (!compatibleMoods.includes(moodId)) return;
    setSelectedMood(moodId === selectedMood ? null : moodId);
  };

  return (
    <div className="watch-random-overlay" onClick={handleBackdropClick}>
      <div className="watch-random-modal">
        <div className="watch-random-header">
          {step !== 'type' && step !== 'loading' ? (
            <button className="watch-random-back" onClick={handleGoBack} aria-label="Go Back">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"></path></svg> Back
            </button>
          ) : (
            <div className="watch-random-header-placeholder"></div>
          )}
          <button className="watch-random-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="watch-random-content hide-scrollbar">
          {step === 'type' && (
            <div className="watch-random-step fade-in">
              <h2>What do you want to watch?</h2>
              <div className="watch-random-choices">
                <button onClick={() => handleTypeSelect('movie')}>🎬 Movie</button>
                <button onClick={() => handleTypeSelect('anime')}>🍿 Anime</button>
                <button onClick={() => handleTypeSelect('tv')}>📺 TV Series</button>
              </div>
            </div>
          )}

          {step === 'mode' && (
            <div className="watch-random-step fade-in">
              <h2>How do you want to find it?</h2>
              <div className="watch-random-choices">
                <button onClick={() => handleModeSelect('random')}>🎲 Random</button>
                <button onClick={() => handleModeSelect('preferences')}>✨ Choose Preferences</button>
              </div>
            </div>
          )}

          {step === 'preferences' && (
            <div className="watch-random-step preferences-step fade-in">
              <h2>What are you in the mood for?</h2>
              
              <div className="preferences-scroll-area hide-scrollbar">
                <div className="preference-group">
                  <h3>Genre <span className="preference-hint">(up to 2)</span></h3>
                  <div className="preference-chips">
                    {(type === 'movie' ? WATCH_RANDOM_MOVIE_GENRES : type === 'tv' ? WATCH_RANDOM_TV_GENRES : WATCH_RANDOM_ANIME_GENRES).map(genre => (
                      <button 
                        key={genre.id} 
                        className={`preference-chip ${selectedGenres.includes(genre.id) ? 'selected' : ''}`}
                        onClick={() => toggleGenre(genre.id)}
                      >
                        {genre.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="preference-group">
                  <h3>Mood</h3>
                  <div className="preference-chips">
                    {WATCH_RANDOM_MOODS.map(mood => {
                      const isCompatible = compatibleMoods.includes(mood.id);
                      return (
                        <button 
                          key={mood.id} 
                          title={!isCompatible ? "Few matches with your current genres" : ""}
                          className={`preference-chip ${selectedMood === mood.id ? 'selected' : ''} ${!isCompatible ? 'disabled' : ''}`}
                          onClick={() => handleMoodSelect(mood.id)}
                        >
                          {mood.name}
                        </button>
                      );
                    })}
                  </div>
                </div>


              </div>

              <div className="watch-random-actions">
                <button className="watch-random-submit" onClick={executePreferences}>Find Recommendations</button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="watch-random-step loading-step fade-in">
              <div className="loading-spinner"></div>
              <h2>Finding something for you...</h2>
            </div>
          )}

          {step === 'results' && (
            <div className="watch-random-step results-step fade-in">
              {error || results.length === 0 ? (
                <div className="results-empty">
                  <h2>Couldn't find a match.</h2>
                  <p>Try tweaking your preferences.</p>
                  <button className="watch-random-submit" onClick={handleGoBack}>Try Again</button>
                </div>
              ) : (
                <div className="results-container">
                  <h2>{mode === 'random' ? 'We recommend' : 'Based on your choices'}</h2>
                  <div className="results-grid">
                    {results.map(movie => (
                      <MovieCard key={movie.id} movie={movie} />
                    ))}
                  </div>
                  {mode === 'random' && (
                    <button className="watch-random-submit secondary" onClick={() => executeRandom(type!)}>Spin Again 🎲</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
