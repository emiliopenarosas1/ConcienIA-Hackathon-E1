import { useState, useEffect, useRef } from 'react';
import GlassCard from './GlassCard.jsx';
import { api } from '../services/api.js';

export default function ARCOPanel() {
  const [aviso, setAviso] = useState(null);
  const [misDatos, setMisDatos] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    Promise.all([api.getAvisoPrivacidad(), api.getMisDatos()])
      .then(([a, d]) => { setAviso(a); setMisDatos(d); })
      .catch(console.error);
  }, []);

  const startDelete = () => {
    setShowConfirm(true);
    setCountdown(5);
    intervalRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(intervalRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const cancelDelete = () => {
    clearInterval(intervalRef.current);
    setShowConfirm(false);
    setCountdown(5);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.eliminarDatos();
      setDeleted(true);
      setShowConfirm(false);
      setMisDatos(d => ({ ...d, eventos_guardados: 0, toneladas_estimadas: 0 }));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-enter">
      <h2 className="section-title">Privacidad y Derechos ARCO</h2>

      {deleted && (
        <div className="glass-accent" style={{ padding: '1rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)' }}>
          ✅ Tus datos han sido eliminados correctamente.
        </div>
      )}

      {/* Mis datos actuales */}
      {misDatos && (
        <div className="stats-grid stagger" style={{ marginBottom: '1.5rem' }}>
          <GlassCard className="stat-card">
            <div className="stat-label">Eventos guardados</div>
            <div className="stat-value">{misDatos.eventos_guardados}</div>
          </GlassCard>
          <GlassCard className="stat-card">
            <div className="stat-label">Toneladas estimadas</div>
            <div className="stat-value">{Number(misDatos.toneladas_estimadas || 0).toFixed(1)}</div>
            <div className="stat-unit">ton</div>
          </GlassCard>
          <GlassCard className="stat-card">
            <div className="stat-label">Datos personales</div>
            <div className="stat-value" style={{ fontSize: '1rem', color: 'hsl(128,55%,55%)' }}>Ninguno</div>
          </GlassCard>
          <GlassCard className="stat-card">
            <div className="stat-label">Imágenes almacenadas</div>
            <div className="stat-value" style={{ fontSize: '1rem', color: 'hsl(128,55%,55%)' }}>Ninguna</div>
          </GlassCard>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Derechos ARCO */}
        <GlassCard style={{ padding: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--text-1)' }}>
            Tus Derechos ARCO
          </div>
          {[
            { letra: 'A', nombre: 'Acceso', desc: 'Conocer qué datos tuyos almacenamos.', action: 'Ver arriba ↑' },
            { letra: 'R', nombre: 'Rectificación', desc: 'Corregir datos inexactos.', action: 'N/A (sin datos personales)' },
            { letra: 'C', nombre: 'Cancelación', desc: 'Eliminar todos tus datos.', action: null },
            { letra: 'O', nombre: 'Oposición', desc: 'Oponerte al tratamiento de tus datos.', action: 'Contacta: datacircular@hackathon.mx' },
          ].map(d => (
            <div key={d.letra} className="glass-flat" style={{ padding: '0.85rem', marginBottom: '0.6rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start', borderRadius: 'var(--radius-sm)' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'hsla(var(--hue),var(--sat),30%,0.4)',
                border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: 'var(--accent-glow)', fontSize: '0.9rem', flexShrink: 0,
              }}>{d.letra}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>{d.nombre}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-2)', marginTop: '0.1rem' }}>{d.desc}</div>
                {d.letra === 'C' ? (
                  <button
                    className="btn btn-danger"
                    style={{ marginTop: '0.5rem', padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
                    onClick={startDelete}
                    disabled={showConfirm || deleted}
                  >
                    🗑 Eliminar mis datos
                  </button>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{d.action}</div>
                )}
              </div>
            </div>
          ))}
        </GlassCard>

        {/* Aviso de privacidad */}
        <GlassCard style={{ padding: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--text-1)' }}>
            Aviso de Privacidad
          </div>
          {aviso && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Responsable', value: aviso.responsable },
                { label: 'Base legal', value: aviso.base_legal },
                { label: 'Finalidad', value: aviso.finalidad },
                { label: 'Transferencias', value: aviso.transferencias },
                { label: 'Contacto', value: aviso.contacto },
              ].map(row => (
                <div key={row.label} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{row.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{row.value}</div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Datos NO almacenados</div>
                {aviso.datos_NO_recopilados.map(d => (
                  <div key={d} style={{ fontSize: '0.76rem', color: 'hsl(128,55%,55%)', marginBottom: '0.2rem' }}>✓ {d}</div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Modal de confirmación con countdown */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-box glass-elevated" style={{ maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem' }}>⚠</div>
              <h3 style={{ marginTop: '0.5rem', fontSize: '1.15rem', color: 'hsl(0,70%,65%)' }}>Eliminar todos los datos</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginTop: '0.5rem', lineHeight: 1.6 }}>
                Esta acción eliminará permanentemente todos los eventos estimados. Esta operación no puede deshacerse.
              </p>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '0.5rem' }}>
                Puedes confirmar en:
              </div>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', border: `3px solid hsl(0,70%,50%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto', fontSize: '1.8rem', fontWeight: 800,
                color: countdown === 0 ? 'hsl(0,70%,65%)' : 'var(--text-2)',
              }}>
                {countdown}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={cancelDelete}>
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={countdown > 0 || deleting}
                onClick={confirmDelete}
              >
                {deleting ? <><span className="spinner" /> Eliminando...</> : '🗑 Confirmar eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
