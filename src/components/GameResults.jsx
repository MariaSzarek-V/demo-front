import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Card, Row, Col, Table, Badge } from 'react-bootstrap';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { resultsApi } from '../services/api';

ChartJS.register(ArcElement, Tooltip, Legend);

function GameResults() {
  const { gameId } = useParams();
  const [results, setResults] = useState([]);
  const [gameStats, setGameStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResults();
  }, [gameId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await resultsApi.getAllUsersPredictionResults(gameId);
      const data = response.data;

      if (data && data.length > 0) {
        setResults(data);
        calculateStats(data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading results:', err);
      setError('Nie udało się załadować wyników');
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    // Calculate most common predictions
    const predictionCounts = {};
    data.forEach(result => {
      const predictionKey = `${result.predictedHomeScore}:${result.predictedAwayScore}`;
      predictionCounts[predictionKey] = (predictionCounts[predictionKey] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(predictionCounts));
    const mostCommonPredictions = Object.keys(predictionCounts).filter(
      key => predictionCounts[key] === maxCount
    );

    // Calculate outcome predictions
    let homeTeamWinPredictions = 0;
    let awayTeamWinPredictions = 0;
    let drawPredictions = 0;

    data.forEach(result => {
      if (result.predictedHomeScore > result.predictedAwayScore) {
        homeTeamWinPredictions++;
      } else if (result.predictedHomeScore < result.predictedAwayScore) {
        awayTeamWinPredictions++;
      } else {
        drawPredictions++;
      }
    });

    // Calculate accuracy (by points)
    let exactScores = 0;
    let correctOutcome = 0;
    let incorrect = 0;

    data.forEach(result => {
      if (result.points === 3) {
        exactScores++;
      } else if (result.points === 1) {
        correctOutcome++;
      } else {
        incorrect++;
      }
    });

    setGameStats({
      mostCommonPredictions,
      mostCommonCount: maxCount,
      homeTeamWinPredictions,
      awayTeamWinPredictions,
      drawPredictions,
      exactScores,
      correctOutcome,
      incorrect
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPluralForm = (count) => {
    if (count === 1) return 'osoba';
    if (count > 1 && count < 5) return 'osoby';
    return 'osób';
  };

  const chartData = gameStats ? {
    labels: ['Dokładne (3 pkt)', 'Trafione (1 pkt)', 'Nietrafione (0 pkt)'],
    datasets: [{
      data: [gameStats.exactScores, gameStats.correctOutcome, gameStats.incorrect],
      backgroundColor: [
        'rgba(28, 200, 138, 0.8)',
        'rgba(246, 194, 62, 0.8)',
        'rgba(231, 74, 59, 0.8)'
      ],
      hoverBackgroundColor: [
        'rgba(28, 200, 138, 1)',
        'rgba(246, 194, 62, 1)',
        'rgba(231, 74, 59, 1)'
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = gameStats.exactScores + gameStats.correctOutcome + gameStats.incorrect;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return label + ': ' + value + ' (' + percentage + '%)';
          }
        }
      }
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

  const gameInfo = results.length > 0 ? results[0] : null;

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5">
      {/* Informacja o meczu */}
      {gameInfo && (
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="border-start border-primary border-4 shadow h-100 py-2">
              <Card.Body>
                <Row className="align-items-center">
                  <Col>
                    <div className="text-xs fw-bold text-primary text-uppercase mb-1">
                      {formatDate(gameInfo.gameDate)}
                    </div>
                    <div className="h5 mb-0 fw-bold text-gray-800">
                      <span className={`fi fi-${gameInfo.homeCountryCode?.toLowerCase()} me-1`}></span>
                      <span>{gameInfo.homeTeam}</span>
                      <span className="text-primary mx-2">{gameInfo.homeScore}:{gameInfo.awayScore}</span>
                      <span>{gameInfo.awayTeam}</span>
                      <span className={`fi fi-${gameInfo.awayCountryCode?.toLowerCase()} ms-1`}></span>
                    </div>
                  </Col>
                  <Col xs="auto">
                    <i className="fas fa-futbol fa-2x text-gray-300"></i>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Statystyki meczu */}
      {gameStats && (
        <Row>
          {/* Najczęściej typowany wynik i Rozstrzygnięcia */}
          <Col xl={6} md={6} className="mb-4">
            <Card className="border-start border-info border-4 shadow h-100 py-2">
              <Card.Body>
                <Row className="align-items-center">
                  <Col>
                    <div className="text-xs fw-bold text-info text-uppercase mb-1">
                      Najczęściej typowany wynik
                    </div>

                    <div className="mb-3">
                      {gameStats.mostCommonCount === 1 ? (
                        <div className="h6 mb-0 fw-bold text-muted">
                          Brak powtarzających się typów
                        </div>
                      ) : (
                        <div>
                          {gameStats.mostCommonPredictions.map((prediction, index) => (
                            <div key={index}>
                              <span className="h5 mb-0 fw-bold text-gray-800">{prediction}</span>
                              <small className="text-muted">
                                {' '}({gameStats.mostCommonCount} {getPluralForm(gameStats.mostCommonCount)})
                              </small>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Statystyka rozstrzygnięć */}
                    {gameInfo && (
                      <div className="mt-2 pt-2" style={{ borderTop: '1px solid #e3e6f0' }}>
                        <div className="text-xs fw-bold text-secondary mb-2">ROZSTRZYGNIĘCIA:</div>
                        <div className="small">
                          <div className="mb-1">
                            <i className="fas fa-home text-success me-1"></i>
                            <span>{gameInfo.homeTeam}</span>:
                            <strong> {gameStats.homeTeamWinPredictions}</strong>
                            {' '}{getPluralForm(gameStats.homeTeamWinPredictions)}
                          </div>
                          <div className="mb-1">
                            <i className="fas fa-plane text-primary me-1"></i>
                            <span>{gameInfo.awayTeam}</span>:
                            <strong> {gameStats.awayTeamWinPredictions}</strong>
                            {' '}{getPluralForm(gameStats.awayTeamWinPredictions)}
                          </div>
                          <div>
                            <i className="fas fa-handshake text-warning me-1"></i>
                            Remis:
                            <strong> {gameStats.drawPredictions}</strong>
                            {' '}{getPluralForm(gameStats.drawPredictions)}
                          </div>
                        </div>
                      </div>
                    )}
                  </Col>
                  <Col xs="auto">
                    <i className="fas fa-poll fa-2x text-gray-300"></i>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Dokładność typów - Donut Chart */}
          <Col xl={6} md={6} className="mb-4">
            <Card className="shadow h-100">
              <Card.Header className="py-3">
                <h6 className="m-0 fw-bold text-primary">Dokładność typów</h6>
              </Card.Header>
              <Card.Body>
                <div style={{ height: '200px', position: 'relative' }}>
                  {chartData && <Doughnut data={chartData} options={chartOptions} />}
                </div>
                <div className="mt-3 text-center small">
                  <span className="me-2">
                    <i className="fas fa-circle text-success"></i> Dokładne ({gameStats.exactScores})
                  </span>
                  <span className="me-2">
                    <i className="fas fa-circle text-warning"></i> Trafione ({gameStats.correctOutcome})
                  </span>
                  <span className="me-2">
                    <i className="fas fa-circle text-danger"></i> Nietrafione ({gameStats.incorrect})
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Desktop Table View */}
      <Card className="shadow mb-4 d-none d-md-block">
        <Card.Body>
          <div className="table-responsive">
            <Table bordered className="mb-0">
              <thead>
                <tr>
                  <th>Nr</th>
                  <th>Gracz</th>
                  <th>Typowany Wynik</th>
                  <th>Punkty</th>
                </tr>
              </thead>
              <tbody>
                {results && results.length > 0 ? (
                  results.map((row, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{row.username}</td>
                      <td>{row.predictedHomeScore} : {row.predictedAwayScore}</td>
                      <td>{row.points}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center h3 mb-2 text-gray-800">
                      Brak rezultatów do wyświetlenia
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Mobile Card View */}
      <div className="d-md-none">
        {results && results.length > 0 ? (
          results.map((row, index) => (
            <Card key={index} className="shadow mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <Badge bg="secondary" pill className="me-2">#{index + 1}</Badge>
                    <strong>{row.username}</strong>
                  </div>
                  <div className="text-end">
                    <div>
                      <Badge bg="info" pill className="mb-1">
                        {row.predictedHomeScore}:{row.predictedAwayScore}
                      </Badge>
                    </div>
                    <div>
                      <Badge bg="success">{row.points} pkt</Badge>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))
        ) : (
          <Card className="shadow mb-3">
            <Card.Body className="text-center text-muted">
              Brak rezultatów do wyświetlenia
            </Card.Body>
          </Card>
        )}
      </div>
    </Container>
  );
}

export default GameResults;
