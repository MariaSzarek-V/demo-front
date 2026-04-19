import { useState, useEffect } from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { gameApi, predictionApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Games() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingGameId, setEditingGameId] = useState(null);
  const [editedScores, setEditedScores] = useState({});
  const [filter, setFilter] = useState('SCHEDULED'); // ALL, FINISHED, SCHEDULED

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const [gamesResponse, predictionsResponse] = await Promise.all([
        gameApi.getAllGames(),
        predictionApi.getMyPredictions()
      ]);

      const gamesData = gamesResponse.data;
      const predictionsData = predictionsResponse.data;

      console.log('Games data from API:', gamesData[0]); // Debug - sprawdzamy strukturę
      console.log('Predictions data from API:', predictionsData); // Debug - sprawdzamy predykcje
      console.log('First prediction:', predictionsData[0]); // Debug - sprawdzamy pierwszą predykcję

      // Merge games with predictions
      const gamesWithPredictions = gamesData.map(game => {
        const prediction = predictionsData.find(p => p.gameId === game.id);
        if (prediction) {
          console.log(`Matched prediction for game ${game.id}:`, prediction);
        }
        return {
          ...game,
          prediction: prediction || null
        };
      });

      // Sortuj mecze po dacie
      const sortedGames = [...gamesWithPredictions].sort((a, b) =>
        new Date(a.gameDate) - new Date(b.gameDate)
      );

      // Oblicz sumę punktów dla zakończonych meczów
      let cumulativePoints = 0;
      const gamesWithCumulativePoints = sortedGames.map(game => {
        if (game.gameStatus === 'FINISHED' && game.prediction?.points !== undefined && game.prediction?.points !== null) {
          cumulativePoints += game.prediction.points;
          return {
            ...game,
            cumulativePoints: cumulativePoints
          };
        }
        return game;
      });

      console.log('Games with predictions:', gamesWithCumulativePoints.filter(g => g.prediction));
      setGames(gamesWithCumulativePoints);
      setLoading(false);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Nie udało się załadować meczów');
      setLoading(false);
    }
  };

  const handleDeletePrediction = async (predictionId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!predictionId) {
      alert('Brak ID predykcji');
      return;
    }

    console.log('Attempting to delete prediction:', predictionId);

    try {
      const response = await predictionApi.deletePrediction(predictionId);
      console.log('Delete successful:', response);
      setEditingGameId(null); // Wyjdź z trybu edycji
      await loadGames();
    } catch (err) {
      console.error('Error deleting prediction:', err);
      console.error('Error details:', err.response?.data);

      // Jeśli predykcja nie istnieje, po prostu odśwież dane
      if (err.response?.status === 404 || err.response?.data?.message?.includes('No such prediction')) {
        console.log('Prediction not found, refreshing data');
        setEditingGameId(null); // Wyjdź z trybu edycji
        await loadGames();
      } else {
        alert('Nie udało się usunąć typu: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const startEditing = (game) => {
    const gameId = game.id || game.gameId;
    console.log('Starting editing for game - id:', game.id, 'gameId:', game.gameId, 'using:', gameId);
    console.log('Full game object:', game);
    console.log('Game prediction:', game.prediction);

    setEditingGameId(gameId);
    setEditedScores({
      ...editedScores,
      [gameId]: {
        home: game.prediction?.predictedHomeScore?.toString() || '',
        away: game.prediction?.predictedAwayScore?.toString() || ''
      }
    });
  };

  const cancelEditing = () => {
    setEditingGameId(null);
  };

  const handleScoreChange = (game, team, value) => {
    const gameId = game.id || game.gameId;
    console.log('handleScoreChange called:', { gameId, team, value });
    console.log('Current editedScores:', editedScores);
    console.log('editedScores[gameId]:', editedScores[gameId]);

    const currentScores = editedScores[gameId] || { home: '', away: '' };
    const newScores = {
      ...editedScores,
      [gameId]: {
        ...currentScores,
        [team]: value
      }
    };
    console.log('New editedScores:', newScores);
    setEditedScores(newScores);
  };

  const savePrediction = async (game) => {
    const gameId = game.id || game.gameId;
    const scores = editedScores[gameId];
    console.log('Saving prediction for game:', gameId);
    console.log('Game prediction:', game.prediction);
    console.log('Scores for this game:', scores);

    // Check if fields are filled
    if (!scores?.home || !scores?.away) {
      alert('Proszę wprowadzić oba wyniki (gospodarze i goście)');
      return;
    }

    const homeScore = parseInt(scores.home, 10);
    const awayScore = parseInt(scores.away, 10);

    console.log('Parsed scores - home:', homeScore, 'away:', awayScore);

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

      console.log('Sending prediction data:', predictionData);

      // Sprawdź czy predykcja istnieje poprzez sprawdzenie czy możemy ją pobrać
      if (game.prediction?.id) {
        console.log('Checking if prediction exists:', game.prediction.id);
        try {
          await predictionApi.getPredictionById(game.prediction.id);
          console.log('Prediction exists, updating:', game.prediction.id);
          await predictionApi.updatePrediction(game.prediction.id, predictionData);
        } catch (checkErr) {
          console.warn('Prediction does not exist or error checking, creating new:', checkErr);
          await predictionApi.createPrediction(predictionData);
        }
      } else {
        console.log('No prediction ID, creating new');
        await predictionApi.createPrediction(predictionData);
      }

      setEditingGameId(null);
      await loadGames();
    } catch (err) {
      console.error('Error saving prediction:', err);
      console.error('Error details:', err.response?.data);
      alert('Nie udało się zapisać typu: ' + (err.response?.data?.message || err.message));
    }
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
    return new Date(gameDate) <= new Date();
  };

  const getFilteredGames = () => {
    if (filter === 'FINISHED') {
      // Zakończone: od najbliższej (najnowszej) do najdawniejszej - malejąco
      return games
        .filter(game => game.gameStatus === 'FINISHED')
        .sort((a, b) => new Date(b.gameDate) - new Date(a.gameDate));
    }
    if (filter === 'SCHEDULED') {
      // Nadchodzące: od najbliższej do najdalszej - rosnąco
      return games
        .filter(game => game.gameStatus === 'SCHEDULED')
        .sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate));
    }
    // Wszystkie: chronologicznie od pierwszego do ostatniego - rosnąco
    return [...games].sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate));
  };

  const filteredGames = getFilteredGames();

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

  return (
    <div className="content-container content-container-narrow" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filter buttons and admin button */}
      <div className="mb-2 d-flex gap-2 justify-content-center">
        <Button
          variant={filter === 'ALL' ? 'primary' : 'outline-primary'}
          size="sm"
          onClick={() => setFilter('ALL')}
          style={{
            opacity: filter === 'ALL' ? '1' : undefined
          }}
        >
          Wszystkie
        </Button>
        <Button
          variant={filter === 'SCHEDULED' ? 'primary' : 'outline-primary'}
          size="sm"
          onClick={() => setFilter('SCHEDULED')}
          style={{
            opacity: filter === 'SCHEDULED' ? '1' : undefined
          }}
        >
          Nadchodzące
        </Button>
        <Button
          variant={filter === 'FINISHED' ? 'primary' : 'outline-primary'}
          size="sm"
          onClick={() => setFilter('FINISHED')}
          style={{
            opacity: filter === 'FINISHED' ? '1' : undefined
          }}
        >
          Zakończone
        </Button>
        {user?.userRole === 'ADMIN' && (
          <Button
            variant="warning"
            size="sm"
            onClick={() => navigate('/admin/games')}
            title="Zarządzaj meczami"
          >
            Admin
          </Button>
        )}
      </div>

      <Card className="border-start border-primary border-4 shadow" style={{ flex: '1', minHeight: 0, marginBottom: '0.5rem' }}>
        <Card.Body style={{ maxHeight: '100%', overflowY: 'auto' }}>
          {filteredGames && filteredGames.length > 0 ? (
            <div className="games-list" style={{ fontSize: '0.9rem' }}>
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  className={`game-item ${game.gameStatus === 'FINISHED' ? 'game-item-finished' : ''}`}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    borderBottom: '1px solid #e3e6f0',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const gameId = game.id || game.gameId;
                    // Don't trigger onClick if already in edit mode
                    if (editingGameId === gameId) {
                      return;
                    }
                    if (game.gameStatus === 'FINISHED') {
                      navigate(`/results/${game.id}`);
                    } else if (game.gameStatus === 'SCHEDULED' && !isGameStarted(game.gameDate)) {
                      startEditing(game);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (game.gameStatus === 'FINISHED' || (game.gameStatus === 'SCHEDULED' && !isGameStarted(game.gameDate))) {
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
                  {/* Data i drużyny */}
                  <div className="mb-2">
                    <span className="game-date text-muted d-block mb-1" style={{ fontSize: '0.85rem' }}>
                      {formatDate(game.gameDate)}
                    </span>

                    {/* Sprawdź czy nazwy są za długie - jeśli tak, użyj układu pionowego */}
                    {((game.homeTeam?.length || 0) + (game.awayTeam?.length || 0)) > 24 ? (
                      /* Układ pionowy (3 linie) dla długich nazw - MOBILE */
                      <div className="d-block d-md-none" style={{ textAlign: 'center', width: '100%', padding: '0 10px' }}>
                        <div style={{ marginBottom: '4px', maxWidth: '250px', margin: '0 auto 4px auto', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.5' }}>
                          <span className="fw-bold">{game.homeTeam} </span>
                          <span className={`fi fi-${game.homeCountryCode?.toLowerCase()}`}></span>
                        </div>
                        {game.gameStatus === 'FINISHED' ? (
                          <Link
                            to={`/results/${game.id}`}
                            className="game-score text-primary text-decoration-none d-block"
                            style={{ fontSize: '1.1rem', margin: '4px 0', fontWeight: 'bold' }}
                          >
                            {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                          </Link>
                        ) : (
                          <strong className="game-score text-primary d-block" style={{ fontSize: '1.1rem', margin: '4px 0' }}>
                            {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                          </strong>
                        )}
                        <div style={{ marginTop: '4px', maxWidth: '250px', margin: '4px auto 0 auto', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.5' }}>
                          <span className={`fi fi-${game.awayCountryCode?.toLowerCase()}`}></span>
                          <span className="fw-bold"> {game.awayTeam}</span>
                        </div>
                      </div>
                    ) : (
                      /* Układ grid (1 linia) - 5 kolumn jak tabela */
                      <div
                        className="d-grid d-md-none align-items-center"
                        style={{
                          gridTemplateColumns: '1fr auto auto auto 1fr',
                          gap: '6px'
                        }}
                      >
                        <span className="fw-bold text-end">{game.homeTeam}</span>
                        <span className={`fi fi-${game.homeCountryCode?.toLowerCase()}`} style={{ flexShrink: 0 }}></span>
                        {game.gameStatus === 'FINISHED' ? (
                          <Link
                            to={`/results/${game.id}`}
                            className="game-score text-primary text-center text-decoration-none"
                            style={{ fontWeight: 'bold' }}
                          >
                            {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                          </Link>
                        ) : (
                          <strong className="game-score text-primary text-center">
                            {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                          </strong>
                        )}
                        <span className={`fi fi-${game.awayCountryCode?.toLowerCase()}`} style={{ flexShrink: 0 }}></span>
                        <span className="fw-bold text-start">{game.awayTeam}</span>
                      </div>
                    )}

                    {/* Desktop - sprawdź długość nazw */}
                    {((game.homeTeam?.length || 0) + (game.awayTeam?.length || 0)) > 24 ? (
                      /* Układ pionowy (3 linie) dla długich nazw - DESKTOP */
                      <div className="d-none d-md-block" style={{ textAlign: 'center', width: '100%', padding: '0 10px' }}>
                        <div style={{ marginBottom: '4px', maxWidth: '250px', margin: '0 auto 4px auto', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.5' }}>
                          <span className="fw-bold">{game.homeTeam} </span>
                          <span className={`fi fi-${game.homeCountryCode?.toLowerCase()}`}></span>
                        </div>
                        {game.gameStatus === 'FINISHED' ? (
                          <Link
                            to={`/results/${game.id}`}
                            className="game-score text-primary text-decoration-none d-block"
                            style={{ fontSize: '1.1rem', margin: '4px 0', fontWeight: 'bold' }}
                          >
                            {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                          </Link>
                        ) : (
                          <strong className="game-score text-primary d-block" style={{ fontSize: '1.1rem', margin: '4px 0' }}>
                            {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                          </strong>
                        )}
                        <div style={{ marginTop: '4px', maxWidth: '250px', margin: '4px auto 0 auto', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.5' }}>
                          <span className={`fi fi-${game.awayCountryCode?.toLowerCase()}`}></span>
                          <span className="fw-bold"> {game.awayTeam}</span>
                        </div>
                      </div>
                    ) : (
                      /* Desktop - grid 5 kolumn dla normalnych nazw */
                      <div
                        className="d-none d-md-grid align-items-center"
                        style={{
                          gridTemplateColumns: '1fr auto auto auto 1fr',
                          gap: '8px'
                        }}
                      >
                        <span className="fw-bold text-end">{game.homeTeam}</span>
                        <span className={`fi fi-${game.homeCountryCode?.toLowerCase()}`}></span>
                        {game.gameStatus === 'FINISHED' ? (
                          <Link
                            to={`/results/${game.id}`}
                            className="game-score text-primary text-center text-decoration-none"
                            style={{ fontWeight: 'bold' }}
                          >
                            {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                          </Link>
                        ) : (
                          <strong className="game-score text-primary text-center">
                            {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                          </strong>
                        )}
                        <span className={`fi fi-${game.awayCountryCode?.toLowerCase()}`}></span>
                        <span className="fw-bold text-start">{game.awayTeam}</span>
                      </div>
                    )}
                  </div>

                  {/* Typ i przyciski - nowy wiersz na mobile */}
                  <div className="d-flex align-items-center justify-content-center flex-wrap" style={{ gap: '8px', position: 'relative' }}>
                    {/* Tryb edycji - pokaż inputy */}
                    {editingGameId === (game.id || game.gameId) ? (
                      <div className="d-flex flex-column align-items-center gap-2" style={{ width: '100%' }}>
                        {/* Linia 1: Pola input wyśrodkowane */}
                        <div className="d-flex align-items-center gap-2 justify-content-center">
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            style={{ width: '50px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '600' }}
                            value={editedScores[game.id || game.gameId]?.home || ''}
                            onChange={(e) => handleScoreChange(game, 'home', e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                savePrediction(game);
                              }
                            }}
                            autoFocus
                          />
                          <span style={{ fontWeight: 'bold', color: '#4e73df' }}>:</span>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            style={{ width: '50px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '600' }}
                            value={editedScores[game.id || game.gameId]?.away || ''}
                            onChange={(e) => handleScoreChange(game, 'away', e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                savePrediction(game);
                              }
                            }}
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
                          {game.prediction && (
                            <Button
                              variant="danger"
                              size="sm"
                              style={{ minWidth: '38px', padding: '4px 8px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrediction(game.prediction.id, e);
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
                        {/* Środek - typ i punkty wyśrodkowane */}
                        {game.prediction && (
                          <span
                            className="me-2 btn btn-sm"
                            style={{
                              backgroundColor: 'rgba(78, 115, 223, 0.15)',
                              color: '#4e73df',
                              border: '1px solid rgba(78, 115, 223, 0.3)',
                              cursor: game.gameStatus === 'SCHEDULED' && !isGameStarted(game.gameDate) ? 'pointer' : 'default',
                              width: '60px',
                              padding: '4px 8px',
                              fontFamily: 'monospace',
                              fontSize: '0.95rem',
                              textAlign: 'center',
                              fontWeight: '600'
                            }}
                            onClick={() => {
                              if (game.gameStatus === 'SCHEDULED' && !isGameStarted(game.gameDate)) {
                                startEditing(game);
                              }
                            }}
                          >
                            {game.prediction.predictedHomeScore}:{game.prediction.predictedAwayScore}
                          </span>
                        )}

                        {game.prediction?.points !== undefined && game.prediction?.points !== null && (
                          <Badge
                            bg={game.prediction.points === 3 ? 'success' : game.prediction.points === 1 ? 'warning' : 'secondary'}
                          >
                            {game.prediction.points} pkt
                            {game.gameStatus === 'FINISHED' && game.cumulativePoints !== undefined && (
                              <span style={{ marginLeft: '4px', fontSize: '0.85em', opacity: 0.9 }}>
                                (suma: {game.cumulativePoints})
                              </span>
                            )}
                          </Badge>
                        )}

                        {/* Przycisk typuj dla nowych typów */}
                        {!game.prediction && game.gameStatus === 'SCHEDULED' && !isGameStarted(game.gameDate) && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            style={{ minWidth: '38px', padding: '4px 8px' }}
                            onClick={() => startEditing(game)}
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
          ) : (
            <div className="text-center text-muted py-3">
              <i className="fas fa-futbol fa-2x mb-2 text-gray-300 d-block"></i>
              {games.length === 0 ? 'Brak meczów do wyświetlenia' : 'Brak meczów w wybranej kategorii'}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default Games;
