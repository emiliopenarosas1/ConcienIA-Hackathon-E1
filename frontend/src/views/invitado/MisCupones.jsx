import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

const PUNTOS_CUPON = 3;

const CATEGORIAS = [
  { id: 'evento_futuro', icon: '🎫', label: 'Eventos Futuros',    desc: 'Descuentos en tu próxima entrada' },
  { id: 'alimentos',     icon: '🍔', label: 'Alimentos',          desc: 'Comida y bebidas en el evento'    },
  { id: 'merch',         icon: '👕', label: 'Merch',              desc: 'Artículos y recuerdos del evento' },
  { id: 'descuento',     icon: '🏷️', label: 'Descuentos',         desc: 'Beneficios inmediatos en el recinto' },
];

const TIPO_COLOR = { porcentaje: 'var(--green-600)', monto: 'var(--blue)', acceso: 'var(--orange)' };

function valorLabel(c) {
  if (c.tipo_descuento === 'acceso')     return 'Gratis';
  if (c.tipo_descuento === 'porcentaje') return `${c.valor}%`;
  return `$${c.valor}`;
}

function CuponCard({ cupon, onCanjear, canjeando, bloqueado, sesion }) {
  const pos    = (sesion?.registros_count || 0) % PUNTOS_CUPON;
  const faltan = pos === 0 ? PUNTOS_CUPON : PUNTOS_CUPON - pos;

  return (
    <div className="inv-cupon-card">
      <div
        className="inv-cupon-left"
        style={{ background: TIPO_COLOR[cupon.tipo_descuento] || 'var(--green-600)' }}
      >
        <div className="inv-cupon-valor">{valorLabel(cupon)}</div>
        <div className="inv-cupon-tipo">
          {cupon.tipo_descuento === 'acceso' ? 'Acceso' : 'Descuento'}
        </div>
      </div>

      <div className="inv-cupon-right">
        <div className="inv-cupon-nombre">{cupon.nombre}</div>
        {cupon.descripcion && (
          <div className="inv-cupon-evento">{cupon.descripcion}</div>
        )}
        <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', marginTop: '.35rem' }}>
          {cupon.evento_nombre && (
            <span className="badge badge-gray" style={{ fontSize: '.68rem' }}>{cupon.evento_nombre}</span>
          )}
          {cupon.evento_fecha && (
            <span className="badge badge-gray">{cupon.evento_fecha?.slice(0, 10)}</span>
          )}
          {cupon.evento_venue && !cupon.evento_nombre && (
            <span className="badge badge-gray" style={{ fontSize: '.65rem' }}>{cupon.evento_venue}</span>
          )}
        </div>

        {!bloqueado ? (
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: '.6rem' }}
            disabled={canjeando === cupon.id}
            onClick={() => onCanjear(cupon.id)}
          >
            {canjeando === cupon.id ? 'Canjeando...' : 'Canjear cupón'}
          </button>
        ) : (
          <div className="inv-cupon-locked">
            🔒 {faltan} basura{faltan !== 1 ? 's' : ''} más para desbloquear
          </div>
        )}
      </div>
    </div>
  );
}

