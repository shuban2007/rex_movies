import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  searchContent,
  getDiscoveryContent,
  type DiscoveryItem,
  type ContentType,
  type SearchIntent,
  type IntentChip
} from '../services/discoveryEngine';
import { MovieCard } from '../components/movies/MovieCard';
import { SearchIcon } from '../components/common/Icons';
import './SearchResultsPage.css';

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const rawQuery = searchParams.get('q') || '';
  const query = rawQuery.trim();
  const type = (searchParams.get('type') as ContentType) || 'all';
  const sort = (searchParams.get('sort') as 'relevance' | 'trending' | 'latest') || (query ? 'relevance' : 'trending');

  const [results, setResults] = useState<DiscoveryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [didYouMean, setDidYouMean] = useState<string | undefined>();
  const [detectedIntent, setDetectedIntent] = useState<SearchIntent | undefined>();
  const [removedChipIds, setRemovedChipIds] = useState<string[]>([]);

  // Keep track of the active request and active query to avoid race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeQueryRef = useRef<string>(query);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async (
    targetPage: number,
    isNewSearch: boolean,
    currentQuery: string,
    currentType: ContentType,
    currentSort: 'relevance' | 'trending' | 'latest',
    activeRemovedChipIds: string[]
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    activeQueryRef.current = currentQuery;
    await Promise.resolve();
    if (controller.signal.aborted || activeQueryRef.current !== currentQuery) return;

    setIsLoading(true);
    setError(false);
    if (isNewSearch) {
      setResults([]);
    }

    try {
      let fetchedResults: DiscoveryItem[] = [];
      
      if (currentQuery) {
        // If user removed a genre chip, genreId is 0 (explicitly disabled).
        // Otherwise undefined so the discovery engine uses inferred intent genre if present.
        const hasRemovedGenre = activeRemovedChipIds.some(id => id.startsWith('genre-'));
        const genreOption = hasRemovedGenre ? 0 : undefined;

        const res = await searchContent(currentQuery, {
          page: targetPage,
          type: currentType,
          sort: currentSort,
          genreId: genreOption,
          signal: controller.signal
        });

        // Guard against aborted or superseded requests
        if (controller.signal.aborted || activeQueryRef.current !== currentQuery) {
          return;
        }

        fetchedResults = res.results;
        setDidYouMean(res.didYouMean);
        if (isNewSearch) {
          setDetectedIntent(res.intent);
          setPage(1);
        }
      } else {
        // Discovery mode (no pagination support on discovery, just page 1)
        if (targetPage === 1) {
          fetchedResults = await getDiscoveryContent({
            type: currentType,
            sort: currentSort,
            signal: controller.signal
          });

          if (controller.signal.aborted || activeQueryRef.current !== currentQuery) {
            return;
          }

          setDidYouMean(undefined);
          setDetectedIntent(undefined);
          if (isNewSearch) {
            setPage(1);
          }
        } else {
          setHasMore(false);
          setIsLoading(false);
          return;
        }
      }

      if (controller.signal.aborted || activeQueryRef.current !== currentQuery) {
        return;
      }

      setResults(prev => {
        if (isNewSearch) return fetchedResults;
        
        // Deduplicate across pages
        const uniqueMap = new Map<string, DiscoveryItem>();
        prev.forEach(item => uniqueMap.set(`${item.mediaType}-${item.id}`, item));
        fetchedResults.forEach(item => uniqueMap.set(`${item.mediaType}-${item.id}`, item));
        return Array.from(uniqueMap.values());
      });

      // TMDB pages usually have 20 items. If we get less, we've likely hit the end.
      if (fetchedResults.length < 20 && currentQuery) {
        setHasMore(false);
      } else if (currentQuery) {
        setHasMore(true);
      }
      
      if (!currentQuery && targetPage === 1) {
        setHasMore(false);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message === 'Aborted' || controller.signal.aborted || activeQueryRef.current !== currentQuery) {
        return;
      }
      console.error('Search error:', err);
      setError(true);
    } finally {
      if (!controller.signal.aborted && activeQueryRef.current === currentQuery) {
        setIsLoading(false);
      }
    }
  }, []);

  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setRemovedChipIds([]);
  }

  // Fetch when query, type, sort, or removed chips change
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    fetchData(1, true, query, type, sort, removedChipIds);
  }, [query, type, sort, removedChipIds, fetchData]);

  const handleFilterChange = (newType: string) => {
    setPage(1);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('type', newType);
      return next;
    });
  };

  const handleSortChange = (newSort: string) => {
    setPage(1);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('sort', newSort);
      return next;
    });
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, false, query, type, sort, removedChipIds);
    }
  };

  const handleDidYouMeanClick = (suggested: string) => {
    setPage(1);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('q', suggested);
      return next;
    });
  };

  const handleRemoveChip = (chip: IntentChip) => {
    setRemovedChipIds(prev => [...prev, chip.id]);
    
    // If the chip was for mediaType, also update URL type param
    if (chip.type === 'mediaType') {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('type', 'all');
        return next;
      });
    }
    // If chip was for sort, revert sort param
    if (chip.type === 'sort') {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('sort', 'relevance');
        return next;
      });
    }
  };

  const handleRetry = () => {
    fetchData(page, page === 1, query, type, sort, removedChipIds);
  };

  // Active intent chips excluding removed ones
  const activeChips = (detectedIntent?.chips || []).filter(
    chip => !removedChipIds.includes(chip.id)
  );

  return (
    <div className="search-results-page">
      <div className="search-results-header">
        <h1 className="search-results-title">
          {query ? `Results for "${query}"` : 'Discover'}
        </h1>
        
        <div className="search-controls">
          <div className="search-filters">
            <button
              className={`search-filter-btn ${type === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            <button
              className={`search-filter-btn ${type === 'movie' ? 'active' : ''}`}
              onClick={() => handleFilterChange('movie')}
            >
              Movies
            </button>
            <button
              className={`search-filter-btn ${type === 'tv' ? 'active' : ''}`}
              onClick={() => handleFilterChange('tv')}
            >
              TV Series
            </button>
            <button
              className={`search-filter-btn ${type === 'anime' ? 'active' : ''}`}
              onClick={() => handleFilterChange('anime')}
            >
              Anime
            </button>
          </div>
          
          <div className="search-sort" ref={dropdownRef}>
            <div 
              className={`search-sort-trigger ${isDropdownOpen ? 'open' : ''}`}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{sort === 'relevance' ? 'Relevance' : sort === 'trending' ? 'Trending' : 'Latest'}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-sort-icon">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            {isDropdownOpen && (
              <div className="search-sort-dropdown">
                {query && (
                  <div 
                    className={`search-sort-option ${sort === 'relevance' ? 'active' : ''}`}
                    onClick={() => { handleSortChange('relevance'); setIsDropdownOpen(false); }}
                  >
                    Relevance
                  </div>
                )}
                <div 
                  className={`search-sort-option ${sort === 'trending' ? 'active' : ''}`}
                  onClick={() => { handleSortChange('trending'); setIsDropdownOpen(false); }}
                >
                  Trending
                </div>
                <div 
                  className={`search-sort-option ${sort === 'latest' ? 'active' : ''}`}
                  onClick={() => { handleSortChange('latest'); setIsDropdownOpen(false); }}
                >
                  Latest
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Intent Chips & Did You Mean Area */}
        {(activeChips.length > 0 || didYouMean) && (
          <div className="search-intent-bar">
            {activeChips.length > 0 && (
              <div className="search-intent-chips">
                <span className="search-intent-label">Inferred filters:</span>
                {activeChips.map(chip => (
                  <span key={chip.id} className="search-intent-chip">
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      className="search-chip-remove"
                      onClick={() => handleRemoveChip(chip)}
                      title={`Remove filter: ${chip.label}`}
                      aria-label={`Remove filter: ${chip.label}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {didYouMean && (
              <div className="search-did-you-mean-banner">
                Did you mean:
                <button
                  type="button"
                  className="search-did-you-mean-link"
                  onClick={() => handleDidYouMeanClick(didYouMean)}
                >
                  "{didYouMean}"
                </button>
                ?
              </div>
            )}
          </div>
        )}
      </div>

      <div className="search-results-content">
        {isLoading && page === 1 ? (
          <div className="search-results-grid">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="movie-card-skeleton"></div>
            ))}
          </div>
        ) : error && results.length === 0 ? (
          <div className="search-error-state">
            <h2>Something went wrong</h2>
            <p>We encountered an error while searching. Please try again.</p>
            <button
              className="search-retry-btn"
              onClick={handleRetry}
            >
              Retry
            </button>
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="search-results-grid">
              {results.map(item => (
                <MovieCard key={`${item.mediaType}-${item.id}`} movie={item} />
              ))}
            </div>
            
            {hasMore && (
              <div className="search-load-more">
                <button 
                  className="search-load-more-btn" 
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        ) : (
          !isLoading && (
            <div className="search-empty-state">
              <div className="search-empty-icon">
                <SearchIcon size={48} strokeWidth={1.5} />
              </div>
              <h2>No results found</h2>
              <p>We couldn't find anything matching your criteria. Try adjusting your filters or search terms.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
