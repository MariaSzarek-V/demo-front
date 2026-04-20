import { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { rankingApi } from '../services/api';
import { useLeague } from '../contexts/LeagueContext';
import { getUserColor } from '../utils/userColors';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function RankingChart({ currentUser }) {
  const { selectedLeague } = useLeague();
  const [allUsersHistory, setAllUsersHistory] = useState([]);
  const [gameLabels, setGameLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRankingHistory = async () => {
      if (!selectedLeague) return;

      try {
        setLoading(true);
        const response = await rankingApi.getRankingHistoryForChart(selectedLeague.id);
        const data = response.data;

        setGameLabels(data.gameLabels || []);
        setAllUsersHistory(data.allUsersHistory || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching ranking history:', err);
        setError('Nie udało się załadować historii rankingu');
      } finally {
        setLoading(false);
      }
    };

    fetchRankingHistory();
  }, [selectedLeague]);

  const currentUsername = currentUser?.username || '';

  // State do zarządzania widocznością użytkowników
  const [visibleUsers, setVisibleUsers] = useState({});

  // State do śledzenia najechania na użytkownika
  const [hoveredUser, setHoveredUser] = useState(null);

  // State do wyszukiwania użytkowników
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Inicjalizuj widoczność użytkowników gdy dane się załadują
  useEffect(() => {
    if (allUsersHistory.length > 0) {
      const initialVisibility = allUsersHistory.reduce((acc, user) => {
        acc[user.username] = true;
        return acc;
      }, {});
      setVisibleUsers(initialVisibility);
    }
  }, [allUsersHistory]);

  const toggleUser = (username) => {
    setVisibleUsers(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  // Szybkie akcje filtrowania
  const showOnlyMe = () => {
    const newVisibility = allUsersHistory.reduce((acc, user) => {
      acc[user.username] = user.username === currentUsername;
      return acc;
    }, {});
    setVisibleUsers(newVisibility);
  };

  const showTop3AndMe = () => {
    const newVisibility = allUsersHistory.reduce((acc, user, index) => {
      acc[user.username] = index < 3 || user.username === currentUsername;
      return acc;
    }, {});
    setVisibleUsers(newVisibility);
  };

  const showTop5AndMe = () => {
    const newVisibility = allUsersHistory.reduce((acc, user, index) => {
      acc[user.username] = index < 5 || user.username === currentUsername;
      return acc;
    }, {});
    setVisibleUsers(newVisibility);
  };

  const showAll = () => {
    const newVisibility = allUsersHistory.reduce((acc, user) => {
      acc[user.username] = true;
      return acc;
    }, {});
    setVisibleUsers(newVisibility);
  };

  const hideAll = () => {
    const newVisibility = allUsersHistory.reduce((acc, user) => {
      acc[user.username] = false;
      return acc;
    }, {});
    setVisibleUsers(newVisibility);
  };

  // Filtruj użytkowników na podstawie wyszukiwania
  const filteredUsers = allUsersHistory.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obsługa wyboru użytkownika z podpowiedzi
  const handleSelectUser = (username) => {
    // Ukryj wszystkich
    const newVisibility = allUsersHistory.reduce((acc, user) => {
      acc[user.username] = false;
      return acc;
    }, {});
    // Pokaż wybranego użytkownika i obecnego
    newVisibility[username] = true;
    newVisibility[currentUsername] = true;
    setVisibleUsers(newVisibility);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const data = useMemo(() => {
    const datasets = allUsersHistory
      .filter(userHistory => visibleUsers[userHistory.username])
      .map((userHistory, index) => {
        const isCurrentUser = userHistory.username === currentUsername;
        const color = isCurrentUser ? '#e74a3b' : getUserColor(userHistory.username);
        const isHovered = hoveredUser === userHistory.username;

        // Zwiększ szerokość linii gdy użytkownik jest najechany
        let borderWidth = isCurrentUser ? 4 : 2;
        if (isHovered) {
          borderWidth = isCurrentUser ? 8 : 6;
        }

        return {
          label: userHistory.username,
          data: userHistory.positions,
          borderColor: color,
          backgroundColor: 'rgba(78, 115, 223, 0.05)',
          borderWidth: borderWidth,
          tension: 0,
          fill: false,
          spanGaps: true,
          pointRadius: 0,
          pointHoverRadius: 0,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 0
        };
      });

    return {
      labels: gameLabels,
      datasets: datasets
    };
  }, [allUsersHistory, visibleUsers, gameLabels, currentUsername, hoveredUser]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'dataset',
      intersect: false
    },
    scales: {
      y: {
        reverse: true,
        beginAtZero: false,
        ticks: {
          stepSize: 1,
          autoSkip: false,
          callback: function (value) {
            return '#' + value;
          }
        },
        grid: {
          display: true,
          drawBorder: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        title: {
          display: false
        }
      },
      x: {
        title: {
          display: false
        },
        ticks: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        mode: 'dataset',
        intersect: false,
        callbacks: {
          title: function(context) {
            return context[0].dataset.label;
          },
          label: function() {
            return '';
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10,
        cornerRadius: 4,
        titleFont: {
          size: 14,
          weight: 'bold'
        }
      }
    },
    onHover: (event, activeElements) => {
      if (activeElements.length > 0) {
        const datasetIndex = activeElements[0].datasetIndex;
        const username = data.datasets[datasetIndex].label;
        setHoveredUser(username);
      } else {
        setHoveredUser(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Ładowanie...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (!allUsersHistory || allUsersHistory.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        Brak danych historii rankingu. Historia będzie dostępna po rozegraniu kilku meczów.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', position: 'relative', padding: '20px' }}>
      {/* Tytuł */}
      <div className="text-xs fw-bold text-success text-uppercase mb-2">
        📈 Historia pozycji w rankingu
      </div>

      {/* Wykres */}
      <div style={{ width: '100%', height: '300px', position: 'relative' }}>
        <Line data={data} options={options} />
      </div>

      {/* Pole wyszukiwania */}
      <div className="mt-3 mb-2" style={{ maxWidth: '400px', margin: '16px auto 8px auto', position: 'relative' }}>
        <div className="input-group input-group-sm">
          <span className="input-group-text" style={{ backgroundColor: '#f8f9fc', border: '1px solid #d1d3e2' }}>
            <i className="fas fa-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Wyszukaj gracza..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => setShowSuggestions(searchTerm.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            style={{
              fontSize: '0.875rem',
              border: '1px solid #d1d3e2',
              borderLeft: 'none'
            }}
          />
          {searchTerm && (
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => {
                setSearchTerm('');
                setShowSuggestions(false);
              }}
              style={{ fontSize: '0.875rem' }}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Dropdown z podpowiedziami */}
        {showSuggestions && filteredUsers.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #d1d3e2',
              borderRadius: '0.25rem',
              boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              marginTop: '2px'
            }}
          >
            {filteredUsers.slice(0, 10).map((user, index) => {
              const isCurrentUser = user.username === currentUsername;
              const color = isCurrentUser ? '#e74a3b' : getUserColor(user.username);

              return (
                <div
                  key={user.username}
                  onClick={() => handleSelectUser(user.username)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: index < filteredUsers.slice(0, 10).length - 1 ? '1px solid #e3e6f0' : 'none',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <span
                    style={{
                      width: '16px',
                      height: isCurrentUser ? '3px' : '2px',
                      backgroundColor: color,
                      borderRadius: '2px',
                      flexShrink: 0
                    }}
                  ></span>
                  <span style={{ fontSize: '0.875rem', fontWeight: isCurrentUser ? 'bold' : 'normal' }}>
                    {user.username}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Przyciski szybkiego wyboru */}
      <div className="mt-3 mb-2 d-flex flex-wrap gap-2 justify-content-center">
        <button
          onClick={showOnlyMe}
          className="btn btn-sm btn-outline-primary"
          style={{ fontSize: '0.8rem', padding: '4px 10px' }}
        >
          Tylko ja
        </button>
        <button
          onClick={showTop3AndMe}
          className="btn btn-sm btn-outline-primary"
          style={{ fontSize: '0.8rem', padding: '4px 10px' }}
        >
          Top 3 + ja
        </button>
        <button
          onClick={showTop5AndMe}
          className="btn btn-sm btn-outline-primary"
          style={{ fontSize: '0.8rem', padding: '4px 10px' }}
        >
          Top 5 + ja
        </button>
        <button
          onClick={showAll}
          className="btn btn-sm btn-outline-secondary"
          style={{ fontSize: '0.8rem', padding: '4px 10px' }}
        >
          Wszyscy
        </button>
        <button
          onClick={hideAll}
          className="btn btn-sm btn-outline-secondary"
          style={{ fontSize: '0.8rem', padding: '4px 10px' }}
        >
          Ukryj wszystkich
        </button>
      </div>

      {/* Interaktywna legenda */}
      <div className="mt-2 d-flex flex-wrap gap-2 justify-content-center" style={{ maxWidth: '100%' }}>
        {[...allUsersHistory].sort((a, b) => a.username.localeCompare(b.username)).map((user) => {
          const isCurrentUser = user.username === currentUsername;
          const color = isCurrentUser ? '#e74a3b' : getUserColor(user.username);
          const isVisible = visibleUsers[user.username];

          return (
            <button
              key={user.username}
              onClick={() => toggleUser(user.username)}
              onMouseEnter={() => setHoveredUser(user.username)}
              onMouseLeave={() => setHoveredUser(null)}
              className="btn btn-sm d-flex align-items-center gap-2"
              style={{
                backgroundColor: isVisible ? color : '#e3e6f0',
                color: isVisible ? '#fff' : '#858796',
                border: 'none',
                opacity: isVisible ? 1 : 0.5,
                fontWeight: isCurrentUser ? 'bold' : 'normal',
                transition: 'all 0.2s ease',
                padding: '4px 12px',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap'
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: isCurrentUser ? '4px' : '2px',
                  backgroundColor: isVisible ? '#fff' : '#858796',
                  display: 'inline-block',
                  borderRadius: '2px',
                  flexShrink: 0
                }}
              ></span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RankingChart;
