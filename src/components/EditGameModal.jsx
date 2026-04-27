import { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { adminApi, countryApi } from '../services/api';

function EditGameModal({ show, onHide, game, onSuccess }) {
  const [countries, setCountries] = useState([]);
  const [formData, setFormData] = useState({
    homeCountryId: '',
    awayCountryId: '',
    gameDate: '',
    homeScore: '',
    awayScore: '',
    gameStatus: 'SCHEDULED'
  });
  const [homeSearch, setHomeSearch] = useState('');
  const [awaySearch, setAwaySearch] = useState('');
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [showAwayDropdown, setShowAwayDropdown] = useState(false);
  const [selectedHomeCountry, setSelectedHomeCountry] = useState(null);
  const [selectedAwayCountry, setSelectedAwayCountry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      loadCountries();
    }
  }, [show]);

  const parseDateToInputValue = (gameDate) => {
    if (!gameDate) return '';
    let date;
    if (Array.isArray(gameDate)) {
      const [year, month, day, hour, minute] = gameDate;
      date = new Date(year, month - 1, day, hour, minute);
    } else {
      date = new Date(gameDate);
    }
    if (isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    if (show && game) {
      const gameDate = parseDateToInputValue(game.gameDate);

      setFormData({
        homeCountryId: game.homeCountryId || '',
        awayCountryId: game.awayCountryId || '',
        gameDate: gameDate,
        homeScore: game.homeScore ?? '',
        awayScore: game.awayScore ?? '',
        gameStatus: game.gameStatus || 'SCHEDULED'
      });

      // Set search fields with country names
      setHomeSearch(game.homeTeam || '');
      setAwaySearch(game.awayTeam || '');

      // Set selected countries
      if (game.homeCountryId) {
        setSelectedHomeCountry({ id: game.homeCountryId, name: game.homeTeam, code: game.homeCountryCode });
      }
      if (game.awayCountryId) {
        setSelectedAwayCountry({ id: game.awayCountryId, name: game.awayTeam, code: game.awayCountryCode });
      }

      setError(null);
    }
  }, [show, game]);

  const loadCountries = async () => {
    try {
      const response = await countryApi.getAllCountries();
      setCountries(response.data);
    } catch (err) {
      console.error('Error loading countries:', err);
      setError('Nie udało się załadować krajów');
    }
  };

  const filterCountries = (searchTerm) => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return countries
      .filter(country => country.name.toLowerCase().includes(term))
      .slice(0, 10);
  };

  const handleHomeCountrySelect = (country) => {
    setSelectedHomeCountry(country);
    setHomeSearch(country.name);
    setFormData({ ...formData, homeCountryId: country.id });
    setShowHomeDropdown(false);
  };

  const handleAwayCountrySelect = (country) => {
    setSelectedAwayCountry(country);
    setAwaySearch(country.name);
    setFormData({ ...formData, awayCountryId: country.id });
    setShowAwayDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.homeCountryId || !formData.awayCountryId) {
      setError('Wybierz drużyny gospodarzy i gości');
      return;
    }

    if (!formData.gameDate) {
      setError('Wybierz datę i godzinę meczu');
      return;
    }

    // Validate date vs status
    const now = new Date();
    const gameDate = new Date(formData.gameDate);

    if (formData.gameStatus === 'SCHEDULED' && gameDate < now) {
      setError('Zaplanowany mecz nie może mieć daty w przeszłości');
      return;
    }

    if (formData.gameStatus === 'FINISHED' && gameDate > now) {
      setError('Zakończony mecz nie może mieć daty w przyszłości');
      return;
    }

    if (formData.gameStatus === 'FINISHED' && (formData.homeScore === '' || formData.awayScore === '')) {
      setError('Zakończony mecz musi mieć podany wynik');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updateData = {
        homeCountryId: formData.homeCountryId,
        awayCountryId: formData.awayCountryId,
        homeTeam: selectedHomeCountry?.name || game.homeTeam,
        awayTeam: selectedAwayCountry?.name || game.awayTeam,
        gameDate: formData.gameDate + ':00',
        gameStatus: formData.gameStatus,
        homeScore: formData.homeScore !== '' ? parseInt(formData.homeScore) : null,
        awayScore: formData.awayScore !== '' ? parseInt(formData.awayScore) : null
      };

      console.log('Sending update data:', updateData);

      await adminApi.updateGame(game.id, updateData);
      onSuccess();
      onHide();
    } catch (err) {
      console.error('Error updating game:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Nie udało się zaktualizować meczu');
    } finally {
      setLoading(false);
    }
  };

  const filteredHomeCountries = filterCountries(homeSearch);
  const filteredAwayCountries = filterCountries(awaySearch);

  if (!game) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edytuj mecz</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <Form onSubmit={handleSubmit}>
          {/* Home Country Search */}
          <Form.Group className="mb-3">
            <Form.Label>Drużyna gospodarzy</Form.Label>
            <div style={{ position: 'relative' }}>
              <div className="d-flex gap-2 align-items-center">
                {selectedHomeCountry && (
                  <span className={`fi fi-${selectedHomeCountry.code?.toLowerCase()}`} style={{ fontSize: '1.5rem' }}></span>
                )}
                <Form.Control
                  type="text"
                  placeholder="Wyszukaj kraj..."
                  value={homeSearch}
                  onChange={(e) => {
                    setHomeSearch(e.target.value);
                    setShowHomeDropdown(true);
                  }}
                  onFocus={() => setShowHomeDropdown(true)}
                />
              </div>
              {showHomeDropdown && filteredHomeCountries.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {filteredHomeCountries.map(country => (
                    <div
                      key={country.id}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onClick={() => handleHomeCountrySelect(country)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <span className={`fi fi-${country.code?.toLowerCase()}`}></span>
                      <span>{country.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Group>

          {/* Away Country Search */}
          <Form.Group className="mb-3">
            <Form.Label>Drużyna gości</Form.Label>
            <div style={{ position: 'relative' }}>
              <div className="d-flex gap-2 align-items-center">
                {selectedAwayCountry && (
                  <span className={`fi fi-${selectedAwayCountry.code?.toLowerCase()}`} style={{ fontSize: '1.5rem' }}></span>
                )}
                <Form.Control
                  type="text"
                  placeholder="Wyszukaj kraj..."
                  value={awaySearch}
                  onChange={(e) => {
                    setAwaySearch(e.target.value);
                    setShowAwayDropdown(true);
                  }}
                  onFocus={() => setShowAwayDropdown(true)}
                />
              </div>
              {showAwayDropdown && filteredAwayCountries.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {filteredAwayCountries.map(country => (
                    <div
                      key={country.id}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onClick={() => handleAwayCountrySelect(country)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <span className={`fi fi-${country.code?.toLowerCase()}`}></span>
                      <span>{country.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Group>

          {/* Game Date */}
          <Form.Group className="mb-3">
            <Form.Label>Data i godzina meczu</Form.Label>
            <Form.Control
              type="datetime-local"
              value={formData.gameDate}
              onChange={(e) => setFormData({ ...formData, gameDate: e.target.value })}
              required
            />
          </Form.Group>

          {/* Game Status */}
          <Form.Group className="mb-3">
            <Form.Label>Status meczu</Form.Label>
            <Form.Select
              value={formData.gameStatus}
              onChange={(e) => setFormData({ ...formData, gameStatus: e.target.value })}
            >
              <option value="ADMIN_VIEW">Ukryty (widok admina)</option>
              <option value="SCHEDULED">Zaplanowany</option>
              <option value="LIVE">Na żywo</option>
              <option value="FINISHED">Zakończony</option>
            </Form.Select>
          </Form.Group>

          {/* Scores - only for FINISHED status */}
          {formData.gameStatus === 'FINISHED' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Wynik końcowy</Form.Label>
                <div className="d-flex justify-content-center align-items-center gap-2">
                  <Form.Control
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.homeScore}
                    onChange={(e) => setFormData({ ...formData, homeScore: e.target.value })}
                    style={{ width: '80px', textAlign: 'center' }}
                    required
                  />
                  <span>:</span>
                  <Form.Control
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.awayScore}
                    onChange={(e) => setFormData({ ...formData, awayScore: e.target.value })}
                    style={{ width: '80px', textAlign: 'center' }}
                    required
                  />
                </div>
              </Form.Group>
              <div className="alert alert-warning" role="alert" style={{ fontSize: '0.9rem' }}>
                <i className="fas fa-exclamation-triangle me-2"></i>
                {game.gameStatus === 'FINISHED'
                  ? 'Zmiana wyniku automatycznie przeliczy punkty i ranking dla wszystkich użytkowników.'
                  : 'Oznaczenie meczu jako zakończony automatycznie przeliczy punkty i ranking.'}
              </div>
            </>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Anuluj
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default EditGameModal;
