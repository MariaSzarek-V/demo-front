import { useState } from 'react';
import { useLeague } from '../contexts/LeagueContext';
import './LeagueSelector.css';

const LeagueSelector = () => {
  const { selectedLeague, myLeagues, leagueRankings, selectLeague } = useLeague();
  const [isOpen, setIsOpen] = useState(false);

  if (!selectedLeague || myLeagues.length === 0) {
    return null;
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