export default function MisCupones({ sessionId, count }) {
  const [cupones,    setCupones]    = useState([]);
  const [sesion,     setSesion]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [categoria,  setCategoria]  = useState(null); // null = mostrando selector
  const [canjeando,  setCanjeando]  = useState(null);
  const [codigo,     setCodigo]     = useState(null);
  const [error,      setError]      = useState('');

  const cargar = async () => {
    setLoading(true);
    const [cups, ses] = await Promise.all([
      api.getCupones(),
      api.invitadoSesion(sessionId),
    ]);
    setCupones(cups);
    setSesion(ses);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [sessionId]);

  const handleCanjear = async (cuponId) => {
    setCanjeando(cuponId);
    setError('');
    try {
      const data = await api.invitadoCanjear({ session_id: sessionId, cupon_id: cuponId });
      setCodigo(data);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCanjeando(null);
    }
  };

  if (loading) return <div className="spinner-page"><div className="spinner" /></div>;

  const ganados     = sesion?.cupones_ganados    || 0;
  const canjeados   = sesion?.cupones_canjeados  || 0;
  const disponibles = ganados - canjeados;
  const bloqueado   = disponibles <= 0;

  // ── Código canjeado ─────────────────────────────────────────────────────────
  if (codigo) {
    const cat = CATEGORIAS.find(c => c.id === codigo.cupon?.categoria);
    return (
      <div>
        <div className="admin-page-header">
          <h1>Mis Cupones</h1>
        </div>
        <div className="card" style={{ borderColor: 'var(--green-300)' }}>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.35rem' }}>🎉</div>
            <h2 style={{ color: 'var(--green-700)', marginBottom: '.25rem' }}>¡Cupón canjeado!</h2>
            {cat && (
              <p style={{ fontSize: '.85rem', color: 'var(--text-3)', marginBottom: '.5rem' }}>
                {cat.icon} {cat.label}
              </p>
            )}
            <p style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '.75rem' }}>
              {codigo.cupon?.nombre}
            </p>
            <div className="inv-cupon-code">{codigo.codigo}</div>
            <p style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: '.6rem' }}>
              Muestra este código al ingresar al evento o al canjear en el stand.<br />
              <strong>Toma una captura de pantalla.</strong>
            </p>
            <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setCodigo(null)}>
                Ver más cupones
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Header común ────────────────────────────────────────────────────────────
  const header = (
    <div className="admin-page-header">
      <h1>Mis Cupones</h1>
      <p>
        {disponibles > 0
          ? `Tienes ${disponibles} cupón${disponibles !== 1 ? 'es' : ''} para canjear — ¡elige tu beneficio!`
          : 'Registra 3 basuras para ganar un cupón'}
      </p>
    </div>
  );

  // ── Selector de categoría ────────────────────────────────────────────────────
  if (!categoria) {
    return (
      <div>
        {header}

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
          {CATEGORIAS.map(cat => {
            const tiene = cupones.some(c => c.categoria === cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setCategoria(cat.id)}
                disabled={!tiene}
                style={{
                  background: 'var(--surface)',
                  border: `2px solid ${bloqueado ? 'var(--cream-300)' : 'var(--green-200)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem .75rem',
                  textAlign: 'center',
                  cursor: tiene ? 'pointer' : 'not-allowed',
                  opacity: tiene ? 1 : 0.4,
                  transition: 'border-color 150ms, box-shadow 150ms',
                  boxShadow: 'var(--shadow-xs)',
                }}
                onMouseOver={e => { if (tiene) e.currentTarget.style.borderColor = 'var(--green-400)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = bloqueado ? 'var(--cream-300)' : 'var(--green-200)'; }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '.3rem' }}>{cat.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '.875rem', color: 'var(--text)' }}>{cat.label}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: '.15rem' }}>{cat.desc}</div>
                {bloqueado && (
                  <div style={{ fontSize: '.68rem', color: 'var(--text-3)', marginTop: '.3rem' }}>🔒</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress hint when locked */}
        {bloqueado && (
          <div className="card" style={{ marginTop: '1.25rem' }}>
            <div className="card-body">
              {(() => {
                const pos = (sesion?.registros_count || 0) % PUNTOS_CUPON;
                const pct = (pos / PUNTOS_CUPON) * 100;
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--text-3)', marginBottom: '.3rem' }}>
                      <span>Progreso hacia el próximo cupón</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{pos} / {PUNTOS_CUPON}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--cream-300)', borderRadius: 999, overflow: 'hidden', marginBottom: '.75rem' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 999 }} />
                    </div>
                  </>
                );
              })()}
              <p style={{ fontSize: '.82rem', color: 'var(--text-3)', textAlign: 'center' }}>
                Ve a <strong>Registrar</strong> y tira tu basura en el bote para desbloquear cupones
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Lista de cupones en la categoría elegida ─────────────────────────────────
  const cat       = CATEGORIAS.find(c => c.id === categoria);
  const filtrados = cupones.filter(c => c.categoria === categoria);

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: '.15rem', flexShrink: 0 }}
          onClick={() => setCategoria(null)}
        >
          ←
        </button>
        <div>
          <h1>{cat?.icon} {cat?.label}</h1>
          <p>{disponibles > 0 ? 'Elige un cupón para canjear' : 'Desbloquea más basuras para canjear'}</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {filtrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{cat?.icon}</div>
          <h3>Sin cupones en esta categoría</h3>
          <p>El administrador no ha publicado cupones de {cat?.label.toLowerCase()} aún</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
          {filtrados.map(c => (
            <CuponCard
              key={c.id}
              cupon={c}
              onCanjear={handleCanjear}
              canjeando={canjeando}
              bloqueado={bloqueado}
              sesion={sesion}
            />
          ))}
        </div>
      )}
    </div>
  );
}
