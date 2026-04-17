import { createContext, useState, useContext, useEffect } from 'react';
import { leagueApi } from '../services/api';

const LeagueContext = createContext(null);

export const LeagueProvider = ({ children }) => {
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [myLeagues, setMyLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyLeagues();
  }, []);

  const loadMyLeagues = async () => {
    try {
      setLoading(true);
      const response = await leagueApi.getMyLeagues();
      setMyLeagues(response.data);

      // Auto-select first league if none selected
      if (response.data.length > 0 && !selectedLeague) {
        setSelectedLeague(response.data[0]);
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
