import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import RankingChart from './RankingChart';
import NestedDonutChart from './NestedDonutChart';
import { dashboardApi, resultsApi } from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Get dashboard data
      const dashboardData = await dashboardApi.getDashboardData();
      const { user, upcomingGames, finishedGames, myPredictions, ranking } = dashboardData;

      // Get my prediction results for statistics
      const myResults = await resultsApi.getMyPredictionResults();

      // Merge upcoming games with predictions
      const upcomingGamesWithPredictions = upcomingGames.map(game => {
        const prediction = myPredictions.find(p => p.gameId === game.id);
        return {
          ...game,
          hasPrediction: !!prediction,
          predictedHomeScore: prediction?.predictedHomeScore,
          predictedAwayScore: prediction?.predictedAwayScore
        };
      });

      // Merge finished games with predictions
      const finishedGamesWithPredictions = finishedGames.map(game => {
        const prediction = myPredictions.find(p => p.gameId === game.id);
        return {
          ...game,
          hasPrediction: !!prediction,
          predictedHomeScore: prediction?.predictedHomeScore,
          predictedAwayScore: prediction?.predictedAwayScore,
          points: prediction?.points
        };
      });

      // Calculate user statistics
      const userStats = calculateUserStats(myResults.data);

      // Prepare mini ranking (top 3 + current user if not in top 3)
      const miniRanking = prepareMiniRanking(ranking, user.username);

      setStats({
        ...userStats,
        miniRanking,
        upcomingGames: upcomingGamesWithPredictions.slice(0, 5),
        recentGames: finishedGamesWithPredictions.slice(0, 5)
      });

      setLoading(false);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Nie udało się załadować dashboardu');
      setLoading(false);
    }
  };

  const calculateUserStats = (results) => {
    if (!results || results.length === 0) {
      return {
        mostFrequentPrediction: null,
        mostFrequentCount: 0,
        exactMatches: 0,
        partialMatches: 0,
        noMatches: 0,
        almostPerfect: 0
      };
    }

    // Count prediction frequencies
    const predictionCounts = {};
    let exactMatches = 0;
    let partialMatches = 0;
    let noMatches = 0;
    let almostPerfect = 0;

    results.forEach(result => {
      const predictionKey = `${result.predictedHomeScore}:${result.predictedAwayScore}`;
      predictionCounts[predictionKey] = (predictionCounts[predictionKey] || 0) + 1;

      // Count points
      if (result.points === 3) {
        exactMatches++;
      } else if (result.points === 1) {
        partialMatches++;
      } else if (result.points === 0) {
        noMatches++;

        // Check if almost perfect (1 goal difference from exact)
        const homeDiff = Math.abs(result.predictedHomeScore - result.homeScore);
        const awayDiff = Math.abs(result.predictedAwayScore - result.awayScore);
        if (homeDiff + awayDiff === 1) {
          almostPerfect++;
        }
      }
    });

    // Find most frequent prediction
    const maxCount = Math.max(...Object.values(predictionCounts));
    const mostFrequent = Object.keys(predictionCounts).find(
      key => predictionCounts[key] === maxCount
    );

    return {
      mostFrequentPrediction: mostFrequent || null,
      mostFrequentCount: maxCount,
      exactMatches,
      partialMatches,
      noMatches,
      almostPerfect
    };
  };

  const prepareMiniRanking = (ranking, currentUsername) => {
    if (!ranking || ranking.length === 0) return [];

    const top3 = ranking.slice(0, 3).map(r => ({
      position: r.position,
      username: r.username,
      totalPoints: r.totalPoints,
      isCurrentUser: r.username === currentUsername
    }));

    // Check if current user is in top 3
    const userInTop3 = top3.some(r => r.isCurrentUser);

    if (!userInTop3) {
      // Find current user in ranking
      const currentUser = ranking.find(r => r.username === currentUsername);
      if (currentUser) {
        return [
          ...top3,
          null, // separator
          {
            position: currentUser.position,
            username: currentUser.username,
            totalPoints: currentUser.totalPoints,
            isCurrentUser: true
          }
        ];
      }
    }

    return top3;
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

  if (!stats) return null;

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5">
      {/* Content Row - Statystyki */}
      <Row className="mt-4">
        {/* Twoje wyniki */}
        <Col xl={6} md={6} className="mb-4">
          <Card className="border-start border-primary border-4 shadow h-100">
            <Card.Body className="py-3">
              <div className="text-xs fw-bold text-primary text-uppercase mb-3">
                Twoje wyniki
              </div>

              {/* Najczęściej typowany wynik */}
              {stats.mostFrequentPrediction && (
                <div className="mb-3">
                  <div className="text-md fw-bold text-secondary mb-1">
                    Najczęściej typujesz
                  </div>
                  <div>
                    <strong className="fs-5">{stats.mostFrequentPrediction}</strong>
                    <strong className="text-muted ms-2">
                      x{stats.mostFrequentCount}
                    </strong>
                  </div>
                </div>
              )}

              {/* Statystyki punktowe */}
              <div className="mb-2">
                <div className="text-md fw-bold text-secondary mb-1">
                  Efektywność typowania
                </div>
                <div className="mb-1">
                  <span className="text-success">
                    🏆 {stats.exactMatches}
                  </span>
                  <strong className="text-secondary ms-2">x 3 pkt</strong>
                </div>
                <div className="mb-1">
                  <span className="text-warning">
                    ⚡ {stats.partialMatches}
                  </span>
                  <small className="text-secondary ms-2">x 1 pkt</small>
                </div>
                <div className="mb-1">
                  <span className="text-danger">
                    ❌ {stats.noMatches}
                  </span>
                  <small className="text-secondary ms-2">x 0 pkt</small>
                </div>
                {stats.almostPerfect > 0 && (
                  <div className="mb-1">
                    <span className="text-info">
                      😫 {stats.almostPerfect}
                    </span>
                    <small className="text-secondary ms-2">x prawie!</small>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Mini Ranking */}
        <Col xl={6} md={6} className="mb-4">
          <Card className="border-start border-warning border-4 shadow h-100">
            <Card.Body className="py-3">
              <div className="text-xs fw-bold text-warning text-uppercase mb-2">
                🏆 Mini Ranking
              </div>
              {stats.miniRanking && stats.miniRanking.length > 0 ? (
                <>
                  <div className="ranking-list" style={{ fontSize: '0.9rem' }}>
                    {stats.miniRanking.map((rank, index) => {
                      if (rank === null) {
                        return (
                          <div
                            key={`separator-${index}`}
                            className="text-center text-muted py-1"
                          >
                            ⋯
                          </div>
                        );
                      }
                      const positionColor =
                        index === 0
                          ? 'text-warning'
                          : index === 1
                          ? 'text-secondary'
                          : index === 2
                          ? 'text-info'
                          : 'text-dark';
                      return (
                        <div
                          key={rank.position}
                          className={`p-2 rounded mb-2 ${
                            rank.isCurrentUser ? 'fw-bold bg-light' : ''
                          }`}
                        >
                          <span className={positionColor}>
                            #{rank.position}
                          </span>
                          <span
                            className={`ms-2 ${
                              rank.isCurrentUser ? 'text-primary' : 'text-dark'
                            }`}
                          >
                            {rank.username}
                          </span>
                          <span className="float-end text-dark">
                            {rank.totalPoints} pkt
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-center">
                    <Button as={Link} to="/ranking" variant="outline-warning" size="sm">
                      <i className="fas fa-list"></i> Pełny ranking
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted mb-0">Brak danych rankingu</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Najbliższe mecze */}
      {stats.upcomingGames && stats.upcomingGames.length > 0 && (
        <Card className="border-start border-info border-4 shadow mb-4">
          <Card.Body>
            <div className="text-xs fw-bold text-info text-uppercase mb-2">
              📅 Najbliższe mecze
            </div>
            <div className="games-list" style={{ fontSize: '0.9rem' }}>
              {stats.upcomingGames.map((game) => (
                <div
                  key={game.id}
                  className="p-2 rounded mb-2"
                  style={{ borderBottom: '1px solid #e3e6f0' }}
                >
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {formatDate(game.gameDate)}
                  </div>
                  <div className="fw-bold">
                    <Link
                      to={`/results/${game.id}`}
                      className="text-dark text-decoration-none"
                    >
                      <span className={`fi fi-${game.homeCountryCode?.toLowerCase()} me-2`}></span>
                      {game.homeTeam} : {game.awayTeam}
                      <span className={`fi fi-${game.awayCountryCode?.toLowerCase()} ms-2`}></span>
                    </Link>
                  </div>
                  {!game.hasPrediction ? (
                    <div className="mt-2">
                      <Button
                        as={Link}
                        to={`/predictions/new/${game.id}`}
                        variant="primary"
                        size="sm"
                      >
                        <i className="fas fa-futbol"></i> Typuj wynik
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2 text-success">
                      <i className="fas fa-check-circle"></i> Twój typ:{' '}
                      {game.predictedHomeScore}:{game.predictedAwayScore}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Ostatnie mecze */}
      {stats.recentGames && stats.recentGames.length > 0 && (
        <Card className="border-start border-warning border-4 shadow mb-4">
          <Card.Body>
            <div className="text-xs fw-bold text-warning text-uppercase mb-2">
              ⏱️ Ostatnie mecze
            </div>
            <div className="games-list" style={{ fontSize: '0.9rem' }}>
              {stats.recentGames.map((game) => (
                <div
                  key={game.id}
                  className="p-2 rounded mb-2"
                  style={{ borderBottom: '1px solid #e3e6f0' }}
                >
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {formatDate(game.gameDate)}
                  </div>
                  <div className="fw-bold">
                    <Link
                      to={`/results/${game.id}`}
                      className="text-dark text-decoration-none"
                    >
                      <span className={`fi fi-${game.homeCountryCode?.toLowerCase()} me-2`}></span>
                      {game.homeTeam} {game.homeScore}:{game.awayScore}{' '}
                      {game.awayTeam}
                      <span className={`fi fi-${game.awayCountryCode?.toLowerCase()} ms-2`}></span>
                      {game.hasPrediction && game.points !== null && game.points !== undefined && (
                        <span
                          className={
                            game.points === 3
                              ? 'text-success'
                              : game.points === 1
                              ? 'text-warning'
                              : 'text-danger'
                          }
                        >
                          {' '}
                          +{game.points} pkt
                        </span>
                      )}
                      {game.hasPrediction && (
                        <span className="text-muted ms-2">
                          ({game.predictedHomeScore}:{game.predictedAwayScore})
                        </span>
                      )}
                      {!game.hasPrediction && (
                        <small className="text-muted ms-2">
                          <i className="fas fa-times-circle"></i> Brak typu
                        </small>
                      )}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Wykresy */}
      <Row>
        <Col xs={12}>
          <Card className="shadow mb-4">
            <Card.Header className="py-3">
              <h6 className="m-0 fw-bold text-primary">
                Historia pozycji w rankingu
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="chart-area">
                <RankingChart />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xs={12}>
          <Card className="shadow mb-4">
            <Card.Header className="py-3">
              <h6 className="m-0 fw-bold text-success">
                Porównanie: Remisy vs Zwycięstwa
              </h6>
            </Card.Header>
            <Card.Body>
              <div
                className="chart-pie pt-4 pb-2 d-flex justify-content-center align-items-center"
                style={{ height: '300px', width: '100%', position: 'relative' }}
              >
                <NestedDonutChart />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;
