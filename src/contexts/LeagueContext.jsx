import { createContext, useState, useContext, useEffect } from 'react';
import { leagueApi, rankingApi, userApi } from '../services/api';
import { useAuth } from './AuthContext';

const LeagueContext = createContext(null);

export const LeagueProvider = ({ children }) => {
  const { user } = useAuth();
  // 1️⃣ INSTANT LOAD z localStorage - użytkownik widzi dane od razu!
  const [selectedLeague, setSelectedLeague] = useState(() => {
    const savedLeagueId = localStorage.getItem('selectedLeagueId');
    const savedLeagueData = localStorage.getItem('selectedLeagueData');

    if (savedLeagueId && savedLeagueData) {
      try {
        return JSON.parse(savedLeagueData);
      } catch (e) {
        console.error('Error parsing saved league data:', e);
        return null;
      }
    }
    return null;
  });

  const [myLeagues, setMyLeagues] = useState(() => {
    const savedLeagues = localStorage.getItem('myLeagues');
    const savedTimestamp = localStorage.getItem('myLeaguesTimestamp');

    // Cache jest ważny przez 10 minut
    const isCacheValid = savedTimestamp && (Date.now() - parseInt(savedTimestamp)) < 10 * 60 * 1000;

    if (savedLeagues && isCacheValid) {
      try {
        return JSON.parse(savedLeagues);
      } catch (e) {
        console.error('Error parsing saved leagues:', e);
        return [];
      }
    }
    return [];
  });

  const [leagueRankings, setLeagueRankings] = useState(() => {
    const savedRankings = localStorage.getItem('leagueRankings');
    const savedTimestamp = localStorage.getItem('leagueRankingsTimestamp');

    // Cache jest ważny przez 5 minut
    const isCacheValid = savedTimestamp && (Date.now() - parseInt(savedTimestamp)) < 5 * 60 * 1000;

    if (savedRankings && isCacheValid) {
      try {
        return JSON.parse(savedRankings);
      } catch (e) {
        console.error('Error parsing saved rankings:', e);
        return {};
      }
    }
    return {};
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 2️⃣ W TLE odśwież dane z API - TYLKO jeśli użytkownik jest zalogowany
    if (user) {
      loadMyLeagues();
    } else {
      // Jeśli nie zalogowany, wyczyść dane
      setLoading(false);
    }
  }, [user]);

  const loadMyLeagues = async () => {
    try {
      setLoading(true);

      // 3️⃣ Pobierz ligi (szybkie zapytanie bez rankingów)
      const [leaguesResponse, userResponse] = await Promise.all([
        leagueApi.getMyLeagues(),
        userApi.getCurrentUser()
      ]);

      const leagues = leaguesResponse.data;
      const currentUsername = userResponse.data.username;

      // 4️⃣ Zapisz ligi w localStorage z timestamp
      localStorage.setItem('myLeagues', JSON.stringify(leagues));
      localStorage.setItem('myLeaguesTimestamp', Date.now().toString());
      setMyLeagues(leagues);

      // Auto-select first league if none selected
      if (leagues.length > 0 && !selectedLeague) {
        const firstLeague = leagues[0];
        setSelectedLeague(firstLeague);
        localStorage.setItem('selectedLeagueId', firstLeague.id.toString());
        localStorage.setItem('selectedLeagueData', JSON.stringify(firstLeague));
      }

      // 5️⃣ LAZY LOAD rankingów w tle - nie blokuje UI!
      loadLeagueRankings(leagues, currentUsername);

    } catch (error) {
      console.error('Failed to load leagues:', error);
      setMyLeagues([]);
    } finally {
      setLoading(false);
    }
  };

  // 6️⃣ Osobna funkcja do ładowania rankingów - nie blokuje głównego UI
  const loadLeagueRankings = async (leagues, currentUsername) => {
    try {
      const rankingPromises = leagues.map(league =>
        rankingApi.getRankingByLeague(league.id)
          .then(response => ({
            leagueId: league.id,
            ranking: response.data
          }))
          .catch(error => {
            console.error(`Failed to load ranking for league ${league.id}:`, error);
            return { leagueId: league.id, ranking: [] };
          })
      );

      const rankings = await Promise.all(rankingPromises);

      // Create ranking map with user position and points
      const rankingMap = {};
      rankings.forEach(({ leagueId, ranking }) => {
        const userRanking = ranking.find(r => r.username === currentUsername);
        rankingMap[leagueId] = {
          position: userRanking?.position || 0,
          points: userRanking?.totalPoints || 0,
          totalUsers: ranking.length
        };
      });

      // 7️⃣ Zapisz rankingi w localStorage z timestamp
      localStorage.setItem('leagueRankings', JSON.stringify(rankingMap));
      localStorage.setItem('leagueRankingsTimestamp', Date.now().toString());
      setLeagueRankings(rankingMap);
    } catch (error) {
      console.error('Failed to load league rankings:', error);
    }
  };

  const selectLeague = (league) => {
    setSelectedLeague(league);
    // 8️⃣ Zapisz wybraną ligę do localStorage (ID + pełne dane)
    localStorage.setItem('selectedLeagueId', league.id.toString());
    localStorage.setItem('selectedLeagueData', JSON.stringify(league));
  };

  const createLeague = async (leagueData) => {
    try {
      const response = await leagueApi.createLeague(leagueData);
      await loadMyLeagues();
      setSelectedLeague(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create league:', error);
      throw error;
    }
  };

  const joinLeague = async (leagueId) => {
    try {
      await leagueApi.joinLeague(leagueId);
      await loadMyLeagues();
    } catch (error) {
      console.error('Failed to join league:', error);
      throw error;
    }
  };

  const leaveLeague = async (leagueId) => {
    try {
      await leagueApi.leaveLeague(leagueId);
      await loadMyLeagues();

      // If leaving currently selected league, select first available
      if (selectedLeague?.id === leagueId) {
        const remaining = myLeagues.filter(l => l.id !== leagueId);
        setSelectedLeague(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (error) {
      console.error('Failed to leave league:', error);
      throw error;
    }
  };

  return (
    <LeagueContext.Provider
      value={{
        selectedLeague,
        myLeagues,
        leagueRankings,
        loading,
        selectLeague,
        createLeague,
        joinLeague,
        leaveLeague,
        refreshLeagues: loadMyLeagues
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeague = () => {
  const context = useContext(LeagueContext);
  if (!context) {
    throw new Error('useLeague must be used within LeagueProvider');
  }
  return context;
};
