import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { resultsApi } from '../services/api';
import { getUserColor } from '../utils/userColors';
import { useAuth } from '../contexts/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend);

function GameResults() {
  const { user } = useAuth();
  const { gameId } = useParams();
  const navigate = useNavigate();
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
        // Sortowanie: najpierw po punktach (malejąco), potem alfabetycznie
        const sortedData = [...data].sort((a, b) => {
          // Najpierw po punktach (malejąco)
          if (b.points !== a.points) {
            return b.points - a.points;
          }
          // Jeśli punkty takie same, sortuj alfabetycznie
          return a.username.localeCompare(b.username);
        });

        setResults(sortedData);
        calculateStats(sortedData);
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

  const capitalizeWords = (str) => {
    if (!str) return '';
    return str.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getPointsColor = (points) => {
    if (points === 3) return { bg: '#28a745', text: 'white' }; // green
    if (points === 1) return { bg: '#ffc107', text: '#000' }; // yellow
    return { bg: '#dc3545', text: 'white' }; // red
  };

  const chartData = gameStats ? {
    labels: ['3 pkt', '1 pkt', '0 pkt'],
    datasets: [{
      data: [gameStats.exactScores, gameStats.correctOutcome, gameStats.incorrect],
      backgroundColor: [
        'rgba(78, 141, 156, 0.8)',
        'rgba(255, 179, 63, 0.8)',
        'rgba(192, 7, 7, 0.8)'
      ],
      hoverBackgroundColor: [
        'rgba(78, 141, 156, 1)',
        'rgba(255, 179, 63, 1)',
        'rgba(192, 7, 7, 1)'
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
      </Container>
    );
  }

  const gameInfo = results.length > 0 ? results[0] : null;

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5 content-container-narrow">
      {/* Informacja o meczu */}
      {gameInfo && (
        <Row className="mb-2">
          <Col xs={12}>
            <Card className="border-start border-primary border-4 shadow h-100">
              <Card.Body style={{ padding: '0.5rem' }}>
                <div>
                  <span className="game-date text-muted d-block mb-1" style={{ fontSize: '0.9rem' }}>
                    {formatDate(gameInfo.gameDate)}
                  </span>

                  {/* Sprawdź czy nazwy są za długie - jeśli tak, użyj układu pionowego */}
                  {((gameInfo.homeTeam?.length || 0) + (gameInfo.awayTeam?.length || 0)) > 24 ? (
                    /* Układ pionowy (3 linie) dla długich nazw */
                    <div className="d-flex d-md-none flex-column align-items-center" style={{ lineHeight: '1.4' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto auto',
                          gap: '6px',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span className="fw-bold text-end">{gameInfo.homeTeam}</span>
                        <span className={`fi fi-${gameInfo.homeCountryCode?.toLowerCase()}`}></span>
                      </div>
                      <strong className="game-score text-primary" style={{ fontSize: '1.1rem', margin: '4px 0' }}>
                        {gameInfo.homeScore !== null && gameInfo.awayScore !== null
                          ? `${gameInfo.homeScore}:${gameInfo.awayScore}`
                          : '-:-'}
                      </strong>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto auto',
                          gap: '6px',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span className={`fi fi-${gameInfo.awayCountryCode?.toLowerCase()}`}></span>
                        <span className="fw-bold text-start">{gameInfo.awayTeam}</span>
                      </div>
                    </div>
                  ) : (
                    /* Układ grid (1 linia) - 5 kolumn */
                    <div
                      className="d-grid d-md-none align-items-center"
                      style={{
                        gridTemplateColumns: 'auto auto auto auto auto',
                        gap: '6px',
                        justifyContent: 'center'
                      }}
                    >
                      <span className="fw-bold text-end">{gameInfo.homeTeam}</span>
                      <span className={`fi fi-${gameInfo.homeCountryCode?.toLowerCase()}`} style={{ flexShrink: 0 }}></span>
                      <strong className="game-score text-primary text-center">
                        {gameInfo.homeScore !== null && gameInfo.awayScore !== null
                          ? `${gameInfo.homeScore}:${gameInfo.awayScore}`
                          : '-:-'}
                      </strong>
                      <span className={`fi fi-${gameInfo.awayCountryCode?.toLowerCase()}`} style={{ flexShrink: 0 }}></span>
                      <span className="fw-bold text-start">{gameInfo.awayTeam}</span>
                    </div>
                  )}

                  {/* Desktop - grid 5 kolumn */}
                  <div
                    className="d-none d-md-grid align-items-center"
                    style={{
                      gridTemplateColumns: 'auto auto auto auto auto',
                      gap: '8px',
                      justifyContent: 'center'
                    }}
                  >
                    <span className="fw-bold text-end">{gameInfo.homeTeam}</span>
                    <span className={`fi fi-${gameInfo.homeCountryCode?.toLowerCase()}`}></span>
                    <strong className="game-score text-primary text-center">
                      {gameInfo.homeScore !== null && gameInfo.awayScore !== null
                        ? `${gameInfo.homeScore}:${gameInfo.awayScore}`
                        : '-:-'}
                    </strong>
                    <span className={`fi fi-${gameInfo.awayCountryCode?.toLowerCase()}`}></span>
                    <span className="fw-bold text-start">{gameInfo.awayTeam}</span>
                  </div>
                </div>
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
            <Card className="border-start border-info border-4 shadow h-100">
              <Card.Header className="py-3">
                <h6 className="m-0 fw-bold text-info text-uppercase">
                  📊 Analiza typowania
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="fw-bold text-secondary mb-2" style={{ fontSize: '1rem' }}>NAJCZĘŚCIEJ TYPOWANY WYNIK</div>
                <div className="mb-3">
                  {gameStats.mostCommonCount === 1 ? (
                    <div className="mb-0 fw-bold text-muted" style={{ fontSize: '0.9rem' }}>
                      Brak powtarzających się typów
                    </div>
                  ) : (
                    <div>
                      {gameStats.mostCommonPredictions.map((prediction, index) => (
                        <div key={index} className="mb-1 fw-bold text-gray-800" style={{ fontSize: '0.9rem' }}>
                          {prediction} - {gameStats.mostCommonCount} {getPluralForm(gameStats.mostCommonCount)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Statystyka typowanych zwycięstw */}
                {gameInfo && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid #e3e6f0' }}>
                    <div className="fw-bold text-secondary mb-2" style={{ fontSize: '1rem' }}>TYPOWANY ZWYCIĘZCA</div>
                    <div className="small">
                      <div className="mb-1">
                        <span className={`fi fi-${gameInfo.homeCountryCode?.toLowerCase()} me-1`}></span>
                        {gameInfo.homeTeam} - {gameStats.homeTeamWinPredictions} {getPluralForm(gameStats.homeTeamWinPredictions)}
                      </div>
                      <div className="mb-1">
                        <span className={`fi fi-${gameInfo.awayCountryCode?.toLowerCase()} me-1`}></span>
                        {gameInfo.awayTeam} - {gameStats.awayTeamWinPredictions} {getPluralForm(gameStats.awayTeamWinPredictions)}
                      </div>
                      <div>
                        <span style={{ display: 'inline-block', width: '20px', marginRight: '0.25rem' }}></span>
                        Remis - {gameStats.drawPredictions} {getPluralForm(gameStats.drawPredictions)}
                      </div>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Wyniki typowania - Pie Chart */}
          <Col xl={6} md={6} className="mb-4">
            <Card className="border-start border-success border-4 shadow h-100">
              <Card.Header className="py-3">
                <h6 className="m-0 fw-bold text-success text-uppercase">
                  📈 Wyniki typowania
                </h6>
              </Card.Header>
              <Card.Body>
                <div style={{ height: '200px', position: 'relative' }}>
                  {chartData && <Pie data={chartData} options={chartOptions} />}
                </div>
                <div className="mt-3 small">
                  <div className="mb-1">
                    <i className="fas fa-circle text-success"></i> 3 pkt - {gameStats.exactScores} {getPluralForm(gameStats.exactScores)}
                  </div>
                  <div className="mb-1">
                    <i className="fas fa-circle text-warning"></i> 1 pkt - {gameStats.correctOutcome} {getPluralForm(gameStats.correctOutcome)}
                  </div>
                  <div>
                    <i className="fas fa-circle text-danger"></i> 0 pkt - {gameStats.incorrect} {getPluralForm(gameStats.incorrect)}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Desktop View - Ranking style */}
      <Card className="border-start border-success border-4 shadow mb-4 d-none d-md-block">
        <Card.Body>
          {results && results.length > 0 ? (
            <div className="results-list" style={{ fontSize: '0.9rem' }}>
              {results.map((row, index) => {
                const getPositionStyle = (idx) => {
                  if (idx === 0) return { color: '#FFD700', fontWeight: 'bold' }; // złoty
                  if (idx === 1) return { color: '#C0C0C0', fontWeight: 'bold' }; // srebrny
                  if (idx === 2) return { color: '#CD7F32', fontWeight: 'bold' }; // brązowy
                  return { color: '#000000', fontWeight: 'bold' }; // czarny
                };

                const getInitials = (username) => {
                  if (!username) return '?';
                  const parts = username.trim().split(' ');
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  }
                  return username.substring(0, 2).toUpperCase();
                };

                const getAvatarBackgroundColor = (username, idx) => {
                  // Top 3 get special colors
                  if (idx === 0) return '#FFD700'; // gold
                  if (idx === 1) return '#C0C0C0'; // silver
                  if (idx === 2) return '#CD7F32'; // bronze
                  // Everyone else gets consistent color based on username
                  return getUserColor(username);
                };

                const isCurrentUser = row.username === user?.username;

                return (
                  <div
                    key={index}
                    className="d-flex align-items-center p-2 rounded"
                    onClick={() => {
                      if (!isCurrentUser) {
                        navigate(`/compare/${row.userId}`);
                      }
                    }}
                    style={{
                      borderBottom: index < results.length - 1 ? '1px solid #e3e6f0' : 'none',
                      backgroundColor: isCurrentUser ? 'rgba(8, 145, 178, 0.08)' : 'transparent',
                      fontWeight: isCurrentUser ? 'bold' : 'normal',
                      cursor: !isCurrentUser ? 'pointer' : 'default',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentUser) {
                        e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentUser) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {/* Pozycja */}
                    <span
                      className="d-flex align-items-center"
                      style={{ minWidth: '35px', fontSize: '0.95rem', ...getPositionStyle(index), gap: '4px' }}
                    >
                      {index + 1}.
                    </span>

                    {/* Avatar */}
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle me-2"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: row.avatarUrl ? 'transparent' : getAvatarBackgroundColor(row.username, index),
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        flexShrink: 0,
                        overflow: 'hidden',
                        border: index < 3 ? `2px solid ${getAvatarBackgroundColor(row.username, index)}` : '1px solid #e3e6f0'
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
                        color: '#000000'
                      }}
                    >
                      {capitalizeWords(row.username)}
                    </span>

                    {/* Typowany wynik */}
                    <span
                      className="me-3"
                      style={{
                        fontSize: '0.9rem',
                        fontFamily: 'monospace',
                        fontWeight: '600',
                        color: '#4e73df',
                        backgroundColor: 'rgba(78, 115, 223, 0.15)',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        border: '1px solid rgba(78, 115, 223, 0.3)',
                        minWidth: '60px',
                        textAlign: 'center'
                      }}
                    >
                      {row.predictedHomeScore}:{row.predictedAwayScore}
                    </span>

                    {/* Punkty */}
                    <span
                      style={{
                        fontSize: '0.9rem',
                        width: '70px',
                        textAlign: 'center',
                        flexShrink: 0,
                        backgroundColor: getPointsColor(row.points).bg,
                        color: getPointsColor(row.points).text,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}
                    >
                      {row.points} pkt
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted mb-0">Brak rezultatów do wyświetlenia</p>
          )}
        </Card.Body>
      </Card>

      {/* Mobile View - Ranking style */}
      <Card className="border-start border-success border-4 shadow mb-4 d-md-none">
        <Card.Body>
          {results && results.length > 0 ? (
            <div className="results-list" style={{ fontSize: '0.9rem' }}>
              {results.map((row, index) => {
                const getPositionStyle = (idx) => {
                  if (idx === 0) return { color: '#FFD700', fontWeight: 'bold' };
                  if (idx === 1) return { color: '#C0C0C0', fontWeight: 'bold' };
                  if (idx === 2) return { color: '#CD7F32', fontWeight: 'bold' };
                  return { color: '#000000', fontWeight: 'bold' };
                };

                const getInitials = (username) => {
                  if (!username) return '?';
                  const parts = username.trim().split(' ');
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  }
                  return username.substring(0, 2).toUpperCase();
                };

                const getAvatarBackgroundColor = (username, idx) => {
                  // Top 3 get special colors
                  if (idx === 0) return '#FFD700'; // gold
                  if (idx === 1) return '#C0C0C0'; // silver
                  if (idx === 2) return '#CD7F32'; // bronze
                  // Everyone else gets consistent color based on username
                  return getUserColor(username);
                };

                const isCurrentUser = row.username === user?.username;

                return (
                  <div
                    key={index}
                    className="d-flex align-items-center p-2 rounded"
                    onClick={() => {
                      if (!isCurrentUser) {
                        navigate(`/compare/${row.userId}`);
                      }
                    }}
                    style={{
                      borderBottom: index < results.length - 1 ? '1px solid #e3e6f0' : 'none',
                      backgroundColor: isCurrentUser ? 'rgba(8, 145, 178, 0.08)' : 'transparent',
                      fontWeight: isCurrentUser ? 'bold' : 'normal',
                      cursor: !isCurrentUser ? 'pointer' : 'default',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentUser) {
                        e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentUser) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {/* Pozycja */}
                    <span
                      className="d-flex align-items-center"
                      style={{ minWidth: '35px', fontSize: '0.95rem', ...getPositionStyle(index), gap: '4px' }}
                    >
                      {index + 1}.
                    </span>

                    {/* Avatar */}
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle me-2"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: row.avatarUrl ? 'transparent' : getAvatarBackgroundColor(row.username, index),
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        flexShrink: 0,
                        overflow: 'hidden',
                        border: index < 3 ? `2px solid ${getAvatarBackgroundColor(row.username, index)}` : '1px solid #e3e6f0'
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
                        color: '#000000'
                      }}
                    >
                      {capitalizeWords(row.username)}
                    </span>

                    {/* Typowany wynik */}
                    <span
                      className="me-2"
                      style={{
                        fontSize: '0.9rem',
                        fontFamily: 'monospace',
                        fontWeight: '600',
                        color: '#4e73df',
                        backgroundColor: 'rgba(78, 115, 223, 0.15)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(78, 115, 223, 0.3)',
                        minWidth: '50px',
                        textAlign: 'center'
                      }}
                    >
                      {row.predictedHomeScore}:{row.predictedAwayScore}
                    </span>

                    {/* Punkty */}
                    <span
                      style={{
                        fontSize: '0.9rem',
                        width: '60px',
                        textAlign: 'center',
                        flexShrink: 0,
                        backgroundColor: getPointsColor(row.points).bg,
                        color: getPointsColor(row.points).text,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}
                    >
                      {row.points} pkt
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted mb-0">Brak rezultatów do wyświetlenia</p>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default GameResults;
