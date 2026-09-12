import Fuse from 'fuse.js';
import { searchMulti, type MediaSearchResult } from './tmdb';

export interface AdvancedSearchResult {
  results: MediaSearchResult[];
  didYouMean?: string;
}

// In-memory cache: max 50 items
const searchCache = new Map<string, AdvancedSearchResult>();
const CACHE_LIMIT = 50;

function setCache(key: string, value: AdvancedSearchResult) {
  if (searchCache.size >= CACHE_LIMIT) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, value);
}

// 1. Normalization
export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

// 2. Tokenization & Singular/Plural Normalization
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'part', 'anime']);

export function normalizeTitleToken(token: string): string {
  // Very conservative singular normalization for simple words
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    if (token.endsWith('ies')) {
      return token.slice(0, -3) + 'y'; // stories -> story
    } else if (token.endsWith('oes')) {
      return token.slice(0, -2); // heroes -> hero
    } else {
      return token.slice(0, -1); // avengers -> avenger
    }
  }
  return token;
}

export function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  return normalized
    .split(' ')
    .filter(t => t.length > 0)
    .filter(t => !STOP_WORDS.has(t))
    .map(normalizeTitleToken);
}

// 3. Exact and Semantic Match Detection
export function isExactTitleMatch(query: string, candidateTitle: string): boolean {
  const normQuery = normalizeSearchQuery(query);
  const normCandidate = normalizeSearchQuery(candidateTitle);
  return normQuery === normCandidate || normCandidate.includes(normQuery);
}

// 4. Scoring mechanism
function scoreCandidate(query: string, queryTokens: string[], candidate: MediaSearchResult, fuzzyScore: number) {
  const title = candidate.title || '';
  const normTitle = normalizeSearchQuery(title);
  const titleTokens = normTitle.split(' ').filter(t => t.length > 0).map(normalizeTitleToken);
  
  const totalMeaningfulTokens = queryTokens.length;
  let matchedMeaningfulTokens = 0;
  
  for (const token of queryTokens) {
    if (titleTokens.includes(token)) {
      matchedMeaningfulTokens += 1;
    } else if (titleTokens.some(t => t.includes(token) || token.includes(t))) {
       // Partial token match (e.g. spiderman vs spider)
       matchedMeaningfulTokens += 0.5;
    }
  }
  
  const queryCoverageScore = totalMeaningfulTokens > 0 
    ? (matchedMeaningfulTokens / totalMeaningfulTokens)
    : 1;

  let exactTitleScore = 0;
  if (normTitle === normalizeSearchQuery(query)) {
    exactTitleScore = 150;
  } else if (normTitle.includes(normalizeSearchQuery(query))) {
    exactTitleScore = 75; // phrase match
  }

  // Missing terms penalty
  let missingPenalty = 0;
  if (totalMeaningfulTokens > 1 && matchedMeaningfulTokens < totalMeaningfulTokens) {
    missingPenalty = (totalMeaningfulTokens - matchedMeaningfulTokens) * 30;
  }
  
  const coveragePoints = queryCoverageScore * 60; // max 60 points
  const fuzzyPoints = (1 - fuzzyScore) * 20; // max 20 points

  const finalScore = exactTitleScore + coveragePoints + fuzzyPoints - missingPenalty;
  
  return {
    item: candidate,
    coverage: queryCoverageScore,
    exactMatch: exactTitleScore > 0,
    finalScore
  };
}

function generateVariants(query: string, tokens: string[]): string[] {
  const variants = new Set<string>();
  const norm = normalizeSearchQuery(query);

  // Variant 1: try adding 's' to first token if it might be plural
  if (tokens.length > 0) {
    variants.add(tokens[0] + 's ' + tokens.slice(1).join(' '));
  }

  // Variant 2: Distinctive token (longest word)
  if (tokens.length > 1) {
    const longest = [...tokens].sort((a, b) => b.length - a.length)[0];
    if (longest.length > 4) variants.add(longest);
  }

  // Variant 3: Remove spaces (spiderman)
  const noSpace = norm.replace(/\s+/g, '');
  if (noSpace.length > 3) variants.add(noSpace);
  
  // Remove double letters (batmann)
  const noDouble = norm.replace(/(.)\1+/g, '$1');
  if (noDouble !== norm && noDouble.length > 2) variants.add(noDouble);

  return Array.from(variants).slice(0, 3);
}

