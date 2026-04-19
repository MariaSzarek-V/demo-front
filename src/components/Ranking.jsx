import { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { rankingApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLeague } from '../contexts/LeagueContext';
import { getUserColor } from '../utils/userColors';

function Ranking() {
  const { user } = useAuth();
  const { selectedLeague } = useLeague();
  const navigate = useNavigate();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedLeague) {
      loadRanking();
    }
  }, [selectedLeague]);

  const loadRanking = async () => {
    try {
      setLoading(true);
      const response = await rankingApi.getRankingByLeague(selectedLeague.id);
      console.log('Ranking data:', response.data);
      setRanking(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading ranking:', err);
      setError('Nie udało się załadować rankingu');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="content-container">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const getPositionStyle = (index) => {
    if (index === 0) return { color: '#FFD700', fontWeight: 'bold' }; // złoty
    if (index === 1) return { color: '#C0C0C0', fontWeight: 'bold' }; // srebrny
    if (index === 2) return { color: '#CD7F32', fontWeight: 'bold' }; // brązowy
    return { color: '#000000', fontWeight: 'normal' }; // czarny, normalny
  };

  const getInitials = (username) => {
    if (!username) return '?';
    const parts = username.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const capitalizeFirstLetter = (username) => {
    if (!username) return '';
    return username.charAt(0).toUpperCase() + username.slice(1);
  };

  const getAvatarBackgroundColor = (username, index) => {
    // Top 3 get special colors
    if (index === 0) return '#FFD700'; // gold
    if (index === 1) return '#C0C0C0'; // silver
    if (index === 2) return '#CD7F32'; // bronze
    // Everyone else gets consistent color based on username
    return getUserColor(username);
  };

  return (
    <div className="content-container content-container-narrow">
      <Card className="border-start border-warning border-4 shadow mb-4">
        <Card.Body>
          {ranking && ranking.length > 0 ? (
            <div className="ranking-list" style={{ fontSize: '0.9rem' }}>
              {ranking.map((row, index) => {
                const isCurrentUser = row.username === user?.username;
                return (
                <div
                  key={row.position || index}
                  className="d-flex align-items-center p-2 rounded"
                  onClick={() => {
                    console.log('Clicked row:', row);
                    console.log('isCurrentUser:', isCurrentUser);
                    console.log('row.userId:', row.userId);
                    if (!isCurrentUser && row.userId) {
                      navigate(`/compare/${row.userId}`);
                    }
                  }}
                  style={{
                    borderBottom: index === 2 ? '3px solid #e3e6f0' : (index < ranking.length - 1 ? '1px solid #e3e6f0' : 'none'),
                    paddingBottom: index === 2 ? '12px' : '8px',
                    marginBottom: index === 2 ? '8px' : '0',
                    backgroundColor: isCurrentUser ? 'rgba(8, 145, 178, 0.08)' : 'transparent',
                    fontWeight: isCurrentUser ? 'bold' : 'normal',
                    cursor: !isCurrentUser && row.userId ? 'pointer' : 'default',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrentUser && row.userId) {
                      e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrentUser) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    } else {
                      e.currentTarget.style.backgroundColor = 'rgba(8, 145, 178, 0.08)';
                    }
                  }}
                >
                  {/* Pozycja */}
                  <span
                    className="d-flex align-items-center"
                    style={{ minWidth: '35px', fontSize: '0.95rem', ...getPositionStyle(index) }}
                  >
                    {row.position}.
                  </span>

                  {/* Avatar */}
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: row.avatarUrl ? 'transparent' : getAvatarBackgroundColor(row.username, index),
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      flexShrink: 0,
                      overflow: 'hidden',
                      border: index < 3 ? `2px solid ${getAvatarBackgroundColor(row.username, index)}` : '1px solid #e3e6f0',
                      marginLeft: '4px',
                      marginRight: '8px'
                    }}
                  >
                    {row.avatarUrl ? (
                      <img
                        src={row.avatarUrl}
                        alt={row.username}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = getInitials(row.username);
                        }}
                      />
                    ) : (
                      getInitials(row.username)
                    )}
                  </div>

                  {/* Username */}
                  <span
                    style={{
                      fontSize: '0.9rem',
                      flex: 1,
                      minWidth: 0,
                      color: '#000000',
                      fontWeight: index < 3 ? 'bold' : 'normal'
                    }}
                  >
                    {capitalizeFirstLetter(row.username)}
                  </span>

                  {/* Zmiana pozycji - stała szerokość */}
                  <div
                    className="d-flex align-items-center justify-content-end"
                    style={{ width: '50px', flexShrink: 0, fontSize: '0.9rem' }}
                  >
                    {row.positionChange !== null && row.positionChange !== 0 && (
                      <>
                        <i
                          className={`fas ${
                            row.positionChange > 0 ? 'fa-arrow-up' : 'fa-arrow-down'
                          }`}
                          style={{
                            color: row.positionChange > 0 ? '#1cc88a' : '#e74a3b',
                            fontSize: '0.9rem'
                          }}
                        ></i>
                        <span
                          className="ms-1"
                          style={{
                            color: row.positionChange > 0 ? '#1cc88a' : '#e74a3b',
                            fontSize: '0.9rem',
                            fontWeight: 'inherit'
                          }}
                        >
                          {Math.abs(row.positionChange)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Punkty */}
                  <span
                    style={{
                      fontSize: '0.9rem',
                      width: '70px',
                      textAlign: 'right',
                      flexShrink: 0,
                      color: '#000000',
                      fontWeight: 'inherit'
                    }}
                  >
                    {row.totalPoints} pkt
                  </span>
                </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted mb-0">Ranking pojawi się po pierwszym meczu</p>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default Ranking;
