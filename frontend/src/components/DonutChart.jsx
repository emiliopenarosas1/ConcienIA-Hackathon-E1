import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const MAT_COLORS = {
  PET:           'hsl(210,80%,58%)',
  Organico:      'hsl(128,55%,42%)',
  Aluminio:      'hsl(44,90%,52%)',
  Vidrio:        'hsl(280,55%,62%)',
  Carton:        'hsl(28,72%,52%)',
  NoReciclable:  'hsl(0,45%,50%)',
};

const MAT_LABELS = {
  PET:          'PET',
  Organico:     'Orgánico',
  Aluminio:     'Aluminio',
  Vidrio:       'Vidrio',
  Carton:       'Cartón',
  NoReciclable: 'No Reciclable',
};

export default function DonutChart({ residuos }) {
  const mats = Object.keys(MAT_COLORS).filter(m => (residuos[`kg_${m}`] || 0) > 0);
  const vals = mats.map(m => residuos[`kg_${m}`] || 0);
  const total = vals.reduce((a, b) => a + b, 0);

  const data = {
    labels: mats.map(m => MAT_LABELS[m]),
    datasets: [{
      data: vals,
      backgroundColor: mats.map(m => MAT_COLORS[m]),
      borderColor: 'hsl(158,15%,6%)',
      borderWidth: 3,
      hoverBorderWidth: 4,
      hoverOffset: 8,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'hsl(0,0%,70%)',
          font: { family: 'Inter', size: 12 },
          padding: 14,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const kg = ctx.parsed;
            const pct = total > 0 ? ((kg / total) * 100).toFixed(1) : 0;
            return ` ${(kg / 1000).toFixed(2)} ton (${pct}%)`;
          },
        },
        backgroundColor: 'hsl(158,12%,12%)',
        borderColor: 'hsla(158,30%,70%,0.15)',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: 'hsl(0,0%,70%)',
        padding: 12,
        cornerRadius: 10,
      },
    },
  };

  return (
    <div style={{ position: 'relative', height: '240px' }}>
      <Doughnut data={data} options={options} />
      <div style={{
        position: 'absolute',
        top: '50%', left: '32%',
        transform: 'translate(-50%,-50%)',
        textAlign: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
          {(total / 1000).toFixed(1)}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'hsl(0,0%,55%)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          toneladas
        </div>
      </div>
    </div>
  );
}
