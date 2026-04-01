import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function NestedDonutChart() {
  // Mock data
  const predictedDraws = 5;
  const predictedWins = 18;
  const averagePredictedDraws = 7;
  const averagePredictedWins = 16;
  const actualDraws = 6;
  const actualWins = 17;

  const data = {
    labels: ['Remisy', 'Zwycięstwa'],
    datasets: [
      {
        label: 'Twoje typy',
        data: [predictedDraws, predictedWins],
        backgroundColor: [
          'rgba(246, 194, 62, 0.4)',
          'rgba(28, 200, 138, 0.4)'
        ],
        hoverBackgroundColor: [
          'rgba(246, 194, 62, 0.6)',
          'rgba(28, 200, 138, 0.6)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      },
      {
        label: 'Średnia innych graczy',
        data: [averagePredictedDraws, averagePredictedWins],
        backgroundColor: [
          'rgba(246, 194, 62, 0.7)',
          'rgba(28, 200, 138, 0.7)'
        ],
        hoverBackgroundColor: [
          'rgba(246, 194, 62, 0.85)',
          'rgba(28, 200, 138, 0.85)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      },
      {
        label: 'Rzeczywistość',
        data: [actualDraws, actualWins],
        backgroundColor: [
          'rgba(246, 194, 62, 1)',
          'rgba(28, 200, 138, 1)'
        ],
        hoverBackgroundColor: [
          'rgba(244, 182, 25, 1)',
          'rgba(23, 166, 115, 1)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
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
        labels: {
          generateLabels: function (chart) {
            return [
              {
                text: 'Remisy (Twoje typy)',
                fillStyle: 'rgba(246, 194, 62, 0.4)',
                hidden: false,
                index: 0
              },
              {
                text: 'Remisy (Średnia innych)',
                fillStyle: 'rgba(246, 194, 62, 0.7)',
                hidden: false,
                index: 1
              },
              {
                text: 'Remisy (Rzeczywistość)',
                fillStyle: 'rgba(246, 194, 62, 1)',
                hidden: false,
                index: 2
              },
              {
                text: 'Zwycięstwa (Twoje typy)',
                fillStyle: 'rgba(28, 200, 138, 0.4)',
                hidden: false,
                index: 3
              },
              {
                text: 'Zwycięstwa (Średnia innych)',
                fillStyle: 'rgba(28, 200, 138, 0.7)',
                hidden: false,
                index: 4
              },
              {
                text: 'Zwycięstwa (Rzeczywistość)',
                fillStyle: 'rgba(28, 200, 138, 1)',
                hidden: false,
                index: 5
              }
            ];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const datasetLabel = context.dataset.label || '';
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return datasetLabel + ' - ' + label + ': ' + value + ' (' + percentage + '%)';
          }
        }
      }
    }
  };

  return <Doughnut data={data} options={options} />;
}

export default NestedDonutChart;
