import { useState, useRef, useCallback, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { searchContent, type DiscoveryItem } from '../../services/discoveryEngine';
import { SearchError } from '../../services/tmdb';
import { getImageUrl } from '../../utils/imageUrl';
import {
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  normalizeQuery,
} from '../../services/recentSearches';
import './MovieSearch.css';

export function MovieSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<DiscoveryItem[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [prevPathname, setPrevPathname] = useState(location.pathname);

  // 1. When navigating to the home page via route change (e.g. Back/Forward), reset state immediately during render
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    if (location.pathname === '/') {
      setQuery('');
      setResults([]);
      setDidYouMean(null);
      setError('');
      setShowDropdown(false);
    }
  }

  // 2. Reset whenever a home link or logo is clicked (even when already on '/')
  useEffect(() => {
    const handleClear = () => {
      setQuery('');
      setResults([]);
      setDidYouMean(null);
      setError('');
      setShowDropdown(false);
      abortRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };

    window.addEventListener('rexio-clear-search', handleClear);
    return () => window.removeEventListener('rexio-clear-search', handleClear);
  }, []);

  // Listen for outside clicks to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for storage / custom updates to keep recent searches reactive
  useEffect(() => {
    const syncSearches = () => {
      setRecentSearches(getRecentSearches());
    };

    window.addEventListener('rexio-recent-searches-updated', syncSearches);
    window.addEventListener('storage', syncSearches);

    return () => {
      window.removeEventListener('rexio-recent-searches-updated', syncSearches);
      window.removeEventListener('storage', syncSearches);
    };
  }, []);

  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setDidYouMean(null);
      setShowDropdown(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setShowDropdown(true);
    setError('');
    setDidYouMean(null);

    try {
      const searchRes = await searchContent(trimmed, { signal: controller.signal });

      if (!controller.signal.aborted) {
        setResults(searchRes.results);
        setDidYouMean(searchRes.didYouMean || null);
        setIsSearching(false);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message === 'Aborted' || controller.signal.aborted) return;
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

  const performSearchSubmission = useCallback((rawQuery: string) => {
    const normalized = normalizeQuery(rawQuery);
    if (!normalized) return;

    abortRef.current?.abort();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const updated = saveRecentSearch(normalized);
    setRecentSearches(updated);
    setShowDropdown(false);
    navigate(`/search?q=${encodeURIComponent(normalized)}`);
  }, [navigate]);

  const handleSubmit = useCallback((e?: FormEvent) => {
    e?.preventDefault();
    performSearchSubmission(query);
  }, [query, performSearchSubmission]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearchSubmission(query);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }, [query, performSearchSubmission]);

  const handleSelectRecent = useCallback((recentQuery: string) => {
    const normalized = normalizeQuery(recentQuery);
    if (!normalized) return;

    setQuery(normalized);
    performSearchSubmission(normalized);
  }, [performSearchSubmission]);

  const handleClearRecent = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
    setShowDropdown(false);
  }, []);

  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setQuery('');
    setIsSearching(false);
    setError('');
    setResults([]);
    setDidYouMean(null);

    const currentRecent = getRecentSearches();
    setRecentSearches(currentRecent);
    setShowDropdown(currentRecent.length > 0);
    inputRef.current?.focus();
  }, []);

  const handleResultClick = (id: number, mediaType: 'movie' | 'tv') => {
    navigate(`/watch/${mediaType}/${id}`);
    setShowDropdown(false);
    setQuery('');
    setResults([]);
  };

  const showClear = query.length > 0;
  const isQueryEmpty = query.trim().length === 0;
  const hasRecentSearches = isQueryEmpty && !isSearching && recentSearches.length > 0;
  const shouldShowDropdown = showDropdown && ((!isQueryEmpty || isSearching) || hasRecentSearches);

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
            placeholder="Search movies and TV shows..."
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);

              if (debounceRef.current) window.clearTimeout(debounceRef.current);

              if (val.trim().length > 0) {
                // Debounce for 300ms
                debounceRef.current = window.setTimeout(() => {
                  executeSearch(val);
                }, 300);
              } else {
                setResults([]);
                setDidYouMean(null);
                const currentRecent = getRecentSearches();
                setRecentSearches(currentRecent);
                setShowDropdown(currentRecent.length > 0);
              }
            }}
            onFocus={() => {
              const currentRecent = getRecentSearches();
              setRecentSearches(currentRecent);
              if (query.trim().length > 0) {
                setShowDropdown(true);
              } else if (currentRecent.length > 0) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />

          {showClear && !isSearching && (
            <button type="button" className="navbar-search-clear-btn" onClick={handleClear} aria-label="Clear search input">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {isSearching && <span className="navbar-search-spinner" />}
        </div>
      </form>

      {shouldShowDropdown && (
        <div className="navbar-search-dropdown" role="region" aria-label={hasRecentSearches ? 'Recent Searches' : 'Search Suggestions'}>
          {hasRecentSearches ? (
            <div className="navbar-search-recent-section">
              <div className="navbar-search-recent-header">
                <span className="navbar-search-recent-title">Recent Searches</span>
                <button
                  type="button"
                  className="navbar-search-recent-clear-btn"
                  onClick={handleClearRecent}
                  aria-label="Clear recent searches"
                >
                  Clear
                </button>
              </div>
              <ul className="navbar-search-recent-list" role="list">
                {recentSearches.map((item) => (
                  <li
                    key={item}
                    className="navbar-search-recent-item"
                    onClick={() => handleSelectRecent(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectRecent(item);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Search for ${item}`}
                  >
                    <svg
                      className="navbar-search-recent-icon"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="navbar-search-recent-text">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : error ? (
            <div className="navbar-search-message error">{error}</div>
          ) : isSearching && results.length === 0 ? (
            <div className="navbar-search-message">Searching...</div>
          ) : results.length > 0 ? (
            <>
              {didYouMean && (
                <div
                  className="navbar-search-did-you-mean"
                  onClick={() => {
                    setQuery(didYouMean);
                    executeSearch(didYouMean);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setQuery(didYouMean);
                      executeSearch(didYouMean);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  Did you mean <strong>"{didYouMean}"</strong>?
                </div>
              )}
              {results.length > 0 && !didYouMean && !results.some(r => r.title.toLowerCase() === query.trim().toLowerCase() || r.title.toLowerCase().includes(query.trim().toLowerCase())) && (
                <div className="navbar-search-might-like">
                  <div className="navbar-search-might-like-title">No exact matches found</div>
                  <div className="navbar-search-might-like-subtitle">You might like:</div>
                </div>
              )}
              <ul className="navbar-search-results-list">
                {results.slice(0, 8).map(result => {
                  const poster = getImageUrl(result.posterPath, 'w92');
                  return (
                    <li
                      key={`${result.mediaType}-${result.id}`}
                      className="navbar-search-result-item"
                      onClick={() => handleResultClick(result.id, result.mediaType)}
                    >
                      {poster ? (
                        <img src={poster} alt={result.title} className="navbar-search-result-poster" loading="lazy" />
                      ) : (
                        <div className="navbar-search-result-poster-placeholder">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z" />
                          </svg>
                        </div>
                      )}
                      <div className="navbar-search-result-info">
                        <div className="navbar-search-result-title">{result.title}</div>
                        <div className="navbar-search-result-year">
                          {result.year || 'Unknown year'} • {result.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {results.length > 0 && (
                <div
                  className="navbar-search-view-all"
                  onClick={() => performSearchSubmission(query)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      performSearchSubmission(query);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  View all results for "{query.trim()}"
                </div>
              )}
            </>
          ) : (
            <div className="navbar-search-message">
              {didYouMean ? (
                <div>
                  No results found.
                  <div
                    className="navbar-search-did-you-mean"
                    style={{ marginTop: '0.75rem', borderRadius: '6px' }}
                    onClick={() => {
                      setQuery(didYouMean);
                      executeSearch(didYouMean);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setQuery(didYouMean);
                        executeSearch(didYouMean);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    Did you mean <strong>"{didYouMean}"</strong>?
                  </div>
                </div>
              ) : (
                'No results found.'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
