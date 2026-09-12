import { getHomeSection } from './tmdb';
import type { MediaSearchResult } from './tmdb';
import { WATCH_RANDOM_MOOD_MAPPING } from '../config/watchRandomCompatibility';
import {
  WATCH_RANDOM_ERAS,
  WATCH_RANDOM_RATINGS,
  WATCH_RANDOM_TV_STATUS,
  WATCH_RANDOM_MOVIE_RUNTIMES
} from '../config/watchRandomConfig';

export type ContentType = 'movie' | 'tv' | 'anime';

export interface WatchRandomPreferences {
  genres: string[];
  era: string;
  rating: string;
  runtime: string; // Movie only
  status: string; // TV only
  mood: string | null;
}

// ─────────────────────────────────────────────────────────
// RANDOM MODE
// ─────────────────────────────────────────────────────────

export async function getRandomRecommendation(
  type: ContentType, 
  seenIds: Set<number>
): Promise<MediaSearchResult | null> {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  const mediaType = type === 'anime' ? 'tv' : type;

  let params: Record<string, string> = {
    sort_by: 'popularity.desc',
    'vote_count.gte': '100', // quality floor
    'vote_average.gte': '6' // quality floor
  };

  if (type === 'anime') {
    params.with_genres = '16';
    params.with_original_language = 'ja';
  }

  let attempts = 0;
  let selectedItem: MediaSearchResult | null = null;
  
  while (attempts < 5 && !selectedItem) {
    // Pick a random page from the top 50 (to ensure quality)
    params.page = (Math.floor(Math.random() * 50) + 1).toString();
    
    try {
      const results = await getHomeSection({
        id: 'random',
        title: 'Random',
        mediaType,
        endpoint,
        params
      });

      // Filter for quality and un-seen
      const validResults = results.filter(item => 
        item.posterPath && 
        item.title && 
        !seenIds.has(item.id)
      );

      if (validResults.length > 0) {
        selectedItem = validResults[Math.floor(Math.random() * validResults.length)];
      }
    } catch (err) {
      console.error('Random fetch error', err);
    }
    
    attempts++;
  }

  return selectedItem;
}

// ─────────────────────────────────────────────────────────
// PREFERENCE MODE - PROGRESSIVE FALLBACK SYSTEM
// ─────────────────────────────────────────────────────────

const TARGET_RESULTS = 10;
const MIN_RESULTS = 5;

export async function getPreferenceRecommendations(
  type: ContentType,
  preferences: WatchRandomPreferences
): Promise<MediaSearchResult[]> {
  
  // ATTEMPT 1: EXACT
  let results = await fetchWithConstraints(type, preferences, { useRating: true, useEra: true, useStatus: true, strictMood: true });
  if (results.length >= MIN_RESULTS) return rankRecommendations(results);

  // ATTEMPT 2: RELAX RATING
  results = await fetchWithConstraints(type, preferences, { useRating: false, useEra: true, useStatus: true, strictMood: true });
  if (results.length >= MIN_RESULTS) return rankRecommendations(results);

  // ATTEMPT 3: RELAX ERA
  results = await fetchWithConstraints(type, preferences, { useRating: false, useEra: false, useStatus: true, strictMood: true });
  if (results.length >= MIN_RESULTS) return rankRecommendations(results);

  // ATTEMPT 4: RELAX STATUS
  results = await fetchWithConstraints(type, preferences, { useRating: false, useEra: false, useStatus: false, strictMood: true });
  if (results.length >= MIN_RESULTS) return rankRecommendations(results);

  // ATTEMPT 5: SOFT MOOD (Rank only)
  results = await fetchWithConstraints(type, preferences, { useRating: false, useEra: false, useStatus: false, strictMood: false });
  if (results.length >= MIN_RESULTS) return rankRecommendations(results);

  // ATTEMPT 6: MULTI-GENRE SPLIT
  if (preferences.genres.length > 1) {
    // If they picked 2 genres, try each individually and merge
    const genreA = [preferences.genres[0]];
    const genreB = [preferences.genres[1]];
    
    const resultsA = await fetchWithConstraints(type, { ...preferences, genres: genreA }, { useRating: false, useEra: false, useStatus: false, strictMood: false });
    const resultsB = await fetchWithConstraints(type, { ...preferences, genres: genreB }, { useRating: false, useEra: false, useStatus: false, strictMood: false });
    
    // Merge & deduplicate
    const mergedMap = new Map();
    [...resultsA, ...resultsB].forEach(r => mergedMap.set(r.id, r));
    results = Array.from(mergedMap.values());
    if (results.length >= MIN_RESULTS) return rankRecommendations(results);
  }

  // ATTEMPT 7: EMERGENCY FALLBACK
  results = await fetchWithConstraints(type, { ...preferences, genres: [] }, { useRating: false, useEra: false, useStatus: false, strictMood: false });
  return rankRecommendations(results);
}

