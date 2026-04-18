export const translations = {
  pl: {
    // Navbar
    games: 'Mecze',
    ranking: 'Ranking',
    chat: 'Chat',
    posts: 'Posty',
    profile: 'Profil',
    notifications: 'Powiadomienia',
    logout: 'Wyloguj',

    // Dashboard
    yourStyleOfPlay: 'Twój Styl Gry',
    whatYouPredict: 'Co typujesz:',
    matchResults: 'Wyniki meczów:',
    almostPerfect: 'prawie!',
    miniRanking: 'Mini Ranking',
    noRankingData: 'Brak danych rankingu',
    upcomingMatches: 'Najbliższe mecze',
    recentMatches: 'Ostatnie mecze',
    noUpcomingMatches: 'Brak nadchodzących meczy',
    noRecentMatches: 'Brak ostatnich meczy',
    yourPrediction: 'Twój typ',
    predict: 'Typuj',
    mostFrequentResults: 'Wyniki, które najczęściej się pojawiają',
    noResultsData: 'Brak danych o wynikach',
    noPredictions: 'Brak typowań',
    points: 'pkt',
    position: 'poz.',

    // League Selector
    loadingLeagues: 'Ładowanie lig...',
    joinLeague: 'Dołącz do ligi',
    members: 'członków',

    // Common
    loading: 'Ładowanie...',
    error: 'Błąd',
    noData: 'Brak danych',
  },
  en: {
    // Navbar
    games: 'Games',
    ranking: 'Ranking',
    chat: 'Chat',
    posts: 'Posts',
    profile: 'Profile',
    notifications: 'Notifications',
    logout: 'Logout',

    // Dashboard
    yourStyleOfPlay: 'Your Style of Play',
    whatYouPredict: 'What you predict:',
    matchResults: 'Match results:',
    almostPerfect: 'almost!',
    miniRanking: 'Mini Ranking',
    noRankingData: 'No ranking data',
    upcomingMatches: 'Upcoming Matches',
    recentMatches: 'Recent Matches',
    noUpcomingMatches: 'No upcoming matches',
    noRecentMatches: 'No recent matches',
    yourPrediction: 'Your prediction',
    predict: 'Predict',
    mostFrequentResults: 'Most Frequent Results',
    noResultsData: 'No results data',
    noPredictions: 'No predictions',
    points: 'pts',
    position: 'pos.',

    // League Selector
    loadingLeagues: 'Loading leagues...',
    joinLeague: 'Join League',
    members: 'members',

    // Common
    loading: 'Loading...',
    error: 'Error',
    noData: 'No data',
  }
};

export const useTranslation = (language) => {
  return (key) => {
    return translations[language]?.[key] || key;
  };
};
