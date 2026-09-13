import { getMovieDetails, getTvDetails, type MediaSearchResult } from './tmdb';

export type AnimeConfidence = 'true' | 'false' | 'unknown';

export interface ContentMetadata {
  id: number;
  mediaType: 'movie' | 'tv';
  isAnime: AnimeConfidence;
  genres: number[];
  keywords: string[];
  originalLanguage: string;
  productionCountries: string[];
  collectionId?: number;
  releaseYear: number | null;
  popularity: number;
  voteAverage: number;
}

/**
 * Normalizes TMDB data (from detailed movie/tv fetch or basic media search) 
 * into a standard ContentMetadata format.
 */
export function classifyContent(item: any, mediaType?: 'movie' | 'tv'): ContentMetadata {
  const type = mediaType || item.mediaType || (item.name ? 'tv' : 'movie');
  
  const genres = item.genres 
    ? item.genres.map((g: any) => g.id) 
    : item.genreIds || item.genre_ids || [];
    
  const keywords = item.keywords 
    ? item.keywords.map((k: any) => k.name.toLowerCase()) 
    : [];

  const originalLanguage = item.originalLanguage || item.original_language || '';
  const productionCountries = item.productionCountries || [];
  
  const collectionId = item.belongsToCollection ? item.belongsToCollection.id : undefined;

  let releaseYear = null;
  if (item.year) {
    releaseYear = parseInt(item.year, 10);
  } else if (item.release_date) {
    releaseYear = parseInt(item.release_date.split('-')[0], 10);
  } else if (item.first_air_date) {
    releaseYear = parseInt(item.first_air_date.split('-')[0], 10);
  }

  // Anime Classification Heuristics
  let animeScore = 0;
  if (genres.includes(16)) animeScore += 1; // Animation
  if (originalLanguage === 'ja') animeScore += 1;
  if (productionCountries.includes('JP')) animeScore += 1;
  
  const animeKeywords = ['anime', 'based on manga', 'shounen', 'seinen', 'isekai', 'mecha'];
  if (keywords.some((k: string) => animeKeywords.includes(k))) animeScore += 2;

  let isAnime: AnimeConfidence = 'unknown';
  if (animeScore >= 2) isAnime = 'true';
  else if (animeScore === 0) isAnime = 'false';

  return {
    id: item.id,
    mediaType: type,
    isAnime,
    genres,
    keywords,
    originalLanguage,
    productionCountries,
    collectionId,
    releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
    popularity: item.popularity || 0,
    voteAverage: item.voteAverage || item.vote_average || 0,
  };
}

/**
 * Ranks candidates based on the centralized rules.
 */
export function scoreAndRankCandidates(
  candidates: any[],
  sourceMetadata: ContentMetadata
): MediaSearchResult[] {
  const scored = candidates.map(candidate => {
    let score = 0;
    const candidateMeta = classifyContent(candidate);

    // 1. Franchise/Collection (+1000)
    if (sourceMetadata.collectionId && candidateMeta.collectionId === sourceMetadata.collectionId) {
      score += 1000;
    }

    // 2. Same Category / Media Type (+500)
    if (sourceMetadata.mediaType === candidateMeta.mediaType) {
      score += 500;
    }

    // 3. Same Anime classification (+300 or penalty)
    if (sourceMetadata.isAnime === 'true' && candidateMeta.isAnime === 'true') {
      score += 300;
    } else if (sourceMetadata.isAnime === 'false' && candidateMeta.isAnime === 'false') {
      score += 50; // Slight boost for normal movies matching normal movies
    } else if (sourceMetadata.isAnime !== candidateMeta.isAnime) {
      // Penalty for mixing anime and non-anime heavily
      score -= 200;
    }

    // 4. Genre similarity (+10 per genre)
    candidateMeta.genres.forEach(g => {
      if (sourceMetadata.genres.includes(g)) score += 10;
    });

    // 5. Keyword similarity (+5 per keyword)
    candidateMeta.keywords.forEach(k => {
      if (sourceMetadata.keywords.includes(k)) score += 5;
    });

    // 6. Language similarity
    if (sourceMetadata.originalLanguage === candidateMeta.originalLanguage) {
      score += 5;
    }

    // Tie-breaker: rating and popularity (scaled down to avoid overriding priorities)
    score += (candidateMeta.voteAverage * 2);
    score += Math.min(candidateMeta.popularity / 100, 20); // Cap popularity impact

    return { item: candidate, score };
  });

  // Sort descending
  scored.sort((a, b) => b.score - a.score);

  // Map back to standard MediaSearchResult
  return scored.map(s => {
    const item = s.item;
    return {
      id: item.id,
      mediaType: item.media_type || (item.name ? 'tv' : 'movie'),
      title: item.title || item.name,
      year: item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : null),
      posterPath: item.poster_path || item.posterPath || null,
      backdropPath: item.backdrop_path || item.backdropPath || null,
      overview: item.overview || '',
      genreIds: item.genre_ids || item.genreIds || [],
      originalLanguage: item.original_language || item.originalLanguage || '',
      voteAverage: item.vote_average || item.voteAverage || 0,
      popularity: item.popularity || 0,
    } as MediaSearchResult;
  });
}

/**
 * Gets "You Might Also Like" recommendations.
 */
export async function getRecommendationsForTitle(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<MediaSearchResult[]> {
  // 1. Fetch detailed metadata (which now includes appended similar and recommendations)
  const sourceItem = mediaType === 'movie' 
    ? await getMovieDetails(tmdbId) 
    : await getTvDetails(tmdbId);
    
  if (!sourceItem) return [];

  const sourceMetadata = classifyContent(sourceItem, mediaType);
  
  // 2. Build Candidate Pool
  const candidatesMap = new Map<number, any>();
  
  const addCandidates = (items: any[]) => {
    if (!items) return;
    items.forEach(item => {
      if (item.id !== tmdbId && !candidatesMap.has(item.id)) {
        candidatesMap.set(item.id, item);
      }
    });
  };

  if ('recommendations' in sourceItem) addCandidates((sourceItem as any).recommendations);
  if ('similar' in sourceItem) addCandidates((sourceItem as any).similar);

  const candidates = Array.from(candidatesMap.values());

  // 3. Rank
  const ranked = scoreAndRankCandidates(candidates, sourceMetadata);

  // Return top 20
  return ranked.slice(0, 20);
}