interface Constraints {
  useRating: boolean;
  useEra: boolean;
  useStatus: boolean;
  strictMood: boolean;
}

async function fetchWithConstraints(
  type: ContentType,
  prefs: WatchRandomPreferences,
  c: Constraints
): Promise<MediaSearchResult[]> {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  const mediaType = type === 'anime' ? 'tv' : type;
  
  let params: Record<string, string> = {
    page: '1',
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
  };

  // Base Genre / Anime Logic
  let genreStr = '';
  if (type === 'anime') {
    params.with_original_language = 'ja';
    genreStr = '16'; // Animation
    if (prefs.genres.length > 0) {
      genreStr += `,${prefs.genres.join(',')}`;
    }
  } else if (prefs.genres.length > 0) {
    genreStr = prefs.genres.join(',');
  }

  // Mood Logic (Strict vs Soft)
  if (prefs.mood && c.strictMood) {
    const moodGenres = WATCH_RANDOM_MOOD_MAPPING[prefs.mood];
    if (moodGenres && moodGenres.length > 0) {
      // If we have genres from the user, we want them AND (one of the mood genres)
      // TMDB uses comma for OR, pipe for AND.
      // So with_genres = user_genres AND mood_genres
      // Unfortunately TMDB only supports with_genres=A,B (A OR B) or with_genres=A|B (A AND B)
      // It's safest to append the mood genres as an OR block if we must. 
      // Actually, TMDB with_genres=16,35 means (16 OR 35).
      // If we want AND, we use |: with_genres=28|35
      // Strict mood is dangerous, let's just use the first mapped genre to ensure we get results, or combine.
      // E.g., user selected 28 (Action), Mood is Epic (12, 14, 28, 878)
      // This is often why queries fail. 
      const firstMoodGenre = moodGenres[0]; 
      genreStr = genreStr ? `${genreStr}|${firstMoodGenre}` : firstMoodGenre;
    }
  }

  if (genreStr) {
    params.with_genres = genreStr;
  }

  // Era
  if (c.useEra && prefs.era !== 'any') {
    const eraObj = WATCH_RANDOM_ERAS.find(e => e.id === prefs.era);
    if (eraObj) {
      if (eraObj.gte) params['primary_release_date.gte'] = eraObj.gte;
      if (eraObj.lte) params['primary_release_date.lte'] = eraObj.lte;
      if (type !== 'movie') {
        if (eraObj.gte) params['first_air_date.gte'] = eraObj.gte;
        if (eraObj.lte) params['first_air_date.lte'] = eraObj.lte;
      }
    }
  }

  // Rating
  if (c.useRating && prefs.rating !== 'any') {
    const ratingObj = WATCH_RANDOM_RATINGS.find(r => r.id === prefs.rating);
    if (ratingObj && ratingObj.gte) {
      params['vote_average.gte'] = ratingObj.gte.toString();
    }
  }

  // Status & Runtime
  if (type === 'movie') {
    if (c.useStatus && prefs.runtime !== 'any') {
      const rtObj = WATCH_RANDOM_MOVIE_RUNTIMES.find(r => r.id === prefs.runtime);
      if (rtObj) {
        if (rtObj.gte) params['with_runtime.gte'] = rtObj.gte.toString();
        if (rtObj.lte) params['with_runtime.lte'] = rtObj.lte.toString();
      }
    }
  } else {
    if (c.useStatus && prefs.status !== 'any') {
      const statusObj = WATCH_RANDOM_TV_STATUS.find(s => s.id === prefs.status);
      if (statusObj && statusObj.with_status) {
        params.with_status = statusObj.with_status;
      }
    }
  }

  try {
    const fetchResults = await getHomeSection({
      id: 'preferences',
      title: 'Preferences',
      mediaType,
      endpoint,
      params
    });
    return fetchResults.filter(item => item.posterPath && item.title);
  } catch (err) {
    console.error('Fetch error:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────
// RANKING ENGINE
// ─────────────────────────────────────────────────────────

function rankRecommendations(
  results: MediaSearchResult[]
): MediaSearchResult[] {
  if (results.length === 0) return [];
  
  const scored = results.map(item => {
    let score = 0;
    
    // Popularity Score (we can just trust TMDB sort_by=popularity.desc)
    // We add a randomized variance so the same query doesn't ALWAYS yield the exact same 5.
    const randomJitter = Math.random() * 10;
    score += randomJitter;
    
    return { item, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, TARGET_RESULTS).map(s => s.item);
}
