import { useState } from 'react';
import { useLeague } from '../contexts/LeagueContext';
import './LeagueSelector.css';

const LeagueSelector = () => {
  const { selectedLeague, myLeagues, leagueRankings, selectLeague, loading } = useLeague();
  const [isOpen, setIsOpen] = useState(false);

  // 🔄 Pokaż loading state podczas ładowania
  if (loading && !selectedLeague) {
    return (
      <div className="league-selector">
        <button className="league-selector-button" disabled>
          <span className="league-icon">⏳</span>
          <div className="league-button-info">
            <span className="league-name">Ładowanie lig...</span>
          </div>
        </button>
      </div>
    );
  }

  // 🚫 Jeśli użytkownik nie ma lig, pokaż przycisk "Dołącz do ligi"
  if (!selectedLeague && myLeagues.length === 0) {
    return (
      <div className="league-selector">
        <button
          className="league-selector-button"
          onClick={() => window.location.href = '/leagues'}
        >
          <span className="league-icon">➕</span>
          <div className="league-button-info">
            <span className="league-name">Dołącz do ligi</span>
          </div>
        </button>
      </div>
    );
  }

  const selectedRanking = leagueRankings[selectedLeague.id];

  return (
    <div className="league-selector">
      <button
        className="league-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="league-icon">🏆</span>
        <div className="league-button-info">
          <span className="league-name">{selectedLeague.name}</span>
          {selectedRanking && selectedRanking.totalUsers > 0 && (
            <span className="league-stats">
              {selectedRanking.position}/{selectedRanking.totalUsers} - {selectedRanking.points} pkt
            </span>
          )}
        </div>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="league-dropdown">
          {myLeagues.map((league) => (
            <button
              key={league.id}
              className={`league-option ${league.id === selectedLeague.id ? 'selected' : ''}`}
              onClick={() => {
                selectLeague(league);
                setIsOpen(false);
              }}
            >
              <span className="league-icon">🏆</span>
              <div className="league-info">
                <span className="league-name">{league.name}</span>
                <span className="league-members">{league.memberCount} członków</span>
              </div>
              {league.id === selectedLeague.id && (
                <span className="check-icon">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          className="league-dropdown-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default LeagueSelector;
