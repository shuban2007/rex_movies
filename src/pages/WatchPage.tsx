import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { getMovieDetails, getTvDetails, getTvSeasonEpisodes, type MovieSearchResult, type TvSeriesDetails, type TvEpisode } from '../services/tmdb';
import { RecommendationSection } from '../components/recommendations/RecommendationSection';
import { EpisodeList } from '../components/tv/EpisodeList';
import { useGuestStore } from '../hooks/useGuestStore';
import './WatchPage.css';

export function WatchPage() {
  const { mediaType = 'movie', tmdbId } = useParams<{ mediaType?: 'movie' | 'tv', tmdbId: string }>();
  const [media, setMedia] = useState<MovieSearchResult | TvSeriesDetails | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [activeEpisode, setActiveEpisode] = useState<number>(1);
  const [activeEpisodeTitle, setActiveEpisodeTitle] = useState<string>('');
  const [currentEpisodes, setCurrentEpisodes] = useState<TvEpisode[]>([]);
  const [seriesComplete, setSeriesComplete] = useState(false);

  const { isInWatchlist, addToWatchlist, removeFromWatchlist, recordProgress, addOrUpdateHistory, history } = useGuestStore();

  // Track synthetic progress (watch session time)
  const watchTimeSeconds = useRef<number>(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guard to prevent duplicate episode advancement
  const advancingRef = useRef(false);

  const numericId = tmdbId ? parseInt(tmdbId, 10) : null;
  const isValidId = numericId !== null && !isNaN(numericId) && numericId > 0;
  const isTv = mediaType === 'tv';

  // ── Load media details and restore history position ──

  useEffect(() => {
    let mounted = true;
    
    async function loadMediaAndHistory() {
      if (!isValidId || !numericId) return;
      
      try {
        let data: MovieSearchResult | TvSeriesDetails | null = null;
        
        if (isTv) {
          data = await getTvDetails(numericId);
          
          if (data && 'seasons' in data && data.seasons.length > 0) {
            // Find most recent history for this TV show
            const lastHistory = history.find(h => h.tmdb_id === numericId && h.media_type === 'tv');
            
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
          setSeriesComplete(false);
        }
      } catch (err) {
        console.error('Failed to load media or history:', err);
      }
    }

    loadMediaAndHistory();
    
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidId, numericId, mediaType, isTv]);

  // ── Sync watchlist state ──

  useEffect(() => {
    if (numericId && media) {
      setInWatchlist(isInWatchlist(numericId, isTv ? 'tv' : 'movie'));
    }
  }, [numericId, media, isTv, isInWatchlist]);

  // ── Load episodes for current season ──

  useEffect(() => {
    if (!isTv || !numericId) return;
    let mounted = true;

    async function loadEpisodes() {
      try {
        const episodes = await getTvSeasonEpisodes(numericId!, activeSeason);
        if (mounted) {
          setCurrentEpisodes(episodes);
        }
      } catch (err) {
        console.error('Failed to load episodes for season', activeSeason, err);
      }
    }

    loadEpisodes();
    return () => { mounted = false; };
  }, [isTv, numericId, activeSeason]);

  // ── Continuous progress recording ──

  useEffect(() => {
    if (!media) return;

    watchTimeSeconds.current = 0;
    advancingRef.current = false;

    const saveProgress = () => {
      recordProgress(
        media, 
        isTv ? 'tv' : 'movie', 
        isTv ? activeSeason : undefined, 
        isTv ? activeEpisode : undefined, 
        activeEpisodeTitle || undefined,
        watchTimeSeconds.current
      );
    };

    // Save immediately upon mounting the episode
    saveProgress();

    // Track time spent watching
    progressInterval.current = setInterval(() => {
      watchTimeSeconds.current += 15;
      saveProgress();
    }, 15000);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      saveProgress();
    };
  }, [media, isTv, activeSeason, activeEpisode, activeEpisodeTitle, recordProgress]);

  // ── Episode advancement logic ──

  const advanceToNextEpisode = useCallback(async () => {
    if (!media || !isTv || !numericId || advancingRef.current) return;
    advancingRef.current = true;

    const tvMedia = media as TvSeriesDetails;
    
    // Save completed episode to history immediately
    addOrUpdateHistory(
      media,
      'tv',
      activeSeason,
      activeEpisode,
      activeEpisodeTitle || undefined,
      watchTimeSeconds.current
    );

    // Check if there's a next episode in current season
    const currentEpIndex = currentEpisodes.findIndex(ep => ep.episodeNumber === activeEpisode);
    
    if (currentEpIndex >= 0 && currentEpIndex < currentEpisodes.length - 1) {
      // Next episode exists in current season
      const nextEp = currentEpisodes[currentEpIndex + 1];
      setActiveEpisode(nextEp.episodeNumber);
      setActiveEpisodeTitle(nextEp.title || '');
      setSeriesComplete(false);
      advancingRef.current = false;
      return;
    }

    // End of season — check for next season
    const currentSeasonIndex = tvMedia.seasons.findIndex(s => s.seasonNumber === activeSeason);
    if (currentSeasonIndex >= 0 && currentSeasonIndex < tvMedia.seasons.length - 1) {
      const nextSeason = tvMedia.seasons[currentSeasonIndex + 1];
      // Skip season 0 (specials) if it's next
      const targetSeason = nextSeason.seasonNumber === 0 && currentSeasonIndex + 2 < tvMedia.seasons.length
        ? tvMedia.seasons[currentSeasonIndex + 2]
        : nextSeason;
      
      if (targetSeason) {
        setActiveSeason(targetSeason.seasonNumber);
        setActiveEpisode(1);
        setActiveEpisodeTitle('');
        setSeriesComplete(false);
        advancingRef.current = false;
        return;
      }
    }

    // No more episodes — series complete
    setSeriesComplete(true);
    advancingRef.current = false;
  }, [media, isTv, numericId, activeSeason, activeEpisode, activeEpisodeTitle, currentEpisodes, addOrUpdateHistory]);

  // ── Handlers ──

  const toggleWatchlist = () => {
    if (!media) return;

    if (inWatchlist) {
      removeFromWatchlist(media.id, isTv ? 'tv' : 'movie');
    } else {
      addToWatchlist(media, isTv ? 'tv' : 'movie');
    }
  };

  const handleEpisodeSelect = (episode: number, title?: string) => {
    // Reset advancement guard on manual selection
    advancingRef.current = false;
    setSeriesComplete(false);
    setActiveEpisode(episode);
    if (title) setActiveEpisodeTitle(title);
  };

  const handleSeasonChange = (s: number) => {
    advancingRef.current = false;
    setSeriesComplete(false);
    setActiveSeason(s);
    setActiveEpisode(1);
    setActiveEpisodeTitle('');
  };

  // Check if there's a next episode available (for the Next Episode button)
  const hasNextEpisode = (() => {
    if (!isTv || !media || !('seasons' in media)) return false;
    const currentEpIndex = currentEpisodes.findIndex(ep => ep.episodeNumber === activeEpisode);
    // Next episode in current season
    if (currentEpIndex >= 0 && currentEpIndex < currentEpisodes.length - 1) return true;
    // Next season
    const currentSeasonIndex = media.seasons.findIndex(s => s.seasonNumber === activeSeason);
    if (currentSeasonIndex >= 0 && currentSeasonIndex < media.seasons.length - 1) return true;
    return false;
  })();

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
              imdbId={media && 'imdbId' in media ? media.imdbId : undefined}
              mediaType={isTv ? 'tv' : 'movie'}
              season={isTv ? activeSeason : undefined}
              episode={isTv ? activeEpisode : undefined}
            />

            {/* Next Episode / Series Complete controls */}
            {isTv && media && (
              <div className="episode-advance-controls">
                {seriesComplete ? (
                  <div className="series-complete-notice">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>You've reached the end of the series</span>
                  </div>
                ) : hasNextEpisode ? (
                  <button className="next-episode-btn" onClick={advanceToNextEpisode}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 4 15 12 5 20 5 4"/>
                      <line x1="19" y1="5" x2="19" y2="19"/>
                    </svg>
                    Next Episode
                  </button>
                ) : null}
              </div>
            )}
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
                  
                  {isTv && (
                    <p className="movie-metadata episode-info">
                      Season {activeSeason} • Episode {activeEpisode}
                      {activeEpisodeTitle && ` — ${activeEpisodeTitle}`}
                    </p>
                  )}
                  
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
            onSeasonChange={handleSeasonChange}
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
