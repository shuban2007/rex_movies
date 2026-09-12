export const WATCH_RANDOM_MOVIE_GENRES = [
  { id: '28', name: 'Action' },
  { id: '12', name: 'Adventure' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '18', name: 'Drama' },
  { id: '14', name: 'Fantasy' },
  { id: '27', name: 'Horror' },
  { id: '9648', name: 'Mystery' },
  { id: '10749', name: 'Romance' },
  { id: '878', name: 'Sci-Fi' },
  { id: '53', name: 'Thriller' },
  { id: '16', name: 'Animation' },
  { id: '99', name: 'Documentary' },
  { id: '10751', name: 'Family' },
  { id: '36', name: 'History' },
  { id: '10752', name: 'War' },
  { id: '37', name: 'Western' }
];

export const WATCH_RANDOM_TV_GENRES = [
  { id: '10759', name: 'Action & Adventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '99', name: 'Documentary' },
  { id: '18', name: 'Drama' },
  { id: '10751', name: 'Family' },
  { id: '10762', name: 'Kids' },
  { id: '9648', name: 'Mystery' },
  { id: '10763', name: 'News' },
  { id: '10764', name: 'Reality' },
  { id: '10765', name: 'Sci-Fi & Fantasy' },
  { id: '10768', name: 'War & Politics' },
  { id: '37', name: 'Western' }
];

export const WATCH_RANDOM_ANIME_GENRES = [
  { id: '10759', name: 'Action & Adventure' },
  { id: '35', name: 'Comedy' },
  { id: '18', name: 'Drama' },
  { id: '14', name: 'Fantasy' },
  { id: '27', name: 'Horror' },
  { id: '9648', name: 'Mystery' },
  { id: '10749', name: 'Romance' },
  { id: '10765', name: 'Sci-Fi & Fantasy' },
];

export const WATCH_RANDOM_ERAS = [
  { id: 'any', name: 'Any' },
  { id: '2020s', name: '2020s', gte: '2020-01-01', lte: '2029-12-31' },
  { id: '2010s', name: '2010s', gte: '2010-01-01', lte: '2019-12-31' },
  { id: '2000s', name: '2000s', gte: '2000-01-01', lte: '2009-12-31' },
  { id: '1990s', name: '1990s', gte: '1990-01-01', lte: '1999-12-31' },
  { id: '1980s', name: '1980s', gte: '1980-01-01', lte: '1989-12-31' },
  { id: 'classic', name: 'Classic', lte: '1979-12-31' },
  { id: 'recent', name: 'Recent', gte: '2023-01-01' }
];

export const WATCH_RANDOM_RATINGS = [
  { id: 'any', name: 'Any' },
  { id: '6', name: '6+', gte: 6 },
  { id: '7', name: '7+', gte: 7 },
  { id: '8', name: '8+', gte: 8 },
  { id: '9', name: '9+', gte: 9 }
];

export const WATCH_RANDOM_MOVIE_RUNTIMES = [
  { id: 'any', name: 'Any' },
  { id: 'short', name: 'Under 90 min', lte: 90 },
  { id: 'medium', name: '90–120 min', gte: 90, lte: 120 },
  { id: 'long', name: '120–150 min', gte: 120, lte: 150 },
  { id: 'epic', name: '150+ min', gte: 150 }
];

export const WATCH_RANDOM_TV_STATUS = [
  { id: 'any', name: 'Any' },
  // TMDB doesn't directly filter by "Short Series" easily in discover, but we can filter by status or with_status
  // TMDB with_status: 0: Returning Series, 3: Ended, 4: Canceled
  { id: 'completed', name: 'Completed', with_status: '3' },
  { id: 'airing', name: 'Currently Airing', with_status: '0' }
];

export const WATCH_RANDOM_MOODS = [
  { id: 'feel-good', name: 'Feel Good', sort_by: 'popularity.desc', with_genres: '35' }, // Comedy bias
  { id: 'dark', name: 'Dark', sort_by: 'popularity.desc', with_genres: '80,53' }, // Crime, Thriller bias
  { id: 'intense', name: 'Intense', sort_by: 'popularity.desc', with_genres: '28,53' }, // Action, Thriller bias
  { id: 'emotional', name: 'Emotional', sort_by: 'popularity.desc', with_genres: '18' }, // Drama bias
  { id: 'mind-bending', name: 'Mind-Bending', sort_by: 'popularity.desc', with_genres: '878,9648' }, // Sci-Fi, Mystery bias
  { id: 'funny', name: 'Funny', sort_by: 'popularity.desc', with_genres: '35' }, // Comedy bias
  { id: 'relaxing', name: 'Relaxing', sort_by: 'popularity.desc', with_genres: '10751,14' }, // Family, Fantasy bias
  { id: 'epic', name: 'Epic', sort_by: 'popularity.desc', with_genres: '12,14,28' }, // Adventure, Fantasy, Action bias
  { id: 'suspenseful', name: 'Suspenseful', sort_by: 'popularity.desc', with_genres: '9648,53' } // Mystery, Thriller bias
];
