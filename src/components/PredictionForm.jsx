import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { gameApi, predictionApi } from '../services/api';

function PredictionForm() {
  const { gameId, predictionId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!predictionId;

  const [game, setGame] = useState(null);
  const [predictedHomeScore, setPredictedHomeScore] = useState('');
  const [predictedAwayScore, setPredictedAwayScore] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [gameId, predictionId]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (isEditMode) {
        // Edit mode - load prediction and game
        const [predictionResponse, gameResponse] = await Promise.all([
          predictionApi.getPredictionById(predictionId),
          predictionApi.getPredictionById(predictionId).then(p => gameApi.getGameById(p.data.gameId))
        ]);

        const prediction = predictionResponse.data;
        setGame(gameResponse.data);
        setPredictedHomeScore(prediction.predictedHomeScore.toString());
        setPredictedAwayScore(prediction.predictedAwayScore.toString());
      } else {
        // New mode - load game only
        const gameResponse = await gameApi.getGameById(gameId);
        setGame(gameResponse.data);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Nie udało się załadować danych');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const homeScore = parseInt(predictedHomeScore, 10);
    const awayScore = parseInt(predictedAwayScore, 10);

    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      alert('Proszę wprowadzić poprawne wyniki');
      return;
    }

    try {
      setSubmitting(true);

      const predictionData = {
        gameId: isEditMode ? game.id : parseInt(gameId, 10),
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore
      };

      if (isEditMode) {
        await predictionApi.updatePrediction(predictionId, predictionData);
      } else {
        await predictionApi.createPrediction(predictionData);
      }

      navigate('/games');
    } catch (err) {
      console.error('Error submitting prediction:', err);
      alert('Nie udało się zapisać typu');
      setSubmitting(false);
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

  if (!game) return null;

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <i className="fas fa-futbol text-primary"></i>{' '}
          {isEditMode ? 'Edytuj typ' : 'Nowy typ'}
        </h1>
      </div>

      {/* Informacja o meczu */}
      <Card className="border-start border-primary border-4 shadow mb-4">
        <Card.Body>
          <div className="text-xs fw-bold text-primary text-uppercase mb-1">
            {formatDate(game.gameDate)}
          </div>
          <div className="h5 mb-0 fw-bold text-gray-800">
            <span className={`fi fi-${game.homeCountryCode?.toLowerCase()} me-2`}></span>
            {game.homeTeam} vs {game.awayTeam}
            <span className={`fi fi-${game.awayCountryCode?.toLowerCase()} ms-2`}></span>
          </div>
        </Card.Body>
      </Card>

      {/* Formularz typu */}
      <Card className="shadow">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <span className={`fi fi-${game.homeCountryCode?.toLowerCase()} me-2`}></span>
                    {game.homeTeam}
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    required
                    value={predictedHomeScore}
                    onChange={(e) => setPredictedHomeScore(e.target.value)}
                    disabled={submitting}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <span className={`fi fi-${game.awayCountryCode?.toLowerCase()} me-2`}></span>
                    {game.awayTeam}
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    required
                    value={predictedAwayScore}
                    onChange={(e) => setPredictedAwayScore(e.target.value)}
                    disabled={submitting}
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex gap-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Zapisywanie...' : isEditMode ? 'Zapisz zmiany' : 'Wyślij typ'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/games')}
                disabled={submitting}
              >
                Anuluj
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default PredictionForm;
