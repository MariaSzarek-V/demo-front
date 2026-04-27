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
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalGames: 0,
    exactScores: 0,
    correctOutcome: 0,
    misses: 0
  });

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

      // Count predictions by points
      const exactScores = response.data?.filter(p => p.points === 3).length || 0;
      const correctOutcome = response.data?.filter(p => p.points === 1).length || 0;
      const misses = response.data?.filter(p => p.points === 0).length || 0;

      setStats({ totalPoints, totalGames, exactScores, correctOutcome, misses });

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

  const getPointsBadgeColor = (points) => {
    if (points === 3) return 'success';
    if (points === 1) return 'warning';
    return 'danger';
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
      <div className="d-flex justify-content-end mb-4">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate('/dashboard')}>
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
              <h4 className="text-info mb-0">
                {stats.totalGames > 0 ? (stats.totalPoints / stats.totalGames).toFixed(2) : '0.00'}
              </h4>
              <small className="text-muted">Średnia punktów/mecz</small>
            </div>
            <div className="border-start border-2 border-secondary"></div>
            <div>
              <div className="mb-2 d-flex flex-column align-items-center" style={{ borderBottom: '2px solid #ddd', paddingBottom: '8px' }}>
                <div className="fw-bold" style={{ fontSize: '0.875rem', color: '#28a745' }}>
                  {stats.exactScores} x 3 pkt
                </div>
                <div className="text-warning fw-bold" style={{ fontSize: '0.875rem' }}>
                  {stats.correctOutcome} x 1 pkt
                </div>
                <div className="text-danger fw-bold" style={{ fontSize: '0.875rem' }}>
                  {stats.misses} x 0 pkt
                </div>
              </div>
              <small className="text-muted">Szczegóły punktacji</small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Score Frequency Card */}
      {predictions && predictions.length > 0 && (() => {
        const predFreq = {};
        const actualFreq = {};

        predictions.forEach(p => {
          const predKey = `${p.predictedHomeScore}:${p.predictedAwayScore}`;
          predFreq[predKey] = (predFreq[predKey] || 0) + 1;

          if (p.actualHomeScore !== null && p.actualHomeScore !== undefined) {
            const actualKey = `${p.actualHomeScore}:${p.actualAwayScore}`;
            actualFreq[actualKey] = (actualFreq[actualKey] || 0) + 1;
          }
        });

        const topPred = Object.entries(predFreq).sort((a, b) => b[1] - a[1]);
        const topActual = Object.entries(actualFreq).sort((a, b) => b[1] - a[1]);

        return (
          <Card className="mb-4 shadow border-start border-primary border-4" style={{ borderRadius: '0.375rem', overflow: 'hidden' }}>
            <Card.Body>
              <div className="row">
                <div className="col-6">
                  <h6 className="text-muted mb-3">
                    <i className="fas fa-crosshairs me-2 text-primary"></i>
                    Najczęściej typowane wyniki
                  </h6>
                  <ol className="list-unstyled mb-0">
                    {topPred.map(([score, count], i) => (
                      <li key={score} className="d-flex align-items-center mb-2">
                        <span className="text-muted me-2" style={{ minWidth: '18px', fontSize: '0.8rem' }}>{i + 1}.</span>
                        <span className="fw-bold text-primary me-2" style={{ minWidth: '48px' }}>{score}</span>
                        <span className="badge bg-secondary">{count}×</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="col-6 border-start">
                  <h6 className="text-muted mb-3">
                    <i className="fas fa-futbol me-2 text-success"></i>
                    Najczęściej padające wyniki
                  </h6>
                  <ol className="list-unstyled mb-0">
                    {topActual.length > 0 ? topActual.map(([score, count], i) => (
                      <li key={score} className="d-flex align-items-center mb-2">
                        <span className="text-muted me-2" style={{ minWidth: '18px', fontSize: '0.8rem' }}>{i + 1}.</span>
                        <span className="fw-bold text-success me-2" style={{ minWidth: '48px' }}>{score}</span>
                        <span className="badge bg-secondary">{count}×</span>
                      </li>
                    )) : (
                      <li className="text-muted small">Brak zakończonych meczów</li>
                    )}
                  </ol>
                </div>
              </div>
            </Card.Body>
          </Card>
        );
      })()}

      {/* Predictions List */}
      {predictions && predictions.length > 0 ? (
        <Card className="border-start border-success border-4 shadow" style={{ borderRadius: '0.375rem', overflow: 'hidden' }}>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0">
                <tbody>
                  {predictions.map((pred) => {
                    const isFinished = pred.gameStatus === 'FINISHED';

                    return (
                      <tr
                        key={pred.gameId}
                        style={{
                          cursor: isFinished ? 'pointer' : 'default',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => {
                          if (isFinished) {
                            navigate(`/results/${pred.gameId}`);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (isFinished) {
                            e.currentTarget.style.transform = 'scale(1.01)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isFinished) {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                      >
                        {/* Game Info with Date and Result */}
                        <td className="text-center align-middle">
                          <small className="text-muted d-block mb-1">
                            {formatDate(pred.gameDate)}
                          </small>
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <strong style={{ flex: '1', textAlign: 'right' }}>{pred.homeTeam}</strong>
                            <span className={`fi fi-${pred.homeCountryCode?.toLowerCase()}`} style={{ flexShrink: 0 }}></span>
                            <strong className="text-primary" style={{ fontSize: '1.1rem', minWidth: '50px' }}>
                              {pred.actualHomeScore !== null && pred.actualHomeScore !== undefined
                                ? `${pred.actualHomeScore} : ${pred.actualAwayScore}`
                                : '- : -'}
                            </strong>
                            <span className={`fi fi-${pred.awayCountryCode?.toLowerCase()}`} style={{ flexShrink: 0 }}></span>
                            <strong style={{ flex: '1', textAlign: 'left' }}>{pred.awayTeam}</strong>
                          </div>
                        </td>

                        {/* My Prediction + Points */}
                        <td className="text-center align-middle" style={{ width: '15%' }}>
                          {isFinished ? (
                            <Badge bg={getPointsBadgeColor(pred.points)} className="mb-1">
                              {pred.points || 0} pkt
                            </Badge>
                          ) : (
                            <span className="text-muted d-block mb-1" style={{ fontSize: '0.75rem' }}>—</span>
                          )}
                          <div className="fw-bold" style={{ fontSize: '1rem' }}>
                            {pred.predictedHomeScore}:{pred.predictedAwayScore}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
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
