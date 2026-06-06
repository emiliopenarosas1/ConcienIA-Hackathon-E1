import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

/* ── Paleta por material ────────────────────────────────────────────────────── */
const TIPO_HEX = {
  PET:          '#2563A8',
  Organico:     '#497A3F',
  Aluminio:     '#D97706',
  Vidrio:       '#0891B2',
  Carton:       '#7C3900',
  NoReciclable: '#8C2B1F',
};
const TIPO_LABEL = {
  PET:          'PET / Plástico',
  Organico:     'Orgánico',
  Aluminio:     'Aluminio',
  Vidrio:       'Vidrio',
  Carton:       'Cartón',
  NoReciclable: 'No reciclable',
};

/* ── Helpers visuales ───────────────────────────────────────────────────────── */

function SectionTitle({ children }) {
  return (
    <p style={{
      fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '.07em', color: 'var(--text-3)', marginBottom: '.6rem',
    }}>
      {children}
    </p>
  );
}

function KpiCard({ label, value, unit, color = 'var(--green-400)' }) {
  return (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color, fontSize: '1.5rem' }}>{value}</div>
      <div className="stat-card-unit">{unit}</div>
    </div>
  );
}

/* Barra horizontal etiquetada */
function BarH({ label, value, max, color, suffix = 'kg', decimals = 1 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fmt = typeof value === 'number' ? value.toFixed(decimals) : value;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.4rem' }}>
      <div style={{ width: 120, fontSize: '.75rem', color: 'var(--text-2)', textAlign: 'right', flexShrink: 0, lineHeight: 1.2 }}>
        {label}
      </div>
      <div style={{ flex: 1, background: 'var(--cream-200)', borderRadius: 4, height: 13, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 4,
          transition: 'width .55s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
      <div style={{ width: 76, fontSize: '.75rem', color: 'var(--text-2)', flexShrink: 0, textAlign: 'right' }}>
        {fmt} {suffix}
      </div>
    </div>
  );
}

/* Barras verticales — historial global */
function BarVChart({ items, height = 140 }) {
  if (!items.length) return null;
  const max   = Math.max(...items.map(d => d.value), 1);
  const inner = height - 28;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height, padding: '0 .25rem' }}>
      {items.map((d, i) => {
        const h = Math.max(4, (d.value / max) * inner);
        return (
          <div
            key={i}
            title={`${d.label}: ${d.value.toFixed(1)} kg`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'default' }}
          >
            <span style={{ fontSize: '.6rem', color: 'var(--text-3)', lineHeight: 1 }}>
              {d.value > 0 ? d.value.toFixed(0) : ''}
            </span>
            <div style={{
              width: '100%', height: h,
              background: d.active ? 'var(--green-600)' : d.color || 'var(--green-300)',
              borderRadius: '3px 3px 0 0',
              transition: 'height .5s ease',
            }} />
            <span style={{
              fontSize: '.58rem', color: 'var(--text-3)', lineHeight: 1.1,
              textAlign: 'center', width: '100%',
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Donut SVG multi-segmento */
function Donut({ slices, size = 112, strokeW = 15 }) {
  const r    = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2;
  const cy   = size / 2;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* pista vacía */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--cream-200)" strokeWidth={strokeW} />
      {slices.filter(s => s.pct > 0).map((s, i) => {
        const dash = (s.pct / 100) * circ;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeW - 2}
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={-acc}
            transform={`rotate(-90, ${cx}, ${cy})`}
            strokeLinecap="butt"
          />
        );
        acc += dash;
        return el;
      })}
    </svg>
  );
}

/* Mini leyenda de color */
function Legend({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', marginTop: '.5rem' }}>
      {items.map(it => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.76rem', color: 'var(--text-2)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: it.color, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{it.label}</span>
          {it.value !== undefined && (
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{it.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────────────────────── */
export default function AdminAnalytics() {
  const [historial,  setHistorial]  = useState([]);
  const [eventoId,   setEventoId]   = useState('');
  const [conteo,     setConteo]     = useState(null);
  const [loadingH,   setLoadingH]   = useState(true);
  const [loadingC,   setLoadingC]   = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    api.getHistorial()
      .then(data => {
        setHistorial(data);
        if (data.length > 0) {
          const first = data.find(e => (e.registros_count || 0) > 0) || data[0];
          setEventoId(String(first.id));
          cargarConteo(first.id);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingH(false));
  }, []);

  const cargarConteo = (id) => {
    setLoadingC(true);
    setConteo(null);
    setError('');
    api.getConteo(Number(id))
      .then(setConteo)
      .catch(e => setError(e.message))
      .finally(() => setLoadingC(false));
  };

  const handleEvento = (id) => {
    setEventoId(id);
    if (id) cargarConteo(id);
  };

  /* Métricas globales */
  const totalBolsasGlobal = historial.reduce((s, e) => s + (e.bolsas_registradas || 0), 0);
  const totalReg          = historial.reduce((s, e) => s + (e.registros_count || 0), 0);
  const evConDatos        = historial.filter(e => (e.registros_count || 0) > 0).length;

  /* Barras verticales: últimos 10 eventos (usa bolsas_registradas) */
  const barGlobal = historial.slice(0, 10).reverse().map(e => ({
    label:  e.nombre.length > 10 ? e.nombre.slice(0, 9) + '…' : e.nombre,
    value:  e.bolsas_registradas || 0,
    active: String(e.id) === eventoId,
  }));

  /* Datos del evento seleccionado */
  const desglose     = conteo?.desglose || [];
  const totalBolsas  = desglose.reduce((s, d) => s + d.bolsas, 0);
  const recBolsas    = desglose.filter(d => d.reciclable).reduce((s, d) => s + d.bolsas, 0);
  const noRecBolsas  = totalBolsas - recBolsas;
  const recPct       = totalBolsas > 0 ? (recBolsas    / totalBolsas) * 100 : 0;
  const noRecPct     = totalBolsas > 0 ? (noRecBolsas  / totalBolsas) * 100 : 0;
  const hasConteo    = conteo && totalBolsas > 0;
  const r            = conteo?.resumen;


  return (
    <div>
      <div className="admin-page-header">
        <h1>Analítica de residuos</h1>
        <p>Datos reales de campo procesados por el modelo Contar — bolsas, kg, reciclaje e impacto</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* ── Resumen global ──────────────────────────────────────────────────── */}
      <SectionTitle>Acumulado global</SectionTitle>
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <KpiCard
          label="Eventos con datos"
          value={evConDatos}
          unit={`de ${historial.length} registrados`}
        />
        <KpiCard
          label="Bolsas recolectadas"
          value={totalBolsasGlobal.toLocaleString('es-MX')}
          unit="captadas en campo"
          color="var(--green-600)"
        />
        <KpiCard
          label="Sesiones de registro"
          value={totalReg}
          unit="por intendentes"
          color="#0891B2"
        />
      </div>

      {/* Tendencia de bolsas por evento */}
      {barGlobal.length > 1 && (
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <div className="card-header">
            <h2>Bolsas registradas por evento</h2>
            <span className="text-sm text-muted">últimos {barGlobal.length} · barra resaltada = seleccionado</span>
          </div>
          <div style={{ padding: '1rem 1.25rem .75rem' }}>
            <BarVChart items={barGlobal} height={148} />
          </div>
        </div>
      )}

      {/* ── Selector de evento ──────────────────────────────────────────────── */}
      <SectionTitle>Análisis detallado por evento</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        {loadingH ? (
          <div className="spinner-page" style={{ height: 44 }}><div className="spinner" /></div>
        ) : (
          <select
            className="form-select"
            style={{ maxWidth: 460 }}
            value={eventoId}
            onChange={e => handleEvento(e.target.value)}
          >
            <option value="">— Selecciona un evento —</option>
            {historial.map(e => (
              <option key={e.id} value={e.id}>
                {e.nombre}
                {e.registros_count ? ` · ${e.bolsas_registradas || 0} bolsas · ${e.registros_count} sesiones` : ' · sin datos de campo'}
              </option>
            ))}
          </select>
        )}
        {loadingC && <div className="spinner" />}
      </div>

      {/* Sin datos */}
      {!loadingC && conteo && !hasConteo && (
        <div className="empty-state" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', margin: '0 0 1.5rem' }}>
          <div className="empty-state-icon">☷</div>
          <h3>Sin registros de campo</h3>
          <p>Este evento aún no tiene sesiones de limpieza registradas por los intendentes</p>
        </div>
      )}

      {hasConteo && (
        <>
          {/* KPIs del evento */}
          <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
            <KpiCard
              label="Bolsas recolectadas"
              value={totalBolsas.toLocaleString('es-MX')}
              unit="en campo para este evento"
              color="var(--green-600)"
            />
            <KpiCard
              label="Reciclable"
              value={recPct.toFixed(0) + '%'}
              unit={recBolsas + ' bolsas aprovechables'}
              color="#2563A8"
            />
            <KpiCard
              label="No reciclable"
              value={noRecPct.toFixed(0) + '%'}
              unit={noRecBolsas + ' bolsas a relleno'}
              color="var(--red)"
            />
            <KpiCard
              label="Ingreso potencial"
              value={'$' + (r?.ingreso_esperado_mxn || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
              unit="MXN en recicladoras"
              color="#D97706"
            />
            <KpiCard
              label="Camiones estimados"
              value={r?.camiones_estimados || 0}
              unit="compactadores necesarios"
              color="var(--text-3)"
            />
          </div>

          {/* Composición + Bolsas por tipo */}
          <div className="analytics-row" style={{ marginBottom: '1.25rem' }}>

            {/* Donut reciclable vs no reciclable */}
            <div className="card analytics-card-donut">
              <h2 style={{ fontSize: '.875rem', marginBottom: '.75rem' }}>Composición</h2>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Donut
                  slices={[
                    { pct: recPct,    color: 'var(--green-500)' },
                    { pct: noRecPct,  color: 'var(--red)' },
                  ]}
                  size={112} strokeW={16}
                />
              </div>
              <Legend items={[
                { label: 'Reciclable',    color: 'var(--green-500)', value: recPct.toFixed(0) + '%' },
                { label: 'No reciclable', color: 'var(--red)',       value: noRecPct.toFixed(0) + '%' },
              ]} />
            </div>

            {/* Donut por material (% sobre bolsas) */}
            <div className="card analytics-card-donut">
              <h2 style={{ fontSize: '.875rem', marginBottom: '.75rem' }}>Por material</h2>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Donut
                  slices={desglose.map(d => ({
                    pct:   totalBolsas > 0 ? (d.bolsas / totalBolsas) * 100 : 0,
                    color: TIPO_HEX[d.tipo] || '#888',
                  }))}
                  size={112} strokeW={16}
                />
              </div>
              <Legend items={desglose.slice(0, 4).map(d => ({
                label: TIPO_LABEL[d.tipo] || d.tipo,
                color: TIPO_HEX[d.tipo] || '#888',
                value: totalBolsas > 0 ? ((d.bolsas / totalBolsas) * 100).toFixed(0) + '%' : '0%',
              }))} />
            </div>

            {/* Bolsas por tipo — barra principal */}
            <div className="card" style={{ padding: '1rem 1.25rem', flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '.875rem', marginBottom: '1rem' }}>Bolsas por material</h2>
              {desglose.map(d => (
                <BarH
                  key={d.tipo}
                  label={TIPO_LABEL[d.tipo] || d.tipo}
                  value={d.bolsas}
                  max={desglose[0]?.bolsas || 1}
                  color={TIPO_HEX[d.tipo] || '#888'}
                  suffix="bol."
                  decimals={0}
                />
              ))}
            </div>
          </div>

          {/* Zonas más activas */}
          {conteo.zonas.length > 0 && (
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '.875rem', marginBottom: '1rem' }}>Zonas con mayor volumen de bolsas</h2>
              {(() => {
                const maxBol = Math.max(...conteo.zonas.map(z => z.bolsas), 1);
                const totBol = conteo.zonas.reduce((s, z) => s + z.bolsas, 0);
                return conteo.zonas.map(z => (
                  <div key={z.zona}>
                    <BarH
                      label={z.zona}
                      value={z.bolsas}
                      max={maxBol}
                      color="var(--green-500)"
                      suffix="bol."
                      decimals={0}
                    />
                    <div style={{ marginLeft: 126, fontSize: '.7rem', color: 'var(--text-3)', marginTop: '-.25rem', marginBottom: '.5rem' }}>
                      predomina: <strong>{TIPO_LABEL[z.tipo_predominante] || z.tipo_predominante}</strong>
                      {totBol > 0 && ` · ${((z.bolsas / totBol) * 100).toFixed(1)}% del total`}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* ── Huella de carbono ──────────────────────────────────────────── */}
          {r && r.huella_carbono_kg > 0 && (
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '.875rem', marginBottom: '1rem' }}>Huella de carbono (residuos no reciclables)</h2>

              <div className="stat-grid" style={{ marginBottom: '1rem' }}>
                <KpiCard
                  label="CO₂ generado estimado"
                  value={(r.huella_carbono_kg / 1000).toFixed(3)}
                  unit="ton CO₂eq — residuos a relleno"
                  color="var(--red)"
                />
                <KpiCard
                  label="Equivale a"
                  value={Math.round(r.huella_carbono_kg / 145)}
                  unit="vuelos CDMX–MTY"
                  color="var(--orange)"
                />
                <KpiCard
                  label="Árboles para compensar"
                  value={Math.round(r.huella_carbono_kg / 22).toLocaleString('es-MX')}
                  unit="árboles durante 1 año"
                  color="var(--green-600)"
                />
              </div>

              {/* Barra visual de impacto */}
              <div style={{ marginBottom: '.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--text-3)', marginBottom: '.3rem' }}>
                  <span>Impacto CO₂ — no reciclables vs total bolsas</span>
                  <span>{noRecPct.toFixed(0)}% del flujo va a relleno</span>
                </div>
                <div style={{ background: 'var(--cream-200)', borderRadius: 6, height: 18, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${recPct}%`, height: '100%', background: 'var(--green-400)' }} title={`${recPct.toFixed(0)}% reciclable`} />
                  <div style={{ width: `${noRecPct}%`, height: '100%', background: 'var(--red)' }} title={`${noRecPct.toFixed(0)}% no reciclable`} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '.4rem', fontSize: '.72rem', color: 'var(--text-3)' }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--green-400)', marginRight: 4, verticalAlign: 'middle' }} />Reciclable — 0 CO₂ (no va a relleno)</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--red)', marginRight: 4, verticalAlign: 'middle' }} />No reciclable — genera CO₂ en relleno</span>
                </div>
              </div>

              <p style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: '.5rem' }}>
                Incrementar la tasa de reciclaje reduce directamente este impacto. Por cada 10% más de bolsas correctamente recicladas, la huella disminuye proporcionalmente.
              </p>
            </div>
          )}

          {/* CO₂ acumulado en trend global */}
          {historial.some(e => e.huella_carbono_kg > 0) && (
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
              <div className="card-header" style={{ padding: 0, border: 'none', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '.875rem' }}>Tendencia CO₂ estimado por evento</h2>
                <span className="text-sm text-muted">basado en proyección del Estimador</span>
              </div>
              <BarVChart
                items={historial.slice(0, 10).reverse().map(e => ({
                  label:  e.nombre.length > 10 ? e.nombre.slice(0, 9) + '…' : e.nombre,
                  value:  e.huella_carbono_kg || 0,
                  active: String(e.id) === eventoId,
                  color:  'var(--red)',
                }))}
                height={130}
              />
              <p style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: '.25rem' }}>
                Valores en kg CO₂eq · basados en la estimación del Modelo Estimador al crear cada evento
              </p>
            </div>
          )}

          {/* Ingresos por recicladora */}
          {conteo.ingresos_desglosados.length > 0 && (
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <h2 style={{ fontSize: '.875rem', marginBottom: '1rem' }}>Ingresos potenciales por recicladora</h2>
              {conteo.ingresos_desglosados.map(rec => {
                const maxMxn = conteo.ingresos_desglosados[0].total_mxn || 1;
                const pct    = (rec.total_mxn / maxMxn) * 100;
                return (
                  <div key={rec.recicladora} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.25rem' }}>
                      <span style={{ fontSize: '.85rem', fontWeight: 600 }}>{rec.recicladora}</span>
                      <span style={{ fontSize: '.85rem', color: '#D97706', fontWeight: 700 }}>
                        ${rec.total_mxn.toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN
                      </span>
                    </div>
                    <div style={{ background: 'var(--cream-200)', borderRadius: 4, height: 10, overflow: 'hidden', marginBottom: '.3rem' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#D97706', borderRadius: 4, transition: 'width .55s ease' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                      {rec.materiales.map(m => (
                        <span key={m.material} style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: TIPO_HEX[m.material] || '#888', marginRight: 3, verticalAlign: 'middle' }} />
                          {TIPO_LABEL[m.material] || m.material}: ${m.mxn.toFixed(0)} MXN
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