export async function advancedSearch(query: string, signal?: AbortSignal): Promise<AdvancedSearchResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { results: [] };

  const normQuery = normalizeSearchQuery(trimmed);
  if (searchCache.has(normQuery)) return searchCache.get(normQuery)!;

  const queryTokens = tokenizeSearchQuery(trimmed);
  
  // 1. Primary Search
  let primaryResults = await searchMulti(trimmed, signal);
  let isStrongResult = false;
  
  // Evaluate if strong result
  if (primaryResults.length > 0) {
    const top = primaryResults[0];
    if (isExactTitleMatch(trimmed, top.title || '')) {
      isStrongResult = true;
    } else {
      // Check coverage of top 3
      for (const res of primaryResults.slice(0, 3)) {
        const titleTokens = tokenizeSearchQuery(res.title || '');
        let matched = 0;
        for (const qt of queryTokens) if (titleTokens.includes(qt)) matched++;
        if (queryTokens.length > 0 && (matched / queryTokens.length) >= 0.8) {
          isStrongResult = true;
          break;
        }
      }
    }
  }

  // 2. Typo Fallbacks
  let allResults = [...primaryResults];
  if (!isStrongResult) {
    const variants = generateVariants(trimmed, queryTokens);
    const fallbackPromises = variants.map(v => searchMulti(v, signal).catch(() => [] as MediaSearchResult[]));
    const fallbackResults = await Promise.all(fallbackPromises);
    allResults = [...primaryResults, ...fallbackResults.flat()];
  }

  // 3. Deduplicate
  const uniqueMap = new Map<string, MediaSearchResult>();
  for (const item of allResults) {
    uniqueMap.set(`${item.mediaType}-${item.id}`, item);
  }
  const uniqueResults = Array.from(uniqueMap.values());
  if (uniqueResults.length === 0) {
    const res = { results: [] };
    setCache(normQuery, res);
    return res;
  }

  // 4. Fuzzy Scoring
  const fuse = new Fuse(uniqueResults, {
    keys: [{ name: 'title', weight: 1.0 }],
    includeScore: true,
    threshold: 0.6,
    ignoreLocation: true,
  });

  const fuseResults = fuse.search(normQuery);
  const fuzzyMap = new Map<string, number>();
  for (const fr of fuseResults) {
    fuzzyMap.set(`${fr.item.mediaType}-${fr.item.id}`, fr.score || 0);
  }

  // 5. Advanced Ranking
  const scoredResults = uniqueResults.map(item => {
    const fScore = fuzzyMap.get(`${item.mediaType}-${item.id}`) ?? 1.0; // 1.0 is worst
    return scoreCandidate(trimmed, queryTokens, item, fScore);
  });

  scoredResults.sort((a, b) => b.finalScore - a.finalScore);
  const bestResults = scoredResults.map(sr => sr.item).slice(0, 15);

  let didYouMean: string | undefined;
  // Did you mean must be very confident: good coverage + high score + distinct title
  if (scoredResults.length > 0 && !isStrongResult && primaryResults.length === 0) {
    const top = scoredResults[0];
    if (top.coverage >= 0.8 && top.finalScore > 30) {
       const bestTitle = top.item.title;
       if (bestTitle && normalizeSearchQuery(bestTitle) !== normQuery) {
         didYouMean = bestTitle;
       }
    }
  }

  const res = { results: bestResults, didYouMean };
  setCache(normQuery, res);
  return res;
}
