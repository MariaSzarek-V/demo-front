import { useState, useEffect } from 'react';
import { Container, Card, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { gameApi, predictionApi } from '../services/api';

function Games() {
  const navigate = useNavigate();
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
    console.log('Starting editing for game:', game.id);
    console.log('Full game object:', game);
    console.log('Game prediction:', game.prediction);

    setEditingGameId(game.id);
    setEditedScores({
      ...editedScores,
      [game.id]: {
        home: game.prediction?.predictedHomeScore?.toString() || '',
        away: game.prediction?.predictedAwayScore?.toString() || ''
      }
    });
  };

  const cancelEditing = () => {
    setEditingGameId(null);
  };

  const handleScoreChange = (gameId, team, value) => {
    setEditedScores({
      ...editedScores,
      [gameId]: {
        ...editedScores[gameId],
        [team]: value
      }
    });
  };

  const savePrediction = async (game) => {
    const scores = editedScores[game.id];
    console.log('Saving prediction for game:', game.id);
    console.log('Game prediction:', game.prediction);
    console.log('Scores for this game:', scores);

    const homeScore = parseInt(scores?.home, 10);
    const awayScore = parseInt(scores?.away, 10);

    console.log('Parsed scores - home:', homeScore, 'away:', awayScore);

    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      alert('Proszę wprowadzić poprawne wyniki');
      return;
    }

    try {
      const predictionData = {
        gameId: game.id,
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
    const date = new Date(dateString);
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

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filter buttons */}
      <div className="mb-2 d-flex gap-2 justify-content-center">
        <Button
          variant={filter === 'ALL' ? 'primary' : 'outline-primary'}
          size="sm"
          onClick={() => setFilter('ALL')}
        >
          Wszystkie
        </Button>
        <Button
          variant={filter === 'SCHEDULED' ? 'primary' : 'outline-primary'}
          size="sm"
          onClick={() => setFilter('SCHEDULED')}
        >
          Nadchodzące
        </Button>
        <Button
          variant={filter === 'FINISHED' ? 'primary' : 'outline-primary'}
          size="sm"
          onClick={() => setFilter('FINISHED')}
        >
          Zakończone
        </Button>
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
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => game.gameStatus === 'FINISHED' && navigate(`/results/${game.id}`)}
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
                            onChange={(e) => handleScoreChange(game.id, 'home', e.target.value)}
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
                            value={editedScores[game.id]?.away || ''}
                            onChange={(e) => handleScoreChange(game.id, 'away', e.target.value)}
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
                            onClick={() => savePrediction(game)}
                            title="Zapisz"
                          >
                            <i className="fas fa-check"></i>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ minWidth: '38px', padding: '4px 8px' }}
                            onClick={cancelEditing}
                            title="Anuluj"
                          >
                            <i className="fas fa-times"></i>
                          </Button>
                          {game.prediction && (
                            <Button
                              variant="danger"
                              size="sm"
                              style={{ minWidth: '38px', padding: '4px 8px' }}
                              onClick={(e) => handleDeletePrediction(game.prediction.id, e)}
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
    </Container>
  );
}

export default Games;
