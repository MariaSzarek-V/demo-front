import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Image } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';

function Profile() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    avatarUrl: ''
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.getCurrentUser();
      setFormData({
        username: response.data.username || '',
        email: response.data.email || '',
        avatarUrl: response.data.avatarUrl || ''
      });
      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Nie udało się załadować profilu');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const updateData = {
        username: formData.username,
        avatarUrl: formData.avatarUrl || null
      };

      const response = await userApi.updateProfile(updateData);

      // Zaktualizuj context
      setUser(response.data);

      setSuccess(true);
      setSaving(false);

      // Ukryj komunikat po 3 sekundach
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Nie udało się zaktualizować profilu');
      setSaving(false);
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

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <i className="fas fa-user-circle me-2"></i>
          Profil użytkownika
        </h1>
      </div>

      <Row className="justify-content-center">
        <Col lg={8} xl={6}>
          <Card className="shadow mb-4">
            <Card.Body>
              {/* Avatar Preview */}
              <div className="text-center mb-4">
                <div
                  style={{
                    width: '150px',
                    height: '150px',
                    margin: '0 auto',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '4px solid #4e73df',
                    backgroundColor: '#f8f9fc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {formData.avatarUrl ? (
                    <Image
                      src={formData.avatarUrl}
                      alt="Avatar"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      display: formData.avatarUrl ? 'none' : 'flex',
                      fontSize: '4rem',
                      color: '#858796'
                    }}
                  >
                    <i className="fas fa-user-circle"></i>
                  </div>
                </div>
                <div className="mt-3">
                  <h4>{formData.username}</h4>
                  <p className="text-muted">{formData.email}</p>
                </div>
              </div>

              {/* Success Message */}
              {success && (
                <div className="alert alert-success" role="alert">
                  <i className="fas fa-check-circle me-2"></i>
                  Profil został zaktualizowany pomyślnie!
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-circle me-2"></i>
                  {error}
                </div>
              )}

              {/* Form */}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="fas fa-user me-2"></i>
                    Nazwa użytkownika
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    minLength={5}
                    maxLength={50}
                    placeholder="Wprowadź nazwę użytkownika"
                  />
                  <Form.Text className="text-muted">
                    Od 5 do 50 znaków
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="fas fa-envelope me-2"></i>
                    Email
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={formData.email}
                    disabled
                    style={{ backgroundColor: '#e9ecef' }}
                  />
                  <Form.Text className="text-muted">
                    Email nie może być zmieniony
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>
                    <i className="fas fa-image me-2"></i>
                    URL zdjęcia profilowego
                  </Form.Label>
                  <Form.Control
                    type="url"
                    name="avatarUrl"
                    value={formData.avatarUrl}
                    onChange={handleChange}
                    maxLength={500}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <Form.Text className="text-muted">
                    Wklej URL do swojego zdjęcia profilowego (opcjonalnie)
                  </Form.Text>
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Zapisywanie...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Zapisz zmiany
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>

          {/* Additional Info Card */}
          <Card className="shadow">
            <Card.Body>
              <h6 className="text-primary mb-3">
                <i className="fas fa-info-circle me-2"></i>
                Wskazówki
              </h6>
              <ul className="mb-0" style={{ fontSize: '0.9rem' }}>
                <li className="mb-2">Możesz użyć zewnętrznego URL obrazka jako avatara</li>
                <li className="mb-2">Zalecane usługi do hostowania zdjęć: Imgur, Gravatar</li>
                <li className="mb-2">Obsługiwane formaty: JPG, PNG, GIF</li>
                <li>Twój avatar będzie widoczny w komentarzach i rankingu</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Profile;
