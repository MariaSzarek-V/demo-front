import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Table, Button, Badge, Alert } from 'react-bootstrap';
import { predictionApi } from '../services/api';
import { useLeague } from '../contexts/LeagueContext';

console.log('PredictionHistory.jsx loaded');

function PredictionHistory() {
  console.log('PredictionHistory function called');
  const navigate = useNavigate();
  const { selectedLeague } = useLeague();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalPoints: 0, totalGames: 0 });

  console.log('PredictionHistory render:', { loading, error, selectedLeague, predictionsCount: predictions.length });

  useEffect(() => {
    console.log('PredictionHistory useEffect:', { selectedLeague, hasLeague: !!selectedLeague });
    if (selectedLeague) {
      loadPredictionHistory();
    } else {
      setLoading(false);
    }
  }, [selectedLeague]);

  const loadPredictionHistory = async () => {
    try {
      console.log('loadPredictionHistory started for league:', selectedLeague.id);
      setLoading(true);
      const response = await predictionApi.getMyPredictionHistory(selectedLeague.id);
      console.log('loadPredictionHistory response:', response.data);
      setPredictions(response.data || []);

      // Calculate statistics
      const totalPoints = response.data?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;
      const totalGames = response.data?.length || 0;
      setStats({ totalPoints, totalGames });

      setLoading(false);
    } catch (err) {
      console.error('Error loading prediction history:', err);
      setError('Nie udało się załadować historii typowań');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    let date;
    if (Array.isArray(dateString)) {
      const [year, month, day, hour, minute] = dateString;
      date = new Date(year, month - 1, day, hour, minute);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPointsBadgeVariant = (points) => {
    if (points === 5) return 'success';
    if (points === 3) return 'info';
    if (points === 1) return 'warning';
    return 'secondary';
  };

  const getPointsLabel = (points) => {
    if (points === 5) return 'Dokładny wynik';
    if (points === 3) return 'Trafiony wynik';
    if (points === 1) return 'Różnica bramek';
    return 'Brak trafienia';
  };

  if (loading) {
    return (
      <Container fluid className="px-2 px-md-4 px-lg-5 content-container-narrow">
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
      <Container fluid className="px-2 px-md-4 px-lg-5 content-container-narrow">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Powrót do dashboardu
        </Button>
      </Container>
    );
  }

  if (!selectedLeague) {
    return (
      <Container fluid className="px-2 px-md-4 px-lg-5 content-container-narrow">
        <div className="alert alert-warning" role="alert">
          Nie wybrano ligi. Proszę wybrać ligę.
        </div>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Powrót do dashboardu
        </Button>
      </Container>
    );
  }

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5 content-container-narrow">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0">
          <i className="fas fa-history me-2 text-primary"></i>
          Historia typowania
        </h2>
        <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
          <i className="fas fa-arrow-left me-2"></i>
          Powrót
        </Button>
      </div>

      {/* Statistics Card */}
      <Card className="mb-4 shadow">
        <Card.Body>
          <div className="d-flex justify-content-around text-center">
            <div>
              <h4 className="text-primary mb-0">{stats.totalGames}</h4>
              <small className="text-muted">Wytypowanych meczów</small>
            </div>
            <div className="border-start border-2 border-secondary"></div>
            <div>
              <h4 className="text-success mb-0">{stats.totalPoints}</h4>
              <small className="text-muted">Łączna liczba punktów</small>
            </div>
            <div className="border-start border-2 border-secondary"></div>
            <div>
              <h4 className="text-info mb-0">
                {stats.totalGames > 0 ? (stats.totalPoints / stats.totalGames).toFixed(2) : '0.00'}
              </h4>
              <small className="text-muted">Średnia punktów/mecz</small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Predictions Table */}
      {predictions && predictions.length > 0 ? (
        <Card className="shadow">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '15%' }}>Data meczu</th>
                  <th style={{ width: '30%' }}>Mecz</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Wynik</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Typ</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Punkty</th>
                  <th style={{ width: '16%', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred) => (
                  <tr
                    key={pred.gameId}
                    style={{ cursor: pred.gameStatus === 'FINISHED' ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (pred.gameStatus === 'FINISHED') {
                        navigate(`/results/${pred.gameId}`);
                      }
                    }}
                  >
                    <td>
                      <small className="text-muted">
                        {formatDate(pred.gameDate)}
                      </small>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <span className={`fi fi-${pred.homeCountryCode?.toLowerCase()} me-2`}></span>
                        <strong>{pred.homeTeam}</strong>
                        <span className="mx-2 text-muted">-</span>
                        <strong>{pred.awayTeam}</strong>
                        <span className={`fi fi-${pred.awayCountryCode?.toLowerCase()} ms-2`}></span>
                      </div>
                    </td>
                    <td className="text-center">
                      {pred.actualHomeScore !== null && pred.actualHomeScore !== undefined ? (
                        <strong className="text-primary" style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
                          {pred.actualHomeScore}:{pred.actualAwayScore}
                        </strong>
                      ) : (
                        <span className="text-muted">-:-</span>
                      )}
                    </td>
                    <td className="text-center">
                      <strong style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#4e73df' }}>
                        {pred.predictedHomeScore}:{pred.predictedAwayScore}
                      </strong>
                    </td>
                    <td className="text-center">
                      {pred.gameStatus === 'FINISHED' ? (
                        <>
                          <Badge
                            bg={getPointsBadgeVariant(pred.points)}
                            className="me-2"
                            style={{ fontSize: '0.9rem', padding: '0.4em 0.6em' }}
                          >
                            {pred.points || 0} pkt
                          </Badge>
                          <div>
                            <small className="text-muted">
                              {getPointsLabel(pred.points)}
                            </small>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="text-center">
                      {pred.gameStatus === 'FINISHED' ? (
                        <Badge bg="success">Zakończony</Badge>
                      ) : pred.gameStatus === 'SCHEDULED' ? (
                        <Badge bg="info">Zaplanowany</Badge>
                      ) : (
                        <Badge bg="secondary">{pred.gameStatus}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      ) : (
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          Nie masz jeszcze żadnych typowań.
        </Alert>
      )}
    </Container>
  );
}

export default PredictionHistory;
