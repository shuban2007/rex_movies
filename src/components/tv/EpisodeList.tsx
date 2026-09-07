import { useEffect, useState } from 'react';
import { getTvSeasonEpisodes, type TvSeason, type TvEpisode } from '../../services/tmdb';
import { CustomSelect } from '../ui/CustomSelect';
import './EpisodeList.css';

interface EpisodeListProps {
  seriesId: number;
  seasons: TvSeason[];
  activeSeason: number;
  activeEpisode: number;
  onSeasonChange: (seasonNumber: number) => void;
  onEpisodeSelect: (episodeNumber: number) => void;
}

export function EpisodeList({
  seriesId,
  seasons,
  activeSeason,
  activeEpisode,
  onSeasonChange,
  onEpisodeSelect,
}: EpisodeListProps) {
  const [episodes, setEpisodes] = useState<TvEpisode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadEpisodes() {
      if (!seriesId || activeSeason == null) return;
      
      setLoading(true);
      try {
        const data = await getTvSeasonEpisodes(seriesId, activeSeason);
        if (mounted) {
          setEpisodes(data);
        }
      } catch (err) {
        console.error('Failed to load episodes:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEpisodes();

    return () => {
      mounted = false;
    };
  }, [seriesId, activeSeason]);

  if (!seasons || seasons.length === 0) {
    return null;
  }

  const activeEpisodeData = episodes.find(e => e.episodeNumber === activeEpisode);

  return (
    <section className="episode-list-section">
      <div className="episode-header-row">
        <h3 className="episode-section-title">Episodes</h3>
        <div className="season-selector">
          <label htmlFor="season-select" className="visually-hidden">Season</label>
          <CustomSelect
            id="season-select"
            value={activeSeason}
            onChange={(val) => onSeasonChange(Number(val))}
            options={seasons.map((season) => ({
              value: season.seasonNumber,
              label: `${season.name} (${season.episodeCount} episodes)`
            }))}
          />
        </div>
      </div>

      {loading ? (
        <div className="episode-loading">Loading episodes...</div>
      ) : episodes.length === 0 ? (
        <div className="episode-empty">No episodes available for this season.</div>
      ) : (
        <div className="episode-grid-scroll">
          <div className="episode-grid-wrap">
            {episodes.map((episode) => (
              <button
                key={episode.id}
                className={`episode-page-btn ${episode.episodeNumber === activeEpisode ? 'active' : ''}`}
                onClick={() => onEpisodeSelect(episode.episodeNumber)}
                title={episode.title}
              >
                <span className="ep-number">{episode.episodeNumber}.</span>
                <span className="ep-mobile-info">
                  <span className="ep-title">{episode.title}</span>
                  {episode.airDate && (
                    <span className="ep-date">
                      {new Date(episode.airDate).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeEpisodeData && (
        <div className="active-episode-bar">
          <span className="active-episode-label">Episode {activeEpisodeData.episodeNumber}</span>
          <span className="active-episode-name">{activeEpisodeData.title}</span>
          {activeEpisodeData.airDate && (
            <span className="active-episode-date">
              {new Date(activeEpisodeData.airDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
