import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Button } from 'react-bootstrap';
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
      <Container fluid className="px-2 px-md-4 px-lg-5">
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
      <Container fluid className="px-2 px-md-4 px-lg-5">
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

  const getInitials = (username) => {
    if (!username) return '?';
    const parts = username.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const renderUserHeader = (user, bgColor) => (
    <div className="text-center mb-4 p-3" style={{ backgroundColor: bgColor, borderRadius: '8px' }}>
      <div
        className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
        style={{
          width: '80px',
          height: '80px',
          backgroundColor: user.avatarUrl ? 'transparent' : '#4e73df',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.5rem',
          border: '3px solid white'
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          />
        ) : (
          getInitials(user.username)
        )}
      </div>
      <h4 className="mb-2">{user.username}</h4>
      <div className="d-flex justify-content-center align-items-center gap-3">
        <div>
          <small className="text-muted d-block">Pozycja</small>
          <strong style={{ fontSize: '1.2rem' }}>#{user.position || '-'}</strong>
        </div>
        <div>
          <small className="text-muted d-block">Punkty</small>
          <strong style={{ fontSize: '1.2rem' }}>{user.totalPoints} pkt</strong>
        </div>
      </div>
    </div>
  );

  const renderPrediction = (prediction) => {
    const isCorrect = prediction.points === 3;
    const isPartial = prediction.points === 1;
    const backgroundColor = isCorrect ? '#d4edda' : isPartial ? '#fff3cd' : '#f8d7da';
    const borderColor = isCorrect ? '#c3e6cb' : isPartial ? '#ffeaa7' : '#f5c6cb';

    return (
      <div
        key={prediction.gameId}
        className="p-2 mb-2 rounded"
        style={{
          backgroundColor,
          border: `1px solid ${borderColor}`,
          fontSize: '0.9rem'
        }}
      >
        <div className="fw-bold mb-1">
          {prediction.homeTeam} vs {prediction.awayTeam}
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <span className="text-muted">Typowany:</span>{' '}
            <strong>
              {prediction.predictedHomeScore} : {prediction.predictedAwayScore}
            </strong>
          </div>
          {prediction.actualHomeScore !== null && prediction.actualAwayScore !== null && (
            <div>
              <span className="text-muted">Wynik:</span>{' '}
              <strong>
                {prediction.actualHomeScore} : {prediction.actualAwayScore}
              </strong>
            </div>
          )}
          <div>
            <span
              className="badge"
              style={{
                backgroundColor: isCorrect ? '#28a745' : isPartial ? '#ffc107' : '#dc3545',
                color: 'white'
              }}
            >
              {prediction.points} pkt
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Porównanie graczy</h2>
        <Button variant="secondary" onClick={() => navigate('/ranking')}>
          <i className="fas fa-arrow-left me-2"></i>
          Powrót
        </Button>
      </div>

      <Row>
        <Col md={6} className="mb-4">
          <Card className="border-start border-primary border-4 shadow h-100">
            <Card.Body>
              {renderUserHeader(currentUser, 'rgba(78, 115, 223, 0.1)')}
              <h5 className="mb-3">Typy i punkty:</h5>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {currentUser.predictions && currentUser.predictions.length > 0 ? (
                  currentUser.predictions.map((prediction) => renderPrediction(prediction))
                ) : (
                  <p className="text-muted">Brak typów</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="border-start border-warning border-4 shadow h-100">
            <Card.Body>
              {renderUserHeader(comparedUser, 'rgba(246, 194, 62, 0.1)')}
              <h5 className="mb-3">Typy i punkty:</h5>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {comparedUser.predictions && comparedUser.predictions.length > 0 ? (
                  comparedUser.predictions.map((prediction) => renderPrediction(prediction))
                ) : (
                  <p className="text-muted">Brak typów</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Compare;
