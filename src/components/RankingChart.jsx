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

  const datasets = allUsersHistory.map((userHistory, index) => {
    const isCurrentUser = userHistory.username === currentUsername;
    const color = isCurrentUser ? '#e74a3b' : colors[index % colors.length];

    return {
      label: userHistory.username,
      data: userHistory.positions,
      borderColor: color,
      backgroundColor: 'rgba(78, 115, 223, 0.05)',
      borderWidth: isCurrentUser ? 6 : 2,
      tension: 0,
      fill: false,
      pointRadius: isCurrentUser ? 6 : 3,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: isCurrentUser ? 2 : 1,
      pointHoverRadius: isCurrentUser ? 8 : 5
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

  return <Line data={data} options={options} height={300} />;
}

export default RankingChart;
