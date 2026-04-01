import { useState, useEffect } from 'react';
import { Container, Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { gameApi, predictionApi } from '../services/api';

function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      // Merge games with predictions
      const gamesWithPredictions = gamesData.map(game => {
        const prediction = predictionsData.find(p => p.gameId === game.id);
        return {
          ...game,
          prediction: prediction || null
        };
      });

      setGames(gamesWithPredictions);
      setLoading(false);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Nie udało się załadować meczów');
      setLoading(false);
    }
  };

  const handleDeletePrediction = async (predictionId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten typowany wynik?')) {
      return;
    }

    try {
      await predictionApi.deletePrediction(predictionId);
      loadGames();
    } catch (err) {
      console.error('Error deleting prediction:', err);
      alert('Nie udało się usunąć typu');
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
    <Container fluid className="px-2 px-md-4 px-lg-5">
      <Card className="border-start border-primary border-4 shadow mb-4">
        <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {games && games.length > 0 ? (
            <div className="games-list" style={{ fontSize: '0.9rem' }}>
              {games.map((game) => (
                <div
                  key={game.id}
                  className="game-item d-flex flex-wrap justify-content-between align-items-center"
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    borderBottom: '1px solid #e3e6f0'
                  }}
                >
                  {/* Data i drużyny */}
                  <div className="game-header d-flex align-items-center flex-wrap">
                    <span className="game-date text-muted me-3" style={{ minWidth: '140px' }}>
                      {formatDate(game.gameDate)}
                    </span>

                    <div className="game-teams" style={{ minWidth: '220px' }}>
                      <span className="home-team">
                        <span className={`fi fi-${game.homeCountryCode?.toLowerCase()} me-1`}></span>
                        <span className="fw-bold">{game.homeTeam}</span>
                      </span>
                      <strong className="game-score text-primary mx-2">
                        {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                      </strong>
                      <span className="away-team">
                        <span className="fw-bold">{game.awayTeam}</span>
                        <span className={`fi fi-${game.awayCountryCode?.toLowerCase()} ms-1`}></span>
                      </span>
                    </div>
                  </div>

                  {/* Typ, punkty i przyciski */}
                  <div className="game-actions d-flex align-items-center text-nowrap">
                    {game.prediction && (
                      <span
                        className="me-2 btn btn-sm"
                        style={{
                          backgroundColor: '#fd7e14',
                          color: 'white',
                          border: 'none',
                          pointerEvents: 'none',
                          cursor: 'default',
                          minWidth: '50px',
                          padding: '4px 8px'
                        }}
                      >
                        {game.prediction.predictedHomeScore}:{game.prediction.predictedAwayScore}
                      </span>
                    )}

                    {game.prediction?.points !== undefined && game.prediction?.points !== null && (
                      <Badge
                        bg={game.prediction.points === 3 ? 'success' : game.prediction.points === 1 ? 'warning' : 'secondary'}
                        className="me-2"
                      >
                        {game.prediction.points} pkt
                      </Badge>
                    )}

                    {!game.prediction && game.gameStatus === 'SCHEDULED' && !isGameStarted(game.gameDate) && (
                      <Link
                        to={`/predictions/new/${game.id}`}
                        className="btn btn-sm btn-primary me-1"
                        style={{ minWidth: '38px', padding: '4px 8px' }}
                        title="Typuj"
                      >
                        <i className="fas fa-plus"></i>
                      </Link>
                    )}

                    {game.prediction && game.gameStatus === 'SCHEDULED' && !isGameStarted(game.gameDate) && (
                      <>
                        <Link
                          to={`/predictions/edit/${game.prediction.id}`}
                          className="btn btn-sm btn-outline-primary me-1"
                          style={{ minWidth: '38px', padding: '4px 8px' }}
                          title="Edytuj"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="me-1"
                          style={{ minWidth: '38px', padding: '4px 8px' }}
                          onClick={() => handleDeletePrediction(game.prediction.id)}
                          title="Usuń"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </>
                    )}

                    {game.gameStatus === 'FINISHED' && (
                      <Link to={`/results/${game.id}`} className="btn btn-sm btn-outline-info">
                        <i className="fas fa-search"></i> Wyniki
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted py-3">
              <i className="fas fa-futbol fa-2x mb-2 text-gray-300 d-block"></i>
              Brak meczów do wyświetlenia
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Games;
