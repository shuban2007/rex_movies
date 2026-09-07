import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { getMovieDetails, getTvDetails, type MovieSearchResult, type TvSeriesDetails } from '../services/tmdb';
import { RecommendationSection } from '../components/recommendations/RecommendationSection';
import { EpisodeList } from '../components/tv/EpisodeList';
import { historyService } from '../services/history';
import { watchlistService } from '../services/watchlist';
import { useAuth } from '../hooks/useAuth';
import './WatchPage.css';

export function WatchPage() {
  const { mediaType = 'movie', tmdbId } = useParams<{ mediaType?: 'movie' | 'tv', tmdbId: string }>();
  const [media, setMedia] = useState<MovieSearchResult | TvSeriesDetails | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [activeEpisode, setActiveEpisode] = useState<number>(1);
  const [activeEpisodeTitle, setActiveEpisodeTitle] = useState<string>('');
  
  const { user } = useAuth();
  
  // Track synthetic progress (watch session time)
  const watchTimeSeconds = useRef<number>(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const numericId = tmdbId ? parseInt(tmdbId, 10) : null;
  const isValidId = numericId !== null && !isNaN(numericId) && numericId > 0;
  const isTv = mediaType === 'tv';

  useEffect(() => {
    let mounted = true;
    
    async function loadMediaAndHistory() {
      if (!isValidId || !numericId) return;
      
      try {
        let data: MovieSearchResult | TvSeriesDetails | null = null;
        let lastHistory = null;
        
        // Fetch history first to determine restore points
        const historyData = await historyService.getHistory(user?.id);
        
        if (isTv) {
          data = await getTvDetails(numericId);
          
          if (data && 'seasons' in data && data.seasons.length > 0) {
            // Find the most recent history for THIS tv show
            lastHistory = historyData.find(h => h.tmdb_id === numericId && h.media_type === 'tv');
            
            if (lastHistory && lastHistory.season_number != null && lastHistory.episode_number != null) {
              setActiveSeason(lastHistory.season_number);
              setActiveEpisode(lastHistory.episode_number);
              if (lastHistory.episode_title) setActiveEpisodeTitle(lastHistory.episode_title);
            } else {
              const firstValidSeason = data.seasons.find(s => s.seasonNumber > 0) || data.seasons[0];
              setActiveSeason(firstValidSeason.seasonNumber);
              setActiveEpisode(1);
            }
          }
        } else {
          data = await getMovieDetails(numericId);
        }

        if (mounted && data) {
          setMedia(data);
          setInWatchlist(watchlistService.isInWatchlistSync(data.id));
        }
      } catch (err) {
        console.error('Failed to load media or history:', err);
      }
    }

    loadMediaAndHistory();
    
    const handleWatchlistUpdate = () => {
      if (numericId && mounted) {
        setInWatchlist(watchlistService.isInWatchlistSync(numericId));
      }
    };
    
    window.addEventListener('watchlist-updated', handleWatchlistUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('watchlist-updated', handleWatchlistUpdate);
    };
  }, [isValidId, numericId, mediaType, isTv, user?.id]);

  // Separate effect to handle continuous progress recording
  useEffect(() => {
    if (!media) return;

    watchTimeSeconds.current = 0; // Reset timer when media or episode changes

    const saveProgress = () => {
      historyService.recordProgress(
        media, 
        isTv ? 'tv' : 'movie', 
        user?.id, 
        isTv ? activeSeason : undefined, 
        isTv ? activeEpisode : undefined, 
        activeEpisodeTitle || undefined,
        watchTimeSeconds.current
      );
    };

    // Save immediately upon mounting the episode
    saveProgress();

    // Start interval to track time spent watching (approximate progress)
    progressInterval.current = setInterval(() => {
      watchTimeSeconds.current += 15;
      saveProgress();
    }, 15000); // Record every 15 seconds

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      // Save one last time when unmounting or changing episode
      saveProgress();
    };
  }, [media, isTv, activeSeason, activeEpisode, activeEpisodeTitle, user?.id]);

  const toggleWatchlist = async () => {
    if (!media) return;

    if (inWatchlist) {
      await watchlistService.removeMedia(media.id, user?.id);
    } else {
      await watchlistService.addMedia(media, isTv ? 'tv' : 'movie', user?.id);
    }
  };

  // Helper to extract episode title from our custom list if needed
  const handleEpisodeSelect = (episode: number, title?: string) => {
    setActiveEpisode(episode);
    if (title) setActiveEpisodeTitle(title);
  };

  if (!isValidId) {
    return (
      <div className="watch-page-error">
        <h1>Invalid ID</h1>
        <p>The requested media could not be found.</p>
        <Link to="/" className="back-link">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="watch-page">
      <div className="watch-content-container">
        <div className="watch-header-nav">
          <Link to="/" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Browse
          </Link>
        </div>

        <div className="watch-main-layout">
          <div className="player-section">
            <VideoPlayer 
              tmdbId={numericId} 
              mediaType={isTv ? 'tv' : 'movie'}
              season={isTv ? activeSeason : undefined}
              episode={isTv ? activeEpisode : undefined}
            />
          </div>

          {media && (
            <div className="movie-details-section">
              <div className="movie-details-top">
                {(media.posterPath || media.backdropPath) && (
                  <div className="movie-image-wrapper">
                    <img 
                      src={`https://image.tmdb.org/t/p/w342${media.posterPath || media.backdropPath}`} 
                      alt={media.title} 
                      className="movie-details-img" 
                    />
                  </div>
                )}
                
                <div className="movie-info-content">
                  <h1 className="movie-title">{media.title}</h1>
                  <p className="movie-metadata">
                    {media.year || ''} • {isTv ? 'TV Series' : 'Movie'}
                    {isTv && 'seasons' in media && ` • ${media.seasons.length} Seasons`}
                  </p>
                  
                  {media.overview && (
                    <p className="movie-overview">{media.overview}</p>
                  )}
                </div>
              </div>
              
              <button 
                className={`watch-watchlist-btn ${inWatchlist ? 'active' : ''}`}
                onClick={toggleWatchlist}
                disabled={!media}
              >
                {inWatchlist ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    In Watchlist
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    Add to Watchlist
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {isTv && media && 'seasons' in media && numericId && (
          <EpisodeList 
            seriesId={numericId}
            seasons={(media as TvSeriesDetails).seasons}
            activeSeason={activeSeason}
            activeEpisode={activeEpisode}
            onSeasonChange={(s) => { setActiveSeason(s); setActiveEpisode(1); setActiveEpisodeTitle(''); }}
            onEpisodeSelect={(e, title) => handleEpisodeSelect(e, title)}
          />
        )}

        <div className="recommendations-container">
          <RecommendationSection tmdbId={numericId} />
        </div>
      </div>
    </div>
  );
}
