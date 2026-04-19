// Stałe kolory dla użytkowników - stonowane, pastelowe
const USER_COLORS = [
  '#7B9ED6', // soft blue
  '#81C5A0', // soft green
  '#6FB8CC', // soft cyan
  '#E5C26E', // soft yellow
  '#E89A6B', // soft orange
  '#9B7FD6', // soft indigo
  '#B078C5', // soft purple
  '#E57FA5', // soft pink
  '#5FB5A5', // soft teal
  '#A0A8B5', // soft gray
  '#8FA5D6', // soft periwinkle
  '#D6A87F', // soft tan
  '#7FC5A5', // soft mint
  '#C587C5', // soft lilac
  '#A5C587'  // soft olive
];

/**
 * Prosta funkcja hash dla stringa - zawsze zwraca ten sam numer dla tego samego tekstu
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Zwraca stały kolor dla użytkownika na podstawie jego username
 * Ten sam username zawsze dostanie ten sam kolor
 */
export function getUserColor(username) {
  if (!username) {
    return USER_COLORS[0];
  }

  const hash = hashString(username);
  const colorIndex = hash % USER_COLORS.length;
  return USER_COLORS[colorIndex];
}

/**
 * Zwraca tablicę wszystkich dostępnych kolorów
 */
export function getAllUserColors() {
  return [...USER_COLORS];
}

/**
 * Zwraca kolor dla użytkownika z listy użytkowników (dla kompatybilności z istniejącym kodem)
 * @param {Array} allUsers - tablica wszystkich użytkowników
 * @param {string} username - nazwa użytkownika
 */
export function getUserColorFromList(allUsers, username) {
  return getUserColor(username);
}
