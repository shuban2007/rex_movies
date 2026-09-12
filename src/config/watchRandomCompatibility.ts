// Mood mappings to TMDB genres. 
// A mood is a soft preference, used for ranking and optional filtering, not strict requirements.
export const WATCH_RANDOM_MOOD_MAPPING: Record<string, string[]> = {
  'feel-good': ['35', '10751', '12', '10749', '16'], // Comedy, Family, Adventure, Romance, Animation
  'dark': ['27', '53', '80', '9648'], // Horror, Thriller, Crime, Mystery
  'intense': ['28', '53', '27', '10752'], // Action, Thriller, Horror, War
  'emotional': ['18', '10749', '10751', '16'], // Drama, Romance, Family, Animation
  'mind-bending': ['9648', '878', '53', '14'], // Mystery, Sci-Fi, Thriller, Fantasy
  'funny': ['35'], // Comedy
  'relaxing': ['35', '10749', '10751', '16'], // Comedy, Romance, Family, Animation
  'epic': ['12', '14', '28', '878'], // Adventure, Fantasy, Action, Sci-Fi
  'suspenseful': ['53', '9648', '27', '80'] // Thriller, Mystery, Horror, Crime
};

// Which moods make sense for which genres?
// If a user selects Action, "Relaxing" shouldn't be an option.
export const GENRE_MOOD_COMPATIBILITY: Record<string, string[]> = {
  // Action
  '28': ['epic', 'intense', 'suspenseful', 'dark'],
  '10759': ['epic', 'intense', 'suspenseful', 'dark'], // Action & Adventure (TV)
  
  // Adventure
  '12': ['epic', 'intense', 'feel-good', 'mind-bending'],
  
  // Comedy
  '35': ['funny', 'feel-good', 'relaxing', 'emotional', 'romance'],
  
  // Crime
  '80': ['dark', 'intense', 'suspenseful', 'mind-bending', 'emotional'],
  
  // Drama
  '18': ['emotional', 'intense', 'dark', 'feel-good', 'mind-bending', 'suspenseful'],
  
  // Fantasy
  '14': ['epic', 'mind-bending', 'emotional', 'dark', 'feel-good'],
  
  // Horror
  '27': ['dark', 'intense', 'suspenseful', 'mind-bending'],
  
  // Mystery
  '9648': ['mind-bending', 'suspenseful', 'dark', 'intense', 'emotional'],
  
  // Romance
  '10749': ['emotional', 'feel-good', 'relaxing', 'funny'],
  
  // Sci-Fi
  '878': ['mind-bending', 'epic', 'intense', 'suspenseful', 'dark'],
  '10765': ['mind-bending', 'epic', 'intense', 'suspenseful', 'dark'], // Sci-Fi & Fantasy (TV)
  
  // Thriller
  '53': ['intense', 'suspenseful', 'dark', 'mind-bending', 'epic'],
  
  // Animation
  '16': ['feel-good', 'funny', 'emotional', 'epic', 'relaxing', 'dark', 'mind-bending'],
  
  // Documentary
  '99': ['emotional', 'mind-bending', 'dark', 'relaxing', 'intense'],
  
  // Family / Kids
  '10751': ['feel-good', 'funny', 'relaxing', 'epic', 'emotional'],
  '10762': ['feel-good', 'funny', 'relaxing', 'epic', 'emotional'], // Kids (TV)
  
  // History
  '36': ['epic', 'emotional', 'intense', 'dark'],
  
  // War
  '10752': ['intense', 'epic', 'emotional', 'dark', 'suspenseful'],
  '10768': ['intense', 'epic', 'emotional', 'dark', 'suspenseful'], // War & Politics (TV)
  
  // Western
  '37': ['epic', 'intense', 'suspenseful', 'dark'],
  
  // News / Reality
  '10763': ['mind-bending', 'intense', 'emotional'],
  '10764': ['funny', 'feel-good', 'intense', 'dark']
};

export function getCompatibleMoods(selectedGenres: string[]): string[] {
  if (selectedGenres.length === 0) {
    return Object.keys(WATCH_RANDOM_MOOD_MAPPING); // all available
  }
  
  // Intersection of compatible moods for all selected genres
  let compatible = GENRE_MOOD_COMPATIBILITY[selectedGenres[0]] || Object.keys(WATCH_RANDOM_MOOD_MAPPING);
  
  for (let i = 1; i < selectedGenres.length; i++) {
    const genreMoods = GENRE_MOOD_COMPATIBILITY[selectedGenres[i]] || Object.keys(WATCH_RANDOM_MOOD_MAPPING);
    compatible = compatible.filter(m => genreMoods.includes(m));
  }
  
  return compatible;
}
