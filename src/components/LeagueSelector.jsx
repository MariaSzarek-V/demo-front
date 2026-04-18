import { useState } from 'react';
import { useLeague } from '../contexts/LeagueContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../i18n/translations';
import './LeagueSelector.css';

const LeagueSelector = () => {
  const { selectedLeague, myLeagues, leagueRankings, selectLeague, loading } = useLeague();
  const { language } = useLanguage();
  const t = useTranslation(language);
  const [isOpen, setIsOpen] = useState(false);

  // 🔄 Pokaż loading state podczas ładowania
  if (loading && !selectedLeague) {
    return (
      <div className="league-selector">
        <button className="league-selector-button" disabled>
          <span className="league-icon">⏳</span>
          <div className="league-button-info">
            <span className="league-name">{t('loadingLeagues')}</span>
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
            <span className="league-name">{t('joinLeague')}</span>
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
        </div>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="league-dropdown">
          {myLeagues.map((league) => {
            const leagueRanking = leagueRankings[league.id];
            return (
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
                  {leagueRanking && leagueRanking.totalUsers > 0 ? (
                    <span className="league-members">
                      {leagueRanking.position}/{leagueRanking.totalUsers} - {leagueRanking.points} {t('points')}
                    </span>
                  ) : (
                    <span className="league-members">{league.memberCount} {t('members')}</span>
                  )}
                </div>
                {league.id === selectedLeague.id && (
                  <span className="check-icon">✓</span>
                )}
              </button>
            );
          })}
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
