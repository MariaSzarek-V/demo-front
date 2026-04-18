import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Button, Badge } from 'react-bootstrap';
import { compareApi } from '../services/api';

function Compare() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCompareData();
  }, [userId]);

  const loadCompareData = async () => {
    try {
      setLoading(true);
      const response = await compareApi.compareWithUser(userId);
      setCompareData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading comparison:', err);
      setError('Nie udało się załadować porównania');
      setLoading(false);
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

  if (error || !compareData) {
    return (
      <Container fluid className="px-2 px-md-4 px-lg-5 content-container-narrow">
        <div className="alert alert-danger" role="alert">
          {error || 'Brak danych'}
        </div>
        <Button variant="primary" onClick={() => navigate('/ranking')}>
          Powrót do rankingu
        </Button>
      </Container>
    );
  }

  const { currentUser, comparedUser } = compareData;

  // Build a map of gameId -> predictions for both users
  const gamesMap = new Map();

  currentUser.predictions?.forEach(pred => {
    if (!gamesMap.has(pred.gameId)) {
      gamesMap.set(pred.gameId, {
        gameId: pred.gameId,
        homeTeam: pred.homeTeam,
        awayTeam: pred.awayTeam,
        homeCountryCode: pred.homeCountryCode,
        awayCountryCode: pred.awayCountryCode,
        gameDate: pred.gameDate,
        actualHomeScore: pred.actualHomeScore,
        actualAwayScore: pred.actualAwayScore,
        currentUserPrediction: null,
        comparedUserPrediction: null
      });
    }
    gamesMap.get(pred.gameId).currentUserPrediction = pred;
  });

  comparedUser.predictions?.forEach(pred => {
    if (!gamesMap.has(pred.gameId)) {
      gamesMap.set(pred.gameId, {
        gameId: pred.gameId,
        homeTeam: pred.homeTeam,
        awayTeam: pred.awayTeam,
        homeCountryCode: pred.homeCountryCode,
        awayCountryCode: pred.awayCountryCode,
        gameDate: pred.gameDate,
        actualHomeScore: pred.actualHomeScore,
        actualAwayScore: pred.actualAwayScore,
        currentUserPrediction: null,
        comparedUserPrediction: null
      });
    }
    gamesMap.get(pred.gameId).comparedUserPrediction = pred;
  });

  // Filter only games where BOTH users have predictions
  const commonGames = Array.from(gamesMap.values()).filter(
    game => game.currentUserPrediction && game.comparedUserPrediction
  );

  // Calculate summary statistics
  const currentUserTotalPoints = commonGames.reduce(
    (sum, game) => sum + (game.currentUserPrediction?.points || 0),
    0
  );
  const comparedUserTotalPoints = commonGames.reduce(
    (sum, game) => sum + (game.comparedUserPrediction?.points || 0),
    0
  );

  let currentUserBetterCount = 0;
  let comparedUserBetterCount = 0;
  let tieCount = 0;

  commonGames.forEach(game => {
    const currentPoints = game.currentUserPrediction?.points || 0;
    const comparedPoints = game.comparedUserPrediction?.points || 0;
    if (currentPoints > comparedPoints) {
      currentUserBetterCount++;
    } else if (comparedPoints > currentPoints) {
      comparedUserBetterCount++;
    } else {
      tieCount++;
    }
  });

  const getInitials = (username) => {
    if (!username) return '?';
    const parts = username.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const capitalizeFirstLetter = (username) => {
    if (!username) return '';
    return username.charAt(0).toUpperCase() + username.slice(1);
  };

  const getPointsBadgeColor = (points) => {
    if (points === 3) return 'success';
    if (points === 1) return 'warning';
    return 'danger';
  };

  const getRowBackgroundColor = (currentPoints, comparedPoints) => {
    if (currentPoints > comparedPoints) return 'rgba(78, 115, 223, 0.1)';
    if (comparedPoints > currentPoints) return 'rgba(246, 194, 62, 0.1)';
    return 'transparent';
  };

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5 content-container-narrow">
      {/* Comparison Stats Header */}
      <div className="row mb-3">
        {/* Current User Card */}
        <div className="col-12 col-md-6 mb-3 mb-md-0">
          <Card className="border-start border-primary border-4 shadow h-100">
            <Card.Body className="py-3">
              <div className="text-center">
                <h4 className="mb-1" style={{ fontWeight: '900' }}>{capitalizeFirstLetter(currentUser.username)}</h4>
              <div className="text-muted d-block mb-2 fw-bold" style={{ fontSize: '1rem' }}>#{currentUser.position || '-'}</div>
              <div className="mb-2 d-flex flex-column align-items-center" style={{ borderBottom: '2px solid #ddd', paddingBottom: '8px' }}>
                <div className="fw-bold" style={{ fontSize: '0.875rem', color: '#28a745' }}>
                  {commonGames.filter(g => (g.currentUserPrediction?.points || 0) === 3).length} x 3 pkt
                </div>
                <div className="text-warning fw-bold" style={{ fontSize: '0.875rem' }}>
                  {commonGames.filter(g => (g.currentUserPrediction?.points || 0) === 1).length} x 1 pkt
                </div>
                <div className="text-danger fw-bold" style={{ fontSize: '0.875rem' }}>
                  {commonGames.filter(g => (g.currentUserPrediction?.points || 0) === 0).length} x 0 pkt
                </div>
              </div>
                <div className="text-center text-muted fw-bold" style={{ fontSize: '0.875rem', paddingTop: '4px' }}>
                  {currentUserTotalPoints} pkt
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Compared User Card */}
        <div className="col-12 col-md-6">
          <Card className="border-start border-warning border-4 shadow h-100">
            <Card.Body className="py-3">
              <div className="text-center">
                <h4 className="mb-1" style={{ fontWeight: '900' }}>{capitalizeFirstLetter(comparedUser.username)}</h4>
                <div className="text-muted d-block mb-2 fw-bold" style={{ fontSize: '1rem' }}>#{comparedUser.position || '-'}</div>
                <div className="mb-2 d-flex flex-column align-items-center" style={{ borderBottom: '2px solid #ddd', paddingBottom: '8px' }}>
                  <div className="fw-bold" style={{ fontSize: '0.875rem', color: '#28a745' }}>
                    {commonGames.filter(g => (g.comparedUserPrediction?.points || 0) === 3).length} x 3 pkt
                  </div>
                  <div className="text-warning fw-bold" style={{ fontSize: '0.875rem' }}>
                    {commonGames.filter(g => (g.comparedUserPrediction?.points || 0) === 1).length} x 1 pkt
                  </div>
                  <div className="text-danger fw-bold" style={{ fontSize: '0.875rem' }}>
                    {commonGames.filter(g => (g.comparedUserPrediction?.points || 0) === 0).length} x 0 pkt
                  </div>
                </div>
                <div className="text-center text-muted fw-bold" style={{ fontSize: '0.875rem', paddingTop: '4px' }}>
                  {comparedUserTotalPoints} pkt
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Games Comparison Table */}
      <Card className="border-start border-success border-4 shadow" style={{ borderRadius: '0.375rem', overflow: 'hidden' }}>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <tbody>
                {commonGames.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center text-muted py-4">
                      Brak wspólnych zakończonych meczów do porównania
                    </td>
                  </tr>
                ) : (
                  commonGames.map(game => {
                    const currentPred = game.currentUserPrediction;
                    const comparedPred = game.comparedUserPrediction;
                    const currentPoints = currentPred?.points || 0;
                    const comparedPoints = comparedPred?.points || 0;
                    const rowBg = getRowBackgroundColor(currentPoints, comparedPoints);

                    return (
                      <tr key={game.gameId} style={{ backgroundColor: rowBg }}>
                        {/* Current User Prediction */}
                        <td className="text-center align-middle">
                          <Badge bg={getPointsBadgeColor(currentPoints)} className="mb-2">
                            {currentPoints} pkt
                          </Badge>
                          <div className="fw-bold">
                            {currentPred?.predictedHomeScore ?? '-'} : {currentPred?.predictedAwayScore ?? '-'}
                          </div>
                        </td>

                        {/* Game Info */}
                        <td className="text-center align-middle">
                          <small className="text-muted d-block mb-1">
                            {new Date(game.gameDate).toLocaleDateString('pl-PL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </small>
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <strong style={{ flex: '1', textAlign: 'right' }}>{game.homeTeam}</strong>
                            <span className={`fi fi-${game.homeCountryCode?.toLowerCase()}`} style={{ flexShrink: 0 }}></span>
                            <strong className="text-primary" style={{ fontSize: '1.1rem', minWidth: '50px' }}>
                              {game.actualHomeScore} : {game.actualAwayScore}
                            </strong>
                            <span className={`fi fi-${game.awayCountryCode?.toLowerCase()}`} style={{ flexShrink: 0 }}></span>
                            <strong style={{ flex: '1', textAlign: 'left' }}>{game.awayTeam}</strong>
                          </div>
                        </td>

                        {/* Compared User Prediction */}
                        <td className="text-center align-middle">
                          <Badge bg={getPointsBadgeColor(comparedPoints)} className="mb-2">
                            {comparedPoints} pkt
                          </Badge>
                          <div className="fw-bold">
                            {comparedPred?.predictedHomeScore ?? '-'} : {comparedPred?.predictedAwayScore ?? '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Compare;
