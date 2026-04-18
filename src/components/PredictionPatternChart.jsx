import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Card, Alert } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { resultsApi } from '../services/api';
import { useLeague } from '../contexts/LeagueContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function PredictionPatternChart() {
  const { selectedLeague } = useLeague();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedLeague) return;

      try {
        setLoading(true);
        const response = await resultsApi.getPredictionPatternStats(selectedLeague.id);
        setStats(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching prediction pattern stats:', err);
        setError('Nie udało się załadować statystyk');
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedLeague]);

  if (loading) {
    return (
      <Card className="shadow mb-4">
        <Card.Body className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="shadow mb-4">
        <Card.Body>
          <Alert variant="warning">
            {error || 'Brak danych do wyświetlenia'}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // Oblicz procenty
  const calculatePercentage = (value, total) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const myDrawPercent = calculatePercentage(stats.myDraws, stats.totalGames);
  const myWinPercent = calculatePercentage(stats.myWins, stats.totalGames);

  const othersDrawPercent = calculatePercentage(stats.othersDraws, stats.totalGames);
  const othersWinPercent = calculatePercentage(stats.othersWins, stats.totalGames);

  const actualDrawPercent = calculatePercentage(stats.actualDraws, stats.totalGames);
  const actualWinPercent = calculatePercentage(stats.actualWins, stats.totalGames);

  // Generuj sugestie
  const generateSuggestions = () => {
    const suggestions = [];

    // Analiza remisów
    const drawDiff = myDrawPercent - actualDrawPercent;
    if (Math.abs(drawDiff) > 10) {
      if (drawDiff > 0) {
        suggestions.push({
          type: 'warning',
          icon: '⚠️',
          text: `Typujesz ${Math.abs(drawDiff)}% więcej remisów niż rzeczywiste wyniki. Rozważ mniej typów remisowych.`
        });
      } else {
        suggestions.push({
          type: 'info',
          icon: '💡',
          text: `Typujesz ${Math.abs(drawDiff)}% mniej remisów niż rzeczywiste wyniki. Może warto częściej typować remisy?`
        });
      }
    }

    // Analiza wygranych (łącznie)
    const winDiff = myWinPercent - actualWinPercent;
    if (Math.abs(winDiff) > 10) {
      if (winDiff > 0) {
        suggestions.push({
          type: 'warning',
          icon: '🏆',
          text: `Zbyt często typujesz wygrane (+${Math.abs(winDiff)}% vs rzeczywistość). Może warto więcej remisów?`
        });
      } else {
        suggestions.push({
          type: 'info',
          icon: '🏆',
          text: `Za rzadko typujesz wygrane (-${Math.abs(winDiff)}% vs rzeczywistość). Może warto mniej remisów?`
        });
      }
    }

    // Porównanie z innymi graczami
    const drawDiffVsOthers = myDrawPercent - othersDrawPercent;
    if (Math.abs(drawDiffVsOthers) > 15) {
      if (drawDiffVsOthers > 0) {
        suggestions.push({
          type: 'info',
          icon: '👥',
          text: `Typujesz ${Math.abs(drawDiffVsOthers)}% więcej remisów niż średnia innych graczy.`
        });
      } else {
        suggestions.push({
          type: 'info',
          icon: '👥',
          text: `Typujesz ${Math.abs(drawDiffVsOthers)}% mniej remisów niż średnia innych graczy.`
        });
      }
    }

    // Jeśli wszystko OK
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'success',
        icon: '✅',
        text: 'Twój profil typowania jest zbliżony do rzeczywistości - świetna robota!'
      });
    }

    return suggestions;
  };

  const suggestions = generateSuggestions();

  const data = {
    labels: ['Remisy', 'Zwycięstwa'],
    datasets: [
      {
        label: 'Twoje typy',
        data: [stats.myDraws, stats.myWins],
        backgroundColor: 'rgba(78, 115, 223, 0.8)',
        borderColor: 'rgba(78, 115, 223, 1)',
        borderWidth: 1
      },
      {
        label: 'Średnia innych',
        data: [stats.othersDraws, stats.othersWins],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Rzeczywistość',
        data: [stats.actualDraws, stats.actualWins],
        backgroundColor: 'rgba(40, 167, 69, 0.8)',
        borderColor: 'rgba(40, 167, 69, 1)',
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 12
          },
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            const percentage = calculatePercentage(value, stats.totalGames);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 2
        },
        title: {
          display: true,
          text: 'Liczba meczów'
        }
      },
      x: {
        title: {
          display: false
        }
      }
    }
  };

  return (
    <div>
      {/* Wykres */}
      <Card className="shadow mb-4">
        <Card.Header className="py-3">
          <h6 className="m-0 fw-bold text-primary">
            📊 Twój profil typowania vs Rzeczywistość
          </h6>
        </Card.Header>
        <Card.Body>
          <div style={{ height: '300px', marginBottom: '20px' }}>
            <Bar data={data} options={options} />
          </div>

          {/* Statystyki procentowe */}
          <div className="row text-center mb-3">
            <div className="col-6">
              <div className="p-3 border rounded">
                <div className="text-muted small mb-1">⚖️ Remisy</div>
                <div className="fw-bold fs-4" style={{ color: 'rgba(78, 115, 223, 1)' }}>
                  {myDrawPercent}%
                </div>
                <div className="small text-muted">vs {actualDrawPercent}% rzeczywistość</div>
                <div className="small mt-1" style={{ color: 'rgba(54, 162, 235, 1)' }}>
                  Inni: {othersDrawPercent}%
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="p-3 border rounded">
                <div className="text-muted small mb-1">🏆 Zwycięstwa</div>
                <div className="fw-bold fs-4" style={{ color: 'rgba(78, 115, 223, 1)' }}>
                  {myWinPercent}%
                </div>
                <div className="small text-muted">vs {actualWinPercent}% rzeczywistość</div>
                <div className="small mt-1" style={{ color: 'rgba(54, 162, 235, 1)' }}>
                  Inni: {othersWinPercent}%
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Sugestie */}
      <Card className="shadow mb-4">
        <Card.Header className="py-3">
          <h6 className="m-0 fw-bold text-success">
            💡 Sugestie jak ulepszyć swoje typy
          </h6>
        </Card.Header>
        <Card.Body>
          {suggestions.map((suggestion, index) => (
            <Alert
              key={index}
              variant={
                suggestion.type === 'success'
                  ? 'success'
                  : suggestion.type === 'warning'
                  ? 'warning'
                  : 'info'
              }
              className="mb-2"
            >
              <strong>{suggestion.icon}</strong> {suggestion.text}
            </Alert>
          ))}
        </Card.Body>
      </Card>
    </div>
  );
}

export default PredictionPatternChart;
