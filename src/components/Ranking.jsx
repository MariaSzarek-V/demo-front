import { useState, useEffect } from 'react';
import { Container, Card } from 'react-bootstrap';
import { rankingApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Ranking() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      setLoading(true);
      const response = await rankingApi.getRankingHistory();
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
      <Container fluid className="px-2 px-md-4 px-lg-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="px-2 px-md-4 px-lg-5">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </Container>
    );
  }

  const getPositionColor = (index) => {
    if (index === 0) return 'text-warning';
    if (index === 1) return 'text-secondary';
    if (index === 2) return 'text-info';
    return 'text-dark';
  };

  const getInitials = (username) => {
    if (!username) return '?';
    const parts = username.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const getAvatarBackgroundColor = (index) => {
    const colors = [
      '#FFD700', // gold
      '#C0C0C0', // silver
      '#CD7F32', // bronze
      '#4e73df', // blue
      '#1cc88a', // green
      '#36b9cc', // cyan
      '#f6c23e', // yellow
      '#e74a3b', // red
      '#858796', // gray
      '#5a5c69'  // dark gray
    ];
    return colors[index % colors.length];
  };

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5">
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
                  style={{
                    borderBottom: index < ranking.length - 1 ? '1px solid #e3e6f0' : 'none',
                    backgroundColor: isCurrentUser ? 'rgba(8, 145, 178, 0.08)' : 'transparent',
                    fontWeight: isCurrentUser ? 'bold' : 'normal'
                  }}
                >
                  {/* Pozycja */}
                  <span
                    className={`fw-bold ${getPositionColor(index)}`}
                    style={{ minWidth: '35px', fontSize: '0.95rem' }}
                  >
                    #{row.position}
                  </span>

                  {/* Avatar */}
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle me-2"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: row.avatarUrl ? 'transparent' : getAvatarBackgroundColor(index),
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      flexShrink: 0,
                      overflow: 'hidden',
                      border: index < 3 ? `2px solid ${getAvatarBackgroundColor(index)}` : '1px solid #e3e6f0'
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
                    className="text-dark"
                    style={{
                      fontSize: '0.9rem',
                      flex: 1,
                      minWidth: 0
                    }}
                  >
                    {row.username}
                  </span>

                  {/* Zmiana pozycji - stała szerokość */}
                  <div
                    className="d-flex align-items-center justify-content-end"
                    style={{ width: '50px', flexShrink: 0 }}
                  >
                    {row.positionChange !== null && row.positionChange !== 0 && (
                      <>
                        <i
                          className={`fas ${
                            row.positionChange > 0 ? 'fa-arrow-up' : 'fa-arrow-down'
                          }`}
                          style={{
                            color: row.positionChange > 0 ? '#1cc88a' : '#e74a3b',
                            fontSize: '0.85rem'
                          }}
                        ></i>
                        <span
                          className="ms-1"
                          style={{
                            color: row.positionChange > 0 ? '#1cc88a' : '#e74a3b',
                            fontSize: '0.8rem'
                          }}
                        >
                          {Math.abs(row.positionChange)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Punkty */}
                  <span
                    className="text-dark"
                    style={{
                      fontSize: '0.9rem',
                      width: '70px',
                      textAlign: 'right',
                      flexShrink: 0
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
    </Container>
  );
}

export default Ranking;
