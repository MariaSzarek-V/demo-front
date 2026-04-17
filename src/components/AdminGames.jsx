import { useState, useEffect } from 'react';
import { Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AddGameModal from './AddGameModal';
import EditGameModal from './EditGameModal';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

function AdminGames() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, FINISHED, SCHEDULED, ADMIN_VIEW

  useEffect(() => {
    // Check if user is admin
    if (!user || user.userRole !== 'ADMIN') {
      navigate('/games');
      return;
    }
    loadGames();
  }, [user, navigate]);

  const loadGames = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllGames();
      setGames(response.data);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Nie udało się załadować meczów');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (gameId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten mecz?')) {
      return;
    }
    try {
      await adminApi.deleteGame(gameId);
      loadGames();
    } catch (err) {
      console.error('Error deleting game:', err);
      alert('Nie udało się usunąć meczu');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: pl });
    } catch (e) {
      return '-';
    }
  };

  // Filter and sort games - IDENTYCZNIE jak w Games.jsx
  const getFilteredGames = () => {
    if (filter === 'FINISHED') {
      // Zakończone: od najnowszego do najstarszego - malejąco
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
    if (filter === 'ADMIN_VIEW') {
      // Ukryte: od najbliższej do najdalszej - rosnąco
      return games
        .filter(game => game.gameStatus === 'ADMIN_VIEW')
        .sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate));
    }
    // Wszystkie: chronologicznie od pierwszego do ostatniego - rosnąco
    return [...games].sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate));
  };

  const filteredGames = getFilteredGames();

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

  if (error) {
    return (
      <div className="content-container">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="content-container content-container-narrow" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filter buttons */}
      <div className="mb-2 d-flex gap-2 justify-content-center">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => navigate('/games')}
        >
          <i className="fas fa-arrow-left me-1"></i>
          Powrót
        </Button>
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
        <Button
          variant={filter === 'ADMIN_VIEW' ? 'warning' : 'outline-warning'}
          size="sm"
          onClick={() => setFilter('ADMIN_VIEW')}
        >
          Ukryte
        </Button>
        <Button
          variant="success"
          size="sm"
          onClick={() => setShowAddModal(true)}
        >
          <i className="fas fa-plus me-1"></i>
          Dodaj
        </Button>
      </div>

      <Card className="border-start border-warning border-4 shadow" style={{ flex: '1', minHeight: 0, marginBottom: '0.5rem' }}>
        <Card.Body style={{ maxHeight: '100%', overflowY: 'auto' }}>
          {filteredGames && filteredGames.length > 0 ? (
            <div className="games-list" style={{ fontSize: '0.9rem' }}>
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  className="game-item"
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    borderBottom: '1px solid #e3e6f0',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Data i drużyny - IDENTYCZNIE jak w Games.jsx */}
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
                        <strong className="game-score text-primary d-block" style={{ fontSize: '1.1rem', margin: '4px 0' }}>
                          {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                        </strong>
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
                        <strong className="game-score text-primary text-center">
                          {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                        </strong>
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
                        <strong className="game-score text-primary d-block" style={{ fontSize: '1.1rem', margin: '4px 0' }}>
                          {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                        </strong>
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
                        <strong className="game-score text-primary text-center">
                          {game.homeScore ?? '-'}:{game.awayScore ?? '-'}
                        </strong>
                        <span className={`fi fi-${game.awayCountryCode?.toLowerCase()}`}></span>
                        <span className="fw-bold text-start">{game.awayTeam}</span>
                      </div>
                    )}
                  </div>

                  {/* Admin controls - DOKŁADNIE W TYM SAMYM MIEJSCU CO PRZYCISK + W GAMES */}
                  <div className="d-flex justify-content-center align-items-center gap-2 mt-2">
                    <Button
                      variant="warning"
                      size="sm"
                      style={{ minWidth: '38px', padding: '4px 8px' }}
                      onClick={() => {
                        setEditingGame(game);
                        setShowEditModal(true);
                      }}
                      title="Edytuj mecz"
                    >
                      <i className="fas fa-edit"></i>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      style={{ minWidth: '38px', padding: '4px 8px' }}
                      onClick={() => handleDelete(game.id)}
                      title="Usuń mecz"
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
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

      {/* Modals */}
      <AddGameModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onSuccess={loadGames}
      />
      <EditGameModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        game={editingGame}
        onSuccess={loadGames}
      />
    </div>
  );
}

export default AdminGames;
