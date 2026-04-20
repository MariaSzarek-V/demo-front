import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import RankingChart from './RankingChart';
import PredictionPatternChart from './PredictionPatternChart';
import { dashboardApi, resultsApi, rankingApi, notificationApi } from '../services/api';
import { useLeague } from '../contexts/LeagueContext';

function Dashboard() {
  const navigate = useNavigate();
  const { selectedLeague } = useLeague();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (selectedLeague) {
      loadDashboard();
      loadNotifications();
    }
  }, [selectedLeague]);

  const loadNotifications = async () => {
    try {
      const response = await notificationApi.getUpcomingGamesNotifications();
      setNotifications(response.data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  // Synchronize game card heights after rendering
  useEffect(() => {
    if (!loading && stats) {
      // Wait for DOM to render
      setTimeout(() => {
        const upcomingGames = document.querySelectorAll('.upcoming-game-item');
        const recentGames = document.querySelectorAll('.recent-game-item');

        const maxLength = Math.max(upcomingGames.length, recentGames.length);

        for (let i = 0; i < maxLength; i++) {
          const upcomingCard = upcomingGames[i];
          const recentCard = recentGames[i];

          if (upcomingCard && recentCard) {
            // Reset heights
            upcomingCard.style.height = 'auto';
            recentCard.style.height = 'auto';

            // Get natural heights
            const upcomingHeight = upcomingCard.offsetHeight;
            const recentHeight = recentCard.offsetHeight;

            // Set both to max height
            const maxHeight = Math.max(upcomingHeight, recentHeight);
            upcomingCard.style.height = `${maxHeight}px`;
            recentCard.style.height = `${maxHeight}px`;
          }
        }
      }, 100);
    }
  }, [loading, stats]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Get dashboard data
      const dashboardData = await dashboardApi.getDashboardData();
      const { user, upcomingGames, finishedGames, myPredictions } = dashboardData;

      // Get ranking for selected league
      const rankingResponse = await rankingApi.getRankingByLeague(selectedLeague.id);
      const ranking = rankingResponse.data;

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

      // Calculate real results statistics from finished games
      const realResultsStats = calculateRealResults(finishedGames);

      // Prepare mini ranking (top 3 + current user if not in top 3)
      const miniRanking = prepareMiniRanking(ranking, user.username);

      setStats({
        ...userStats,
        user,
        realResultsStats,
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
        topPredictions: [],
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

    // Get TOP 3 most frequent predictions
    const topPredictions = Object.entries(predictionCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, 3) // Take top 3
      .map(([prediction, count]) => ({ prediction, count }));

    return {
      topPredictions,
      exactMatches,
      partialMatches,
      noMatches,
      almostPerfect
    };
  };

  const calculateRealResults = (finishedGames) => {
    if (!finishedGames || finishedGames.length === 0) {
      return { topRealResults: [] };
    }

    // Count real result frequencies
    const resultCounts = {};

    finishedGames.forEach(game => {
      // Only count games with actual results
      if (game.homeScore !== null && game.homeScore !== undefined &&
          game.awayScore !== null && game.awayScore !== undefined) {
        const resultKey = `${game.homeScore}:${game.awayScore}`;
        resultCounts[resultKey] = (resultCounts[resultKey] || 0) + 1;
      }
    });

    console.log('🔍 Real results counted:', resultCounts);
    console.log('📊 Total finished games analyzed:', finishedGames.length);

    // Get TOP 3 most frequent real results
    const topRealResults = Object.entries(resultCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, 3) // Take top 3
      .map(([result, count]) => ({ result, count }));

    console.log('🏆 TOP 3 real results:', topRealResults);

    return { topRealResults };
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

    // Get last person in ranking
    const lastPerson = ranking.length > 3 ? ranking[ranking.length - 1] : null;
    const lastPersonIsCurrentUser = lastPerson && lastPerson.username === currentUsername;
    const lastPersonIsInTop3 = lastPerson && top3.some(r => r.username === lastPerson.username);

    // Build result
    const result = [...top3];

    // Add current user if not in top 3
    if (!userInTop3) {
      const currentUser = ranking.find(r => r.username === currentUsername);
      if (currentUser && currentUser.position > 3) {
        result.push(null); // separator
        result.push({
          position: currentUser.position,
          username: currentUser.username,
          totalPoints: currentUser.totalPoints,
          isCurrentUser: true
        });
      }
    }

    // Add last person if exists, not in top 3, and not already added as current user
    if (lastPerson && !lastPersonIsInTop3 && !lastPersonIsCurrentUser) {
      result.push(null); // separator
      result.push({
        position: lastPerson.position,
        username: lastPerson.username,
        totalPoints: lastPerson.totalPoints,
        isCurrentUser: false
      });
    }

    return result;
  };

  const formatDate = (dateString) => {
    // Handle array format from backend [year, month, day, hour, minute]
    let date;
    if (Array.isArray(dateString)) {
      // LocalDateTime from Java comes as array
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

  if (!stats) return null;

  const formatMinutes = (minutes) => {
    if (minutes < 60) {
      return `${minutes} minut`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} ${hours === 1 ? 'godzinę' : hours < 5 ? 'godziny' : 'godzin'}`;
    }
    return '';
  };

  return (
    <div className="content-container" style={{ height: 'calc(100vh - 150px)', overflowY: 'auto', paddingBottom: '2rem' }}>
      {/* Notification Banner */}
      {notifications && notifications.length > 0 && (
        <Alert variant="danger" className="mb-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <div>
                <strong>Mecz {notifications[0].homeTeam} - {notifications[0].awayTeam} zaczyna się za {formatMinutes(notifications[0].minutesUntilStart)}.</strong>
                {' '}
                <Link to={`/predictions/new/${notifications[0].gameId}`} className="text-danger" style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                  Wytypuj wynik meczu!
                </Link>
                {notifications.length > 1 && (
                  <span className="ms-2 text-muted" style={{ fontSize: '0.9rem' }}>
                    (i {notifications.length - 1} {notifications.length === 2 ? 'inny mecz' : notifications.length < 5 ? 'inne mecze' : 'innych meczów'})
                  </span>
                )}
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Content Row - Statystyki */}
      <Row className="mt-4">
        {/* Twoje wyniki - Lewa kolumna */}
        <Col xl={6} md={6} className="mb-4">
          <Card className="border-start border-primary border-4 shadow h-100">
            <Card.Header className="py-3">
              <h6 className="m-0 fw-bold text-primary text-uppercase">
                🎯 Twój styl gry
              </h6>
            </Card.Header>
            <Card.Body className="py-3">

              {/* Punktacja */}
              <div className="mb-3">
                <div className="fw-bold" style={{ fontSize: '0.85rem', color: '#28a745' }}>
                  {stats.exactMatches} x 3 pkt
                </div>
                <div className="text-warning fw-bold" style={{ fontSize: '0.85rem' }}>
                  {stats.partialMatches} x 1 pkt
                </div>
                <div className="text-danger fw-bold" style={{ fontSize: '0.85rem' }}>
                  {stats.noMatches} x 0 pkt
                </div>

                {/* Kreska i podsumowanie */}
                <div
                  className="my-2"
                  style={{
                    borderTop: '2px solid #e3e6f0',
                    width: '100%'
                  }}
                />
                <div className="fw-bold text-primary" style={{ fontSize: '0.9rem' }}>
                  {stats.exactMatches * 3 + stats.partialMatches * 1} pkt
                </div>

                {stats.almostPerfect > 0 && (
                  <div className="text-info fw-bold mt-2" style={{ fontSize: '0.85rem' }}>
                    😫 {stats.almostPerfect} x prawie trafione
                  </div>
                )}
              </div>

              <Row className="justify-content-center">
                {/* Co typujesz */}
                <Col xs={6} md={5} className="mb-3">
                  <div className="fw-bold text-secondary mb-2" style={{ fontSize: '0.85rem' }}>
                    Co typujesz
                  </div>
                  {stats.topPredictions && stats.topPredictions.length > 0 ? (
                    stats.topPredictions.map((item, index) => (
                      <div
                        key={index}
                        className="d-flex align-items-center mb-2"
                      >
                        <span
                          className="me-2 fw-bold"
                          style={{
                            color: index === 0 ? '#f6c23e' : index === 1 ? '#858796' : '#4e73df',
                            fontSize: '0.85rem'
                          }}
                        >
                          #{index + 1}
                        </span>
                        <strong className="me-2" style={{ fontSize: '0.9rem' }}>{item.prediction}</strong>
                        <strong className="text-muted" style={{ fontSize: '0.85rem' }}>
                          ({item.count}x)
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                      Brak typowań
                    </p>
                  )}
                </Col>

                {/* Rzeczywiste wyniki */}
                <Col xs={6} md={5} className="mb-3">
                  <div className="fw-bold text-secondary mb-2" style={{ fontSize: '0.85rem' }}>
                    Wyniki meczów
                  </div>
                  {stats.realResultsStats && stats.realResultsStats.topRealResults && stats.realResultsStats.topRealResults.length > 0 ? (
                    stats.realResultsStats.topRealResults.map((item, index) => (
                      <div
                        key={index}
                        className="d-flex align-items-center mb-2"
                      >
                        <span
                          className="me-2 fw-bold"
                          style={{
                            color: index === 0 ? '#f6c23e' : index === 1 ? '#858796' : '#4e73df',
                            fontSize: '0.85rem'
                          }}
                        >
                          #{index + 1}
                        </span>
                        <strong className="me-2" style={{ fontSize: '0.9rem' }}>{item.result}</strong>
                        <strong className="text-muted" style={{ fontSize: '0.85rem' }}>
                          ({item.count}x)
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                      Brak danych
                    </p>
                  )}
                </Col>
              </Row>

              {/* Historia typowania button */}
              <div className="mt-3 text-center">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => navigate('/prediction-history')}
                  style={{ width: '100%', maxWidth: '200px' }}
                >
                  <i className="fas fa-history me-2"></i>
                  Historia typowania
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Mini Ranking */}
        <Col xl={6} md={6} className="mb-4">
          <Card className="border-start border-warning border-4 shadow h-100">
            <Card.Header className="py-3">
              <h6 className="m-0 fw-bold text-warning text-uppercase">
                🏆 Mini Ranking
              </h6>
            </Card.Header>
            <Card.Body className="py-3">
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
                </>
              ) : (
                <p className="text-muted mb-0">Brak danych rankingu</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Content Row - Mecze */}
      <Row className="mb-4" style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Najbliższe mecze */}
        {stats.upcomingGames && stats.upcomingGames.length > 0 && (
          <Col xl={6} md={6} className="mb-4" style={{ display: 'flex', flexDirection: 'column' }}>
            <Card className="border-start border-info border-4 shadow" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Card.Header className="py-3">
                <h6 className="m-0 fw-bold text-info text-uppercase">
                  📅 Najbliższe mecze
                </h6>
              </Card.Header>
              <Card.Body style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="games-list" style={{ fontSize: '0.9rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {stats.upcomingGames.map((game, index) => (
                <div
                  key={game.id}
                  className="game-item upcoming-game-item"
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    borderBottom: index < stats.upcomingGames.length - 1 ? '1px solid #e3e6f0' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => navigate(`/games`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.05)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Data */}
                  <div className="mb-2">
                    <span className="game-date text-muted d-block mb-1" style={{ fontSize: '0.85rem' }}>
                      {formatDate(game.gameDate)}
                    </span>

                    {/* Sprawdź czy nazwy są za długie */}
                    {((game.homeTeam?.length || 0) + (game.awayTeam?.length || 0)) > 24 ? (
                      /* Układ pionowy dla długich nazw */
                      <div style={{ textAlign: 'center', width: '100%', padding: '0 10px' }}>
                        <div style={{ marginBottom: '4px', maxWidth: '250px', margin: '0 auto 4px auto', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.5' }}>
                          <span className="fw-bold">{game.homeTeam} </span>
                          <span className={`fi fi-${game.homeCountryCode?.toLowerCase()}`}></span>
                        </div>
                        <strong className="game-score text-primary d-block" style={{ fontSize: '1.1rem', margin: '4px 0' }}>
                          -:-
                        </strong>
                        <div style={{ marginTop: '4px', maxWidth: '250px', margin: '4px auto 0 auto', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.5' }}>
                          <span className={`fi fi-${game.awayCountryCode?.toLowerCase()}`}></span>
                          <span className="fw-bold"> {game.awayTeam}</span>
                        </div>
                      </div>
                    ) : (
                      /* Układ grid - 5 kolumn */
                      <div
                        className="d-grid align-items-center"
                        style={{
                          gridTemplateColumns: '1fr auto auto auto 1fr',
                          gap: '8px'
                        }}
                      >
                        <span className="fw-bold text-end">{game.homeTeam}</span>
                        <span className={`fi fi-${game.homeCountryCode?.toLowerCase()}`}></span>
                        <strong className="game-score text-primary text-center">-:-</strong>
                        <span className={`fi fi-${game.awayCountryCode?.toLowerCase()}`}></span>
                        <span className="fw-bold text-start">{game.awayTeam}</span>
                      </div>
                    )}
                  </div>

                  {/* Typ użytkownika */}
                  <div className="d-flex align-items-center justify-content-center flex-wrap" style={{ gap: '8px' }}>
                    {game.hasPrediction ? (
                      <span
                        className="btn btn-sm"
                        style={{
                          backgroundColor: 'rgba(78, 115, 223, 0.15)',
                          color: '#4e73df',
                          border: '1px solid rgba(78, 115, 223, 0.3)',
                          cursor: 'default',
                          width: '60px',
                          padding: '4px 8px',
                          fontFamily: 'monospace',
                          fontSize: '0.95rem',
                          textAlign: 'center',
                          fontWeight: '600'
                        }}
                      >
                        {game.predictedHomeScore}:{game.predictedAwayScore}
                      </span>
                    ) : (
                      <Button
                        as={Link}
                        to={`/predictions/new/${game.id}`}
                        variant="outline-primary"
                        size="sm"
                        style={{ minWidth: '38px', padding: '4px 8px' }}
                        title="Typuj"
                      >
                        <i className="fas fa-plus"></i>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Ostatnie mecze */}
        {stats.recentGames && stats.recentGames.length > 0 && (
          <Col xl={6} md={6} className="mb-4" style={{ display: 'flex', flexDirection: 'column' }}>
            <Card className="border-start border-danger border-4 shadow" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Card.Header className="py-3">
                <h6 className="m-0 fw-bold text-danger text-uppercase">
                  ⏱️ Ostatnie mecze
                </h6>
              </Card.Header>
              <Card.Body style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="games-list" style={{ fontSize: '0.9rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {stats.recentGames.map((game, index) => (
                <div
                  key={game.id}
                  className="game-item recent-game-item"
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    borderBottom: index < stats.recentGames.length - 1 ? '1px solid #e3e6f0' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => navigate(`/results/${game.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.05)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Data */}
                  <div className="mb-2">
                    <span className="game-date text-muted d-block mb-1" style={{ fontSize: '0.85rem' }}>
                      {formatDate(game.gameDate)}
                    </span>

                    {/* Sprawdź czy nazwy są za długie */}
                    {((game.homeTeam?.length || 0) + (game.awayTeam?.length || 0)) > 24 ? (
                      /* Układ pionowy dla długich nazw */
                      <div style={{ textAlign: 'center', width: '100%', padding: '0 10px' }}>
                        <div style={{ marginBottom: '4px', maxWidth: '250px', margin: '0 auto 4px auto', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.5' }}>
                          <span className="fw-bold">{game.homeTeam} </span>
                          <span className={`fi fi-${game.homeCountryCode?.toLowerCase()}`}></span>
                        </div>
                        <Link
                          to={`/results/${game.id}`}
                          className="game-score text-primary text-decoration-none d-block"
                          style={{ fontSize: '1.1rem', margin: '4px 0', fontWeight: 'bold' }}
                        >
                          {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                        </Link>
                        <div style={{ marginTop: '4px', maxWidth: '250px', margin: '4px auto 0 auto', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.5' }}>
                          <span className={`fi fi-${game.awayCountryCode?.toLowerCase()}`}></span>
                          <span className="fw-bold"> {game.awayTeam}</span>
                        </div>
                      </div>
                    ) : (
                      /* Układ grid - 5 kolumn */
                      <div
                        className="d-grid align-items-center"
                        style={{
                          gridTemplateColumns: '1fr auto auto auto 1fr',
                          gap: '8px'
                        }}
                      >
                        <span className="fw-bold text-end">{game.homeTeam}</span>
                        <span className={`fi fi-${game.homeCountryCode?.toLowerCase()}`}></span>
                        <Link
                          to={`/results/${game.id}`}
                          className="game-score text-primary text-center text-decoration-none"
                          style={{ fontWeight: 'bold' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                        </Link>
                        <span className={`fi fi-${game.awayCountryCode?.toLowerCase()}`}></span>
                        <span className="fw-bold text-start">{game.awayTeam}</span>
                      </div>
                    )}
                  </div>

                  {/* Typ użytkownika i punkty */}
                  <div className="d-flex align-items-center justify-content-center flex-wrap" style={{ gap: '8px' }}>
                    {game.hasPrediction ? (
                      <>
                        <span
                          className="btn btn-sm"
                          style={{
                            backgroundColor: 'rgba(78, 115, 223, 0.15)',
                            color: '#4e73df',
                            border: '1px solid rgba(78, 115, 223, 0.3)',
                            cursor: 'default',
                            width: '60px',
                            padding: '4px 8px',
                            fontFamily: 'monospace',
                            fontSize: '0.95rem',
                            textAlign: 'center',
                            fontWeight: '600'
                          }}
                        >
                          {game.predictedHomeScore}:{game.predictedAwayScore}
                        </span>
                        {game.points !== null && game.points !== undefined && (
                          <Badge bg={game.points === 3 ? 'success' : game.points === 1 ? 'warning' : 'secondary'}>
                            {game.points} pkt
                          </Badge>
                        )}
                      </>
                    ) : (
                      <small className="text-muted">
                        <i className="fas fa-times-circle"></i> Brak typu
                      </small>
                    )}
                  </div>
                </div>
              ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Wykresy */}
      <Row className="mb-4">
        <Col xs={12}>
          <Card className="border-start border-success border-4 shadow">
            <Card.Body>
              <RankingChart currentUser={stats?.user} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col xs={12}>
          <PredictionPatternChart />
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
