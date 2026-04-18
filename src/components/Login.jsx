import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Walidacja pól - zawsze ten sam komunikat dla bezpieczeństwa
    if (!username.trim() || !password) {
      setError('Nieprawidłowa nazwa użytkownika lub hasło');
      return;
    }

    setLoading(true);

    try {
      await login({ username, password });
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Nieprawidłowa nazwa użytkownika lub hasło');
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-primary min-vh-100 d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5} xxl={4}>
            <Card className="o-hidden border-0 shadow-lg my-5">
              <Card.Body className="p-0">
                <div className="px-5 pt-5 pb-3">
                  <div className="text-center mb-4">
                    <i className="fas fa-trophy fa-3x text-primary mb-3"></i>
                    <h1 className="h4 text-gray-900">PredictionCUP</h1>
                  </div>

                      {error && (
                        <Alert variant="danger" className="text-center">
                          {error}
                        </Alert>
                      )}

                      <Form onSubmit={handleSubmit} className="user">
                        <Form.Group className="mb-3">
                          <Form.Control
                            type="text"
                            className="form-control-user"
                            placeholder="Nazwa użytkownika"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Control
                            type="password"
                            className="form-control-user"
                            placeholder="Hasło"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                          />
                        </Form.Group>

                        <Button
                          type="submit"
                          variant="primary"
                          className="btn-user w-100"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Logowanie...
                            </>
                          ) : (
                            'Zaloguj'
                          )}
                        </Button>
                      </Form>
                    </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Login;
