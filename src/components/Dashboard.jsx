import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import RankingChart from './RankingChart';
import PredictionPatternChart from './PredictionPatternChart';
import { dashboardApi, resultsApi, rankingApi, notificationApi, predictionApi } from '../services/api';
import { useLeague } from '../contexts/LeagueContext';

function Dashboard() {
  const navigate = useNavigate();
  const { selectedLeague } = useLeague();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [editingGameId, setEditingGameId] = useState(null);
  const [editedScores, setEditedScores] = useState({});

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

        if (editingGameId !== null) {
          // When editing, reset ALL heights to auto so cards can expand
          upcomingGames.forEach(card => {
            card.style.height = 'auto';
          });
          recentGames.forEach(card => {
            card.style.height = 'auto';
          });
          return;
        }

        // Only synchronize heights when not editing
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
  }, [loading, stats, editingGameId]);

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
      };
    }

    // Count prediction frequencies
    const predictionCounts = {};
    let exactMatches = 0;
    let partialMatches = 0;
    let noMatches = 0;

    results.forEach(result => {
      const predictionKey = `${result.predictedHomeScore}:${result.predictedAwayScore}`;
      predictionCounts[predictionKey] = (predictionCounts[predictionKey] || 0) + 1;

      if (result.points === 3) exactMatches++;
      else if (result.points === 1) partialMatches++;
      else noMatches++;
    });

    // Get TOP 3 most frequent predictions
    const topPredictions = Object.entries(predictionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([prediction, count]) => ({ prediction, count }));

    return {
      topPredictions,
      exactMatches,
      partialMatches,
      noMatches
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

    const toEntry = (r) => ({
      position: r.position,
      username: r.username,
      userId: r.userId,
      totalPoints: r.totalPoints,
      isCurrentUser: r.username === currentUsername
    });

    const n = ranking.length;
    const userIndex = ranking.findIndex(r => r.username === currentUsername);

    const idxSet = new Set();
    idxSet.add(0); // first

    if (userIndex !== -1) {
      if (userIndex - 1 > 0) idxSet.add(userIndex - 1); // person before user (not first)
      idxSet.add(userIndex);                             // user
      if (userIndex + 1 < n - 1) idxSet.add(userIndex + 1); // person after user (not last)
    }

    if (n > 1) idxSet.add(n - 1); // last

    const sorted = Array.from(idxSet).sort((a, b) => a - b);

    const result = [];
    sorted.forEach((idx, i) => {
      if (i > 0 && idx > sorted[i - 1] + 1) result.push(null);
      result.push(toEntry(ranking[idx]));
    });

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

  const isGameStarted = (gameDate) => {
    let date;
    if (Array.isArray(gameDate)) {
      const [year, month, day, hour, minute] = gameDate;
      date = new Date(year, month - 1, day, hour, minute);
    } else {
      date = new Date(gameDate);
    }
    return date <= new Date();
  };

  const startEditing = (game) => {
    const gameId = game.id;
    setEditingGameId(gameId);
    setEditedScores({
      ...editedScores,
      [gameId]: {
        home: game.predictedHomeScore?.toString() || '',
        away: game.predictedAwayScore?.toString() || ''
      }
    });
  };

  const cancelEditing = () => {
    setEditingGameId(null);
  };

  const handleScoreChange = (game, team, value) => {
    const gameId = game.id;
    const currentScores = editedScores[gameId] || { home: '', away: '' };
    const newScores = {
      ...editedScores,
      [gameId]: {
        ...currentScores,
        [team]: value
      }
    };
    setEditedScores(newScores);
  };

  const savePrediction = async (game) => {
    const gameId = game.id;
    const scores = editedScores[gameId];

    if (!scores?.home || !scores?.away) {
      alert('Proszę wprowadzić oba wyniki (gospodarze i goście)');
      return;
    }

    const homeScore = parseInt(scores.home, 10);
    const awayScore = parseInt(scores.away, 10);

    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      alert('Proszę wprowadzić poprawne wyniki (liczby >= 0)');
      return;
    }

    try {
      const predictionData = {
        gameId: gameId,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore
      };

      if (game.hasPrediction) {
        // Find prediction ID from myPredictions
        const myPredictions = await predictionApi.getMyPredictions();
        const prediction = myPredictions.data.find(p => p.gameId === gameId);

        if (prediction?.id) {
          await predictionApi.updatePrediction(prediction.id, predictionData);
        } else {
          await predictionApi.createPrediction(predictionData);
        }
      } else {
        await predictionApi.createPrediction(predictionData);
      }

      setEditingGameId(null);
      await loadDashboard();
    } catch (err) {
      console.error('Error saving prediction:', err);
      alert('Nie udało się zapisać typu: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeletePrediction = async (game, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      const myPredictions = await predictionApi.getMyPredictions();
      const prediction = myPredictions.data.find(p => p.gameId === game.id);

      if (prediction?.id) {
        await predictionApi.deletePrediction(prediction.id);
        setEditingGameId(null);
        await loadDashboard();
      }
    } catch (err) {
      console.error('Error deleting prediction:', err);
      if (err.response?.status === 404) {
        setEditingGameId(null);
        await loadDashboard();
      } else {
        alert('Nie udało się usunąć typu: ' + (err.response?.data?.message || err.message));
      }
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
                      const clickable = !rank.isCurrentUser && rank.userId;
                      return (
                        <div
                          key={rank.position}
                          className={`p-2 rounded mb-2 ${rank.isCurrentUser ? 'fw-bold bg-light' : ''}`}
                          style={{
                            cursor: clickable ? 'pointer' : 'default',
                            transition: 'background-color 0.2s'
                          }}
                          onClick={() => clickable && navigate(`/compare/${rank.userId}`)}
                          onMouseEnter={(e) => {
                            if (clickable) e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            if (clickable) e.currentTarget.style.backgroundColor = rank.isCurrentUser ? '' : 'transparent';
                          }}
                        >
                          <span className="text-dark">
                            #{rank.position}
                          </span>
                          <span
                            className={`ms-2 ${rank.isCurrentUser ? 'text-primary' : 'text-dark'}`}
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
                  data-game-id={game.id}
                  className="game-item upcoming-game-item"
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    borderBottom: index < stats.upcomingGames.length - 1 ? '1px solid #e3e6f0' : 'none',
                    cursor: editingGameId === game.id ? 'default' : (!isGameStarted(game.gameDate) ? 'pointer' : 'default'),
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    if (editingGameId === game.id) {
                      return;
                    }
                    if (!isGameStarted(game.gameDate)) {
                      startEditing(game);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!isGameStarted(game.gameDate) && editingGameId !== game.id) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.05)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }
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
                    {editingGameId === game.id ? (
                      <div className="d-flex flex-column align-items-center gap-2" style={{ width: '100%' }}>
                        {/* Linia 1: Pola input wyśrodkowane */}
                        <div className="d-flex align-items-center gap-2 justify-content-center">
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            style={{ width: '50px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '600' }}
                            value={editedScores[game.id]?.home || ''}
                            onChange={(e) => handleScoreChange(game, 'home', e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                savePrediction(game);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          <span style={{ fontWeight: 'bold', color: '#4e73df' }}>:</span>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            style={{ width: '50px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '600' }}
                            value={editedScores[game.id]?.away || ''}
                            onChange={(e) => handleScoreChange(game, 'away', e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                savePrediction(game);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {/* Linia 2: Przyciski wyśrodkowane */}
                        <div className="d-flex align-items-center gap-2 justify-content-center">
                          <Button
                            variant="success"
                            size="sm"
                            style={{ minWidth: '38px', padding: '4px 8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              savePrediction(game);
                            }}
                            title="Zapisz"
                          >
                            <i className="fas fa-check"></i>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ minWidth: '38px', padding: '4px 8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing();
                            }}
                            title="Anuluj"
                          >
                            <i className="fas fa-times"></i>
                          </Button>
                          {game.hasPrediction && (
                            <Button
                              variant="danger"
                              size="sm"
                              style={{ minWidth: '38px', padding: '4px 8px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrediction(game, e);
                              }}
                              title="Usuń"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {game.hasPrediction ? (
                          <span
                            className="btn btn-sm"
                            style={{
                              backgroundColor: 'rgba(78, 115, 223, 0.15)',
                              color: '#4e73df',
                              border: '1px solid rgba(78, 115, 223, 0.3)',
                              cursor: !isGameStarted(game.gameDate) ? 'pointer' : 'default',
                              width: '60px',
                              padding: '4px 8px',
                              fontFamily: 'monospace',
                              fontSize: '0.95rem',
                              textAlign: 'center',
                              fontWeight: '600'
                            }}
                            onClick={(e) => {
                              if (!isGameStarted(game.gameDate)) {
                                e.stopPropagation();
                                startEditing(game);
                              }
                            }}
                          >
                            {game.predictedHomeScore}:{game.predictedAwayScore}
                          </span>
                        ) : (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            style={{ minWidth: '38px', padding: '4px 8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(game);
                            }}
                            title="Typuj"
                          >
                            <i className="fas fa-plus"></i>
                          </Button>
                        )}
                      </>
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
                  <div style={{ position: 'relative', height: '32px', width: '100%' }}>
                    {game.hasPrediction ? (
                      <>
                        <span
                          className="btn btn-sm"
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
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
                          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                            <Badge bg={game.points === 3 ? 'success' : game.points === 1 ? 'warning' : 'danger'}>
                              {game.points} pkt
                            </Badge>
                          </div>
                        )}
                      </>
                    ) : (
                      <small className="text-muted" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap' }}>
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
            <Card.Header className="py-3">
              <h6 className="m-0 fw-bold text-success text-uppercase">
                📈 Historia pozycji w rankingu
              </h6>
            </Card.Header>
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
