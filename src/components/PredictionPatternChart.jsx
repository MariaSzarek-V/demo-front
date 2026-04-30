import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Card } from 'react-bootstrap';
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
          <p className="text-muted mb-0">{error || 'Brak danych do wyświetlenia'}</p>
        </Card.Body>
      </Card>
    );
  }

  const myDrawPercent = stats.myDrawPercent ?? 0;
  const myWinPercent = stats.myWinPercent ?? 0;
  const othersDrawPercent = stats.othersDrawPercent ?? 0;
  const othersWinPercent = stats.othersWinPercent ?? 0;
  const actualDrawPercent = stats.actualDrawPercent ?? 0;
  const actualWinPercent = stats.actualWinPercent ?? 0;

  const data = {
    labels: ['Remisy', 'Zwycięstwa'],
    datasets: [
      {
        label: 'Średnia innych',
        data: [othersDrawPercent, othersWinPercent],
        backgroundColor: 'rgba(6, 182, 212, 0.6)',
        borderColor: 'rgba(6, 182, 212, 1)',
        borderWidth: 1
      },
      {
        label: 'Twoje typy',
        data: [myDrawPercent, myWinPercent],
        backgroundColor: 'rgba(8, 145, 178, 0.85)',
        borderColor: 'rgba(8, 145, 178, 1)',
        borderWidth: 1
      },
      {
        label: 'Wyniki meczów',
        data: [actualDrawPercent, actualWinPercent],
        backgroundColor: 'rgba(28, 200, 138, 0.8)',
        borderColor: 'rgba(28, 200, 138, 1)',
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
        position: 'bottom',
        labels: { font: { size: 12 }, padding: 15 }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y ?? 0;
            let extra = '';
            if (label === 'Twoje typy') extra = ` (${stats.myTotal} typów)`;
            else if (label === 'Wyniki meczów') extra = ` (${stats.actualTotal} meczów)`;
            else if (label === 'Średnia innych') extra = ` (${stats.othersPlayerCount} graczy)`;
            return `${label}: ${value}%${extra}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 10, callback: (v) => `${v}%` },
        title: { display: false }
      },
      x: { title: { display: false } }
    }
  };

  return (
    <Card className="border-start border-primary border-4 shadow mb-4">
      <Card.Header className="py-3">
        <h6 className="m-0 fw-bold text-primary text-uppercase">
          📊 Twoje typy vs wyniki meczów vs typy innych graczy
        </h6>
      </Card.Header>
      <Card.Body>
        <div style={{ height: '300px' }}>
          <Bar data={data} options={options} />
        </div>
      </Card.Body>
    </Card>
  );
}

export default PredictionPatternChart;
