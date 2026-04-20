import { useState } from 'react';
import { useLeague } from '../contexts/LeagueContext';
import './LeagueSelector.css';

const LeagueSelector = () => {
  const { selectedLeague, myLeagues, leagueRankings, selectLeague, loading } = useLeague();
  const [isOpen, setIsOpen] = useState(false);

  console.log('LeagueSelector render:', { isOpen, selectedLeague, myLeaguesCount: myLeagues.length, loading });

  // 🔄 Pokaż loading state podczas ładowania (zawsze gdy loading=true)
  if (loading) {
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
  if (!loading && !selectedLeague && myLeagues.length === 0) {
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
        onClick={() => {
          console.log('Button clicked, isOpen:', isOpen, '-> toggling to:', !isOpen);
          setIsOpen(!isOpen);
        }}
      >
        <span className="league-icon">🏆</span>
        <div className="league-button-info d-none d-md-block">
          <span className="league-name">{selectedLeague.name}</span>
        </div>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="league-dropdown-overlay"
            onClick={() => {
              console.log('Overlay clicked, closing dropdown');
              setIsOpen(false);
            }}
          />
          <div className="league-dropdown">
            {myLeagues.length === 0 ? (
              <div style={{ padding: '16px', color: '#7f8c8d', textAlign: 'center' }}>
                {loading ? '⏳ Ładowanie...' : 'Brak dostępnych lig'}
              </div>
            ) : (
              myLeagues.map((league) => {
                const leagueRanking = leagueRankings[league.id];
                return (
                  <button
                    key={league.id}
                    className={`league-option ${league.id === selectedLeague.id ? 'selected' : ''}`}
                    onClick={(e) => {
                      console.log('League clicked:', league.name);
                      e.stopPropagation();
                      selectLeague(league);
                      setIsOpen(false);
                    }}
                  >
                    <span className="league-icon">🏆</span>
                    <div className="league-info">
                      <span className="league-name">{league.name}</span>
                      {leagueRanking && leagueRanking.totalUsers > 0 ? (
                        <span className="league-members">
                          {leagueRanking.position}/{leagueRanking.totalUsers} - {leagueRanking.points} pkt
                        </span>
                      ) : (
                        <span className="league-members">{league.memberCount} członków</span>
                      )}
                    </div>
                    {league.id === selectedLeague.id && (
                      <span className="check-icon">✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LeagueSelector;
