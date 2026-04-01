import { useState, useEffect } from 'react';
import { Container, Card } from 'react-bootstrap';
import { rankingApi } from '../services/api';

function Ranking() {
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

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <i className="fas fa-trophy text-warning"></i> Ranking graczy
        </h1>
      </div>

      <Card className="border-start border-warning border-4 shadow mb-4">
        <Card.Body>
          <div className="text-xs fw-bold text-warning text-uppercase mb-2">
            🏆 Pełny Ranking
          </div>
          {ranking && ranking.length > 0 ? (
            <div className="ranking-list" style={{ fontSize: '0.9rem' }}>
              {ranking.map((row, index) => (
                <div
                  key={row.position || index}
                  className="p-2 rounded mb-2"
                  style={{ borderBottom: index < ranking.length - 1 ? '1px solid #e3e6f0' : 'none' }}
                >
                  <span className={getPositionColor(index)}>
                    #{row.position}
                  </span>
                  <span className="ms-2 text-dark">{row.username}</span>
                  <span className="float-end text-dark">
                    {row.totalPoints} pkt
                  </span>
                  {row.positionChange !== null && row.positionChange !== 0 && (
                    <span
                      className={`ms-2 small ${
                        row.positionChange > 0 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      <i
                        className={`fas ${
                          row.positionChange > 0 ? 'fa-arrow-up' : 'fa-arrow-down'
                        }`}
                      ></i>{' '}
                      {Math.abs(row.positionChange)}
                    </span>
                  )}
                </div>
              ))}
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
