import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
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
    avatarColor: '#4e73df'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const AVATAR_COLORS = [
    { color: '#4e73df', name: 'Niebieski' },
    { color: '#1cc88a', name: 'Zielony' },
    { color: '#36b9cc', name: 'Cyjan' },
    { color: '#f6c23e', name: 'Żółty' },
    { color: '#e74a3b', name: 'Czerwony' },
    { color: '#858796', name: 'Szary' },
    { color: '#5a5c69', name: 'Ciemny szary' },
    { color: '#6f42c1', name: 'Fioletowy' },
    { color: '#fd7e14', name: 'Pomarańczowy' },
    { color: '#20c997', name: 'Turkusowy' },
    { color: '#e83e8c', name: 'Różowy' },
    { color: '#17a2b8', name: 'Błękitny' }
  ];

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
        avatarColor: response.data.avatarColor || '#4e73df'
      });
      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Nie udało się załadować profilu');
      setLoading(false);
    }
  };

  const getInitials = (username) => {
    if (!username) return '?';
    const parts = username.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordError(null);
    setPasswordSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const updateData = {
        avatarColor: formData.avatarColor
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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Walidacja
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Nowe hasła nie są identyczne');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Nowe hasło musi mieć co najmniej 8 znaków');
      return;
    }

    try {
      setSaving(true);
      setPasswordError(null);
      setPasswordSuccess(false);

      await userApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordSuccess(true);
      setSaving(false);

      // Reset formularza
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Ukryj komunikat po 3 sekundach
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(err.response?.data?.message || 'Nie udało się zmienić hasła');
      setSaving(false);
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

  return (
    <div className="content-container content-container-narrow">
      <Card className="border-start border-primary border-4 shadow mb-4">
        <Card.Body className="p-4">
          {/* Avatar Preview */}
          <div className="text-center mb-4">
            <div
              style={{
                width: '100px',
                height: '100px',
                margin: '0 auto',
                borderRadius: '50%',
                backgroundColor: formData.avatarColor,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                border: '3px solid #e3e6f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              {getInitials(formData.username)}
            </div>
            <div className="mt-3">
              <h4 className="mb-1">{formData.username}</h4>
              <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{formData.email}</p>
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
              <Form.Label className="fw-bold">
                <i className="fas fa-user me-2"></i>
                Nazwa użytkownika
              </Form.Label>
              <Form.Control
                type="text"
                value={formData.username}
                disabled
                style={{ backgroundColor: '#e9ecef' }}
              />
              <Form.Text className="text-muted">
                Nazwa użytkownika nie może być zmieniona
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">
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
              <Form.Label className="fw-bold">
                <i className="fas fa-palette me-2"></i>
                Kolor avatara
              </Form.Label>
              <div className="d-flex flex-wrap justify-content-center gap-2 mt-3 mb-2" style={{ padding: '10px' }}>
                {AVATAR_COLORS.map((item) => (
                  <div
                    key={item.color}
                    onClick={() => setFormData(prev => ({ ...prev, avatarColor: item.color }))}
                    style={{
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      cursor: 'pointer',
                      border: formData.avatarColor === item.color ? '3px solid #000' : '2px solid #e3e6f0',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      boxShadow: formData.avatarColor === item.color ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                    }}
                    title={item.name}
                    onMouseEnter={(e) => {
                      if (formData.avatarColor !== item.color) {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {formData.avatarColor === item.color && (
                      <i className="fas fa-check"></i>
                    )}
                  </div>
                ))}
              </div>
              <Form.Text className="text-muted d-block text-center">
                Wybierz kolor swojego avatara
              </Form.Text>
            </Form.Group>

            <div className="d-grid gap-2">
              <Button
                type="submit"
                variant="primary"
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

      {/* Password Change Card */}
      <Card className="border-start border-warning border-4 shadow mb-4">
        <Card.Body className="p-4">
          <div
            className="d-flex justify-content-between align-items-center"
            style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', transition: 'background-color 0.2s' }}
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <h6 className="text-warning mb-0 fw-bold">
              <i className="fas fa-lock me-2"></i>
              Zmień hasło
            </h6>
            <i className={`fas fa-chevron-${showPasswordSection ? 'up' : 'down'} text-warning`}></i>
          </div>

          {showPasswordSection && (
            <div className="mt-3">
              {/* Password Success Message */}
              {passwordSuccess && (
                <div className="alert alert-success" role="alert">
                  <i className="fas fa-check-circle me-2"></i>
                  Hasło zostało zmienione pomyślnie!
                </div>
              )}

              {/* Password Error Message */}
              {passwordError && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-circle me-2"></i>
                  {passwordError}
                </div>
              )}

              <Form onSubmit={handlePasswordSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="fas fa-key me-2"></i>
                    Aktualne hasło
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    placeholder="Wprowadź aktualne hasło"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="fas fa-lock me-2"></i>
                    Nowe hasło
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={8}
                    placeholder="Wprowadź nowe hasło"
                  />
                  <Form.Text className="text-muted">
                    Co najmniej 8 znaków
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="fas fa-lock me-2"></i>
                    Potwierdź nowe hasło
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={8}
                    placeholder="Potwierdź nowe hasło"
                  />
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button
                    type="submit"
                    variant="warning"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Zmieniam hasło...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key me-2"></i>
                        Zmień hasło
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </Card.Body>
      </Card>

    </div>
  );
}

export default Profile;
