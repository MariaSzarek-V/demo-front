import { useState, useEffect, useRef } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';

function Profile() {
  const { user, setUser } = useAuth();
  const colorInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [avatarColor, setAvatarColor] = useState('#4e73df');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [hovering, setHovering] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.getCurrentUser();
      setUsername(response.data.username || '');
      setEmail(response.data.email || '');
      setAvatarColor(response.data.avatarColor || '#4e73df');
      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Nie udało się załadować profilu');
      setLoading(false);
    }
  };

  const getInitials = (u) => {
    if (!u) return '?';
    const parts = u.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return u.substring(0, 2).toUpperCase();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const response = await userApi.updateProfile({ avatarColor });
      setUser(response.data);
      setSuccess(true);
      setSaving(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Nie udało się zaktualizować profilu');
      setSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordError(null);
    setPasswordSuccess(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
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
      await userApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordSuccess(true);
      setSaving(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
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

      {/* Profile card */}
      <Card className="border-start border-primary border-4 shadow mb-3">
        <Card.Body style={{ padding: '1rem 1.25rem' }}>

          {/* Avatar + info row */}
          <div className="d-flex align-items-center gap-3 mb-3">
            {/* Clickable avatar */}
            <div
              style={{ position: 'relative', flexShrink: 0 }}
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
              onClick={() => colorInputRef.current?.click()}
              title="Kliknij aby zmienić kolor"
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: avatarColor,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: '3px solid #e3e6f0',
                  boxShadow: hovering ? `0 0 0 4px ${avatarColor}55` : '0 2px 8px rgba(0,0,0,0.12)',
                  transition: 'box-shadow 0.2s',
                  userSelect: 'none'
                }}
              >
                {getInitials(username)}
              </div>
              {/* Overlay hint on hover */}
              {hovering && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <i className="fas fa-palette" style={{ color: 'white', fontSize: '1.2rem' }}></i>
                </div>
              )}
              {/* Hidden native color input */}
              <input
                ref={colorInputRef}
                type="color"
                value={avatarColor}
                onChange={(e) => setAvatarColor(e.target.value)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                tabIndex={-1}
              />
            </div>

            {/* User info */}
            <div style={{ minWidth: 0 }}>
              <div className="fw-bold" style={{ fontSize: '1rem', color: '#2d3748' }}>{username}</div>
              <div style={{ fontSize: '0.8rem', color: '#858796' }}>{email}</div>
              <div style={{ fontSize: '0.72rem', color: '#adb5bd', marginTop: '4px' }}>
                <i className="fas fa-palette me-1"></i>
                Kliknij koło aby zmienić kolor
              </div>
            </div>
          </div>

          {success && (
            <div className="alert alert-success py-2 mb-2" style={{ fontSize: '0.85rem' }} role="alert">
              <i className="fas fa-check-circle me-2"></i>Profil zaktualizowany!
            </div>
          )}
          {error && (
            <div className="alert alert-danger py-2 mb-2" style={{ fontSize: '0.85rem' }} role="alert">
              <i className="fas fa-exclamation-circle me-2"></i>{error}
            </div>
          )}

          <div className="d-flex justify-content-end">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Zapisywanie...</>
              ) : (
                <><i className="fas fa-save me-1"></i>Zapisz kolor</>
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Password card */}
      <Card className="border-start border-warning border-4 shadow mb-3">
        <Card.Body style={{ padding: '0.75rem 1.25rem' }}>
          <div
            className="d-flex justify-content-between align-items-center"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowPasswordSection(!showPasswordSection)}
          >
            <span className="fw-bold text-warning" style={{ fontSize: '0.875rem' }}>
              <i className="fas fa-lock me-2"></i>Zmień hasło
            </span>
            <i className={`fas fa-chevron-${showPasswordSection ? 'up' : 'down'} text-warning`} style={{ fontSize: '0.8rem' }}></i>
          </div>

          {showPasswordSection && (
            <Form onSubmit={handlePasswordSubmit} className="mt-3">
              {passwordSuccess && (
                <div className="alert alert-success py-2 mb-2" style={{ fontSize: '0.85rem' }} role="alert">
                  <i className="fas fa-check-circle me-2"></i>Hasło zmienione!
                </div>
              )}
              {passwordError && (
                <div className="alert alert-danger py-2 mb-2" style={{ fontSize: '0.85rem' }} role="alert">
                  <i className="fas fa-exclamation-circle me-2"></i>{passwordError}
                </div>
              )}

              <Form.Group className="mb-2">
                <Form.Label style={{ fontSize: '0.8rem', marginBottom: '3px' }}>Aktualne hasło</Form.Label>
                <Form.Control
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  size="sm"
                  placeholder="Aktualne hasło"
                />
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label style={{ fontSize: '0.8rem', marginBottom: '3px' }}>Nowe hasło</Form.Label>
                <Form.Control
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                  size="sm"
                  placeholder="Min. 8 znaków"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label style={{ fontSize: '0.8rem', marginBottom: '3px' }}>Potwierdź hasło</Form.Label>
                <Form.Control
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                  size="sm"
                  placeholder="Powtórz nowe hasło"
                />
              </Form.Group>

              <div className="d-flex justify-content-end">
                <Button type="submit" variant="warning" size="sm" disabled={saving}>
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Zmieniam...</>
                  ) : (
                    <><i className="fas fa-key me-1"></i>Zmień hasło</>
                  )}
                </Button>
              </div>
            </Form>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default Profile;
