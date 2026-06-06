import { useState } from 'react';

export default function PrivacyModal({ onAccept }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="modal-box glass-elevated">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2.5rem' }}>♻</span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-glow)' }}>
            Aviso de Privacidad
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
            LFPDPPP — Ley Federal de Protección de Datos Personales
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <Section icon="🎯" title="Finalidad">
            Estimación de residuos en eventos masivos para promover la economía circular en México.
          </Section>
          <Section icon="📋" title="Datos que recopilamos">
            Nombre del evento, tipo, número de asistentes y duración. <strong>No</strong> recopilamos datos personales identificables.
          </Section>
          <Section icon="🖼" title="Imágenes">
            Las imágenes enviadas al clasificador son procesadas <strong>en memoria RAM</strong> y descartadas inmediatamente. No se almacenan.
          </Section>
          <Section icon="🔒" title="Transferencias">
            Tus datos <strong>no se comparten</strong> con terceros ni se transfieren fuera del servidor local.
          </Section>
          <Section icon="⚖️" title="Derechos ARCO">
            Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición desde el panel de Privacidad.
          </Section>
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.5rem' }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }}
          />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
            He leído el aviso de privacidad y acepto el tratamiento de mis datos con las finalidades descritas.
          </span>
        </label>

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem' }}
          disabled={!checked}
          onClick={onAccept}
        >
          Continuar a Data Circular
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="glass-flat" style={{ padding: '0.85rem 1rem', display: 'flex', gap: '0.75rem' }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.2rem' }}>{title}</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{children}</div>
      </div>
    </div>
  );
}
