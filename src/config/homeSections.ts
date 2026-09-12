export interface HomeSectionConfig {
  id: string;
  title: string;
  mediaType: 'movie' | 'tv';
  endpoint: string;
  params?: Record<string, string>;
}

export const homeSections: HomeSectionConfig[] = [
  // ── TRENDING / HERO SECTIONS ──
  {
    id: 'trending-movies',
    title: 'Trending Movies',
    mediaType: 'movie',
    endpoint: '/trending/movie/day'
  },
  {
    id: 'popular-movies',
    title: 'Popular Movies',
    mediaType: 'movie',
    endpoint: '/movie/popular',
    params: { page: '1' }
  },
  {
    id: 'top-rated-movies',
    title: 'Top Rated Movies',
    mediaType: 'movie',
    endpoint: '/movie/top_rated',
    params: { page: '1' }
  },
  {
    id: 'trending-tv',
    title: 'Trending TV Series',
    mediaType: 'tv',
    endpoint: '/trending/tv/day'
  },
  {
    id: 'popular-tv',
    title: 'Popular TV Series',
    mediaType: 'tv',
    endpoint: '/tv/popular',
    params: { page: '1' }
  },
  {
    id: 'top-rated-tv',
    title: 'Top Rated TV Series',
    mediaType: 'tv',
    endpoint: '/tv/top_rated',
    params: { page: '1' }
  },

  // ── ANIME ──
  {
    id: 'trending-anime',
    title: 'Trending Anime',
    mediaType: 'tv',
    endpoint: '/discover/tv',
    params: {
      with_genres: '16',
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
      page: '1'
    }
  },
  {
    id: 'popular-anime',
    title: 'Popular Anime',
    mediaType: 'tv',
    endpoint: '/discover/tv',
    params: {
      with_genres: '16',
      with_original_language: 'ja',
      sort_by: 'vote_average.desc',
      'vote_count.gte': '200',
      page: '1'
    }
  },
  {
    id: 'top-rated-anime',
    title: 'Top Rated Anime',
    mediaType: 'tv',
    endpoint: '/discover/tv',
    params: {
      with_genres: '16',
      with_original_language: 'ja',
      sort_by: 'vote_average.desc',
      'vote_count.gte': '500',
      page: '1'
    }
  },

  // ── MOVIE GENRES ──
  { id: 'action-movies', title: 'Action Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc' } },
  { id: 'comedy-movies', title: 'Comedy Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '35', sort_by: 'popularity.desc' } },
  { id: 'drama-movies', title: 'Drama Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '18', sort_by: 'popularity.desc' } },
  { id: 'horror-movies', title: 'Horror Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '27', sort_by: 'popularity.desc' } },
  { id: 'scifi-movies', title: 'Sci-Fi Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc' } },
  { id: 'fantasy-movies', title: 'Fantasy Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '14', sort_by: 'popularity.desc' } },
  { id: 'thriller-movies', title: 'Thriller Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '53', sort_by: 'popularity.desc' } },
  { id: 'crime-movies', title: 'Crime Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '80', sort_by: 'popularity.desc' } },
  { id: 'animation-movies', title: 'Animation Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '16', sort_by: 'popularity.desc' } },
  { id: 'adventure-movies', title: 'Adventure Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '12', sort_by: 'popularity.desc' } },
  { id: 'romance-movies', title: 'Romance Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '10749', sort_by: 'popularity.desc' } },
  { id: 'mystery-movies', title: 'Mystery Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '9648', sort_by: 'popularity.desc' } },
  { id: 'family-movies', title: 'Family Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '10751', sort_by: 'popularity.desc' } },
  { id: 'documentary-movies', title: 'Documentary Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '99', sort_by: 'popularity.desc' } },
  { id: 'history-movies', title: 'History Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '36', sort_by: 'popularity.desc' } },
  { id: 'war-movies', title: 'War Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '10752', sort_by: 'popularity.desc' } },
  { id: 'western-movies', title: 'Western Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '37', sort_by: 'popularity.desc' } },

  // ── TV GENRES ──
  { id: 'action-tv', title: 'Action & Adventure Series', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '10759', sort_by: 'popularity.desc' } },
  { id: 'comedy-tv', title: 'Comedy Series', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '35', sort_by: 'popularity.desc' } },
  { id: 'drama-tv', title: 'Drama Series', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '18', sort_by: 'popularity.desc' } },
  { id: 'crime-tv', title: 'Crime Series', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '80', sort_by: 'popularity.desc' } },
  { id: 'mystery-tv', title: 'Mystery Series', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '9648', sort_by: 'popularity.desc' } },
  { id: 'scifi-tv', title: 'Sci-Fi & Fantasy Series', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '10765', sort_by: 'popularity.desc' } },
  { id: 'animation-tv', title: 'Animation Series', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '16', sort_by: 'popularity.desc' } },
  { id: 'documentary-tv', title: 'Documentary Series', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '99', sort_by: 'popularity.desc' } },
  { id: 'family-tv', title: 'Family Series', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '10751', sort_by: 'popularity.desc' } },

  // ── ADDITIONAL ANIME ──
  { id: 'action-anime', title: 'Action Anime', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '16,10759', with_original_language: 'ja', sort_by: 'popularity.desc' } },
  { id: 'comedy-anime', title: 'Comedy Anime', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '16,35', with_original_language: 'ja', sort_by: 'popularity.desc' } },
  { id: 'scifi-anime', title: 'Sci-Fi Anime', mediaType: 'tv', endpoint: '/discover/tv', params: { with_genres: '16,10765', with_original_language: 'ja', sort_by: 'popularity.desc' } },
  
  // ── HIGHEST RATED CATEGORIES ──
  { id: 'best-action-movies', title: 'Highest Rated Action Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '28', sort_by: 'vote_average.desc', 'vote_count.gte': '1000' } },
  { id: 'best-drama-movies', title: 'Highest Rated Drama Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '18', sort_by: 'vote_average.desc', 'vote_count.gte': '1000' } },
  { id: 'best-scifi-movies', title: 'Highest Rated Sci-Fi Movies', mediaType: 'movie', endpoint: '/discover/movie', params: { with_genres: '878', sort_by: 'vote_average.desc', 'vote_count.gte': '1000' } },

  // ── TIMELY CONTENT ──
  { id: 'now-playing-movies', title: 'Now Playing Movies', mediaType: 'movie', endpoint: '/movie/now_playing', params: { page: '1' } },
  { id: 'upcoming-movies', title: 'Upcoming Movies', mediaType: 'movie', endpoint: '/movie/upcoming', params: { page: '1' } },
  { id: 'airing-today-tv', title: 'TV Airing Today', mediaType: 'tv', endpoint: '/tv/airing_today', params: { page: '1' } },
  { id: 'on-the-air-tv', title: 'Currently Airing TV', mediaType: 'tv', endpoint: '/tv/on_the_air', params: { page: '1' } },
];
