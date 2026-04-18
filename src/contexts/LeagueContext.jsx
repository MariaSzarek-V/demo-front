import { createContext, useState, useContext, useEffect } from 'react';
import { leagueApi, rankingApi, userApi } from '../services/api';

const LeagueContext = createContext(null);

export const LeagueProvider = ({ children }) => {
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [myLeagues, setMyLeagues] = useState([]);
  const [leagueRankings, setLeagueRankings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyLeagues();
  }, []);

  const loadMyLeagues = async () => {
    try {
      setLoading(true);
      const [leaguesResponse, userResponse] = await Promise.all([
        leagueApi.getMyLeagues(),
        userApi.getCurrentUser()
      ]);

      const leagues = leaguesResponse.data;
      const currentUsername = userResponse.data.username;

      // Fetch ranking for each league
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

      setLeagueRankings(rankingMap);
      setMyLeagues(leagues);

      // Auto-select first league if none selected
      if (leagues.length > 0 && !selectedLeague) {
        setSelectedLeague(leagues[0]);
      }
    } catch (error) {
      console.error('Failed to load leagues:', error);
      setMyLeagues([]);
    } finally {
      setLoading(false);
    }
  };

  const selectLeague = (league) => {
    setSelectedLeague(league);
    localStorage.setItem('selectedLeagueId', league.id);
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
