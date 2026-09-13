import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchContent, getDiscoveryContent, type DiscoveryItem, type ContentType } from '../services/discoveryEngine';
import { MovieCard } from '../components/movies/MovieCard';
import './SearchResultsPage.css';

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const query = searchParams.get('q') || '';
  const type = (searchParams.get('type') as ContentType) || 'all';
  const sort = (searchParams.get('sort') as 'relevance' | 'trending' | 'latest') || (query ? 'relevance' : 'trending');

  const [results, setResults] = useState<DiscoveryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Keep track of the active request to avoid race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = useCallback(async (targetPage: number, isNewSearch: boolean, currentQuery: string, currentType: ContentType, currentSort: 'relevance' | 'trending' | 'latest') => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(false);

    try {
      let fetchedResults: DiscoveryItem[] = [];
      
      if (currentQuery.trim()) {
        const res = await searchContent(currentQuery, {
          page: targetPage,
          type: currentType,
          sort: currentSort,
          signal: controller.signal
        });
        fetchedResults = res.results;
      } else {
        // Discovery mode (no pagination support on discovery for now, just page 1)
        if (targetPage === 1) {
          fetchedResults = await getDiscoveryContent({ type: currentType, sort: currentSort, signal: controller.signal });
        } else {
          setHasMore(false);
          setIsLoading(false);
          return;
        }
      }

      if (!controller.signal.aborted) {
        setResults(prev => {
          if (isNewSearch) return fetchedResults;
          
          // Deduplicate
          const uniqueMap = new Map<string, DiscoveryItem>();
          prev.forEach(item => uniqueMap.set(`${item.mediaType}-${item.id}`, item));
          fetchedResults.forEach(item => uniqueMap.set(`${item.mediaType}-${item.id}`, item));
          return Array.from(uniqueMap.values());
        });

        // TMDB pages usually have 20 items. If we get less, we've likely hit the end.
        if (fetchedResults.length < 20 && currentQuery.trim()) {
          setHasMore(false);
        }
        
        if (!currentQuery.trim() && targetPage === 1) {
          setHasMore(false); // Discovery mode doesn't paginate yet
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
        setError(true);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);
  // Fetch logic
  useEffect(() => {
    // Reset state when query, type, or sort changes
    setResults([]);
    setPage(1);
    setHasMore(true);
    fetchData(1, true, query, type, sort);
  }, [query, type, sort, fetchData]);

  useEffect(() => {
    if (page > 1) {
      fetchData(page, false, query, type, sort);
    }
  }, [page, query, type, sort, fetchData]);

// removed fetchData definition here

  const handleFilterChange = (newType: string) => {
    setSearchParams(prev => {
      prev.set('type', newType);
      return prev;
    });
  };

  const handleSortChange = (newSort: string) => {
    setSearchParams(prev => {
      prev.set('sort', newSort);
      return prev;
    });
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      setPage(p => p + 1);
    }
  };

  return (
    <div className="search-results-page">
      <div className="search-results-header">
        <h1 className="search-results-title">
          {query ? `Results for "${query}"` : 'Discover'}
        </h1>
        
        <div className="search-controls">
          <div className="search-filters">
            <button className={`search-filter-btn ${type === 'all' ? 'active' : ''}`} onClick={() => handleFilterChange('all')}>All</button>
            <button className={`search-filter-btn ${type === 'movie' ? 'active' : ''}`} onClick={() => handleFilterChange('movie')}>Movies</button>
            <button className={`search-filter-btn ${type === 'tv' ? 'active' : ''}`} onClick={() => handleFilterChange('tv')}>TV Series</button>
            <button className={`search-filter-btn ${type === 'anime' ? 'active' : ''}`} onClick={() => handleFilterChange('anime')}>Anime</button>
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
      </div>

      <div className="search-results-content">
        {results.length > 0 ? (
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
              <div className="search-empty-icon">🔍</div>
              <h2>No results found</h2>
              <p>We couldn't find anything matching your criteria. Try adjusting your filters or search terms.</p>
            </div>
          )
        )}
        
        {isLoading && page === 1 && (
          <div className="search-results-grid">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="movie-card-skeleton"></div>
            ))}
          </div>
        )}
        
        {error && !isLoading && (
          <div className="search-error-state">
            <h2>Something went wrong</h2>
            <p>We encountered an error while searching. Please try again.</p>
            <button className="search-retry-btn" onClick={() => fetchData(page, page === 1, query, type, sort)}>Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}
