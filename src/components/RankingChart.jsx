import { useState } from 'react';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function RankingChart() {
  const currentUsername = 'Maria Szarek';

  // Mock data - dane wszystkich użytkowników
  const allUsersHistory = [
    {
      username: 'Jan Kowalski',
      positions: [2, 1, 1, 2, 3, 1]
    },
    {
      username: 'Maria Szarek',
      positions: [1, 2, 3, 1, 2, 2]
    },
    {
      username: 'Piotr Nowak',
      positions: [3, 3, 2, 3, 1, 3]
    },
    {
      username: 'Anna Wiśniewska',
      positions: [5, 5, 6, 5, 4, 8]
    }
  ];

  const gameLabels = ['POL-GER', 'ESP-FRA', 'ITA-POR', 'ENG-BRA', 'NED-ARG', 'BEL-CRO'];

  const colors = [
    '#4e73df', // blue
    '#1cc88a', // green
    '#36b9cc', // cyan
    '#f6c23e', // yellow
    '#fd7e14', // orange
    '#6610f2', // indigo
    '#6f42c1', // purple
    '#e83e8c', // pink
    '#20c9a6', // teal
    '#858796'  // secondary
  ];

  // State do zarządzania widocznością użytkowników
  const [visibleUsers, setVisibleUsers] = useState(
    allUsersHistory.reduce((acc, user) => {
      acc[user.username] = true;
      return acc;
    }, {})
  );

  const toggleUser = (username) => {
    setVisibleUsers(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  const datasets = allUsersHistory
    .filter(userHistory => visibleUsers[userHistory.username])
    .map((userHistory, index) => {
      const isCurrentUser = userHistory.username === currentUsername;
      const originalIndex = allUsersHistory.findIndex(u => u.username === userHistory.username);
      const color = isCurrentUser ? '#e74a3b' : colors[originalIndex % colors.length];

      return {
        label: userHistory.username,
        data: userHistory.positions,
        borderColor: color,
        backgroundColor: 'rgba(78, 115, 223, 0.05)',
        borderWidth: isCurrentUser ? 4 : 2,
        tension: 0.1,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 0
      };
    });

  const data = {
    labels: gameLabels,
    datasets: datasets
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      axis: 'x',
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
          display: true,
          text: 'Pozycja w rankingu'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Mecze'
        },
        ticks: {
          maxRotation: 90,
          minRotation: 90
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function (context) {
            return context[0].label;
          },
          label: function (context) {
            return '#' + context.parsed.y + ' - ' + context.dataset.label;
          }
        }
      }
    }
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Interaktywna legenda */}
      <div className="mb-3 d-flex flex-wrap gap-2 justify-content-center" style={{ maxWidth: '100%' }}>
        {allUsersHistory.map((user, index) => {
          const isCurrentUser = user.username === currentUsername;
          const color = isCurrentUser ? '#e74a3b' : colors[index % colors.length];
          const isVisible = visibleUsers[user.username];

          return (
            <button
              key={user.username}
              onClick={() => toggleUser(user.username)}
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

      {/* Wykres */}
      <div style={{ width: '100%', height: '300px', position: 'relative' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

export default RankingChart;
