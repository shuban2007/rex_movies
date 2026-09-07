import { useState, useRef, useCallback, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies, SearchError, type MovieSearchResult } from '../../services/tmdb';
import { getImageUrl } from '../../utils/imageUrl';
import './MovieSearch.css';

export function MovieSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<MovieSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setShowDropdown(true);
    setError('');

    try {
      const movieResults = await searchMovies(trimmed, controller.signal);

      if (!controller.signal.aborted) {
        setResults(movieResults);
        setIsSearching(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setIsSearching(false);
        if (err instanceof SearchError) {
          setError(err.message);
        } else {
          setError('Search service unavailable. Please try again.');
        }
      }
    }
  }, []);

  const handleSubmit = useCallback((e?: FormEvent) => {
    e?.preventDefault();
    executeSearch(query);
  }, [query, executeSearch]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch(query);
    }
  }, [query, executeSearch]);

  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    setQuery('');
    setIsSearching(false);
    setError('');
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }, []);

  const handleResultClick = (movieId: number) => {
    navigate(`/watch/${movieId}`);
    setShowDropdown(false);
    setQuery('');
    setResults([]);
  };

  const showClear = query.length > 0;

  return (
    <div className="navbar-search-container" ref={containerRef}>
      <form className="navbar-search-form" onSubmit={handleSubmit} role="search">
        <div className="navbar-search-bar">
          <svg className="navbar-search-icon" width="16" height="16" viewBox="0 0 18 18" fill="none">
            <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12.5 12.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            className="navbar-search-input"
            placeholder="Search movies..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length > 0) {
                executeSearch(e.target.value);
              } else {
                setResults([]);
                setShowDropdown(false);
              }
            }}
            onFocus={() => {
              if (query.trim().length > 0) setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />

          {showClear && !isSearching && (
            <button type="button" className="navbar-search-clear-btn" onClick={handleClear}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {isSearching && <span className="navbar-search-spinner" />}
        </div>
      </form>

      {showDropdown && (query.trim().length > 0 || isSearching) && (
        <div className="navbar-search-dropdown">
          {error ? (
            <div className="navbar-search-message error">{error}</div>
          ) : isSearching && results.length === 0 ? (
            <div className="navbar-search-message">Searching...</div>
          ) : results.length > 0 ? (
            <ul className="navbar-search-results-list">
              {results.slice(0, 8).map(movie => {
                const poster = getImageUrl(movie.posterPath, 'w92');
                return (
                  <li 
                    key={movie.id} 
                    className="navbar-search-result-item"
                    onClick={() => handleResultClick(movie.id)}
                  >
                    {poster ? (
                      <img src={poster} alt={movie.title} className="navbar-search-result-poster" loading="lazy" />
                    ) : (
                      <div className="navbar-search-result-poster-placeholder">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z" />
                        </svg>
                      </div>
                    )}
                    <div className="navbar-search-result-info">
                      <div className="navbar-search-result-title">{movie.title}</div>
                      <div className="navbar-search-result-year">
                        {movie.year || 'Unknown year'}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="navbar-search-message">No movies found.</div>
          )}
        </div>
      )}
    </div>
  );
}
