import { useState } from 'react';

/**
 * @file PrivacyModal.jsx
 * @description Componente de modal de privacidad que gestiona la aceptación del aviso de privacidad integral.
 * Cumple con los lineamientos de la LFPDPPP.
 */

/**
 * Clave utilizada en localStorage para rastrear la aceptación del aviso de privacidad.
 * @type {string}
 */
export const PRIVACY_ACCEPTED_KEY = 'amb_privacy_accepted_v1';

/**
 * Componente que renderiza el modal del aviso de privacidad integral.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {function} props.onAccept - Función callback ejecutada al aceptar los términos.
 * @param {function} [props.onClose] - Función callback opcional para cerrar el modal en modo consulta/revisión.
 * @returns {JSX.Element} Elemento JSX que representa el modal de privacidad.
 */
export default function PrivacyModal({ onAccept, onClose }) {
  const [checked, setChecked] = useState(false);
  const isReview = typeof onClose === 'function';

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-box glass-elevated"
        style={{ maxWidth: 480, width: '94vw', padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.25rem', flexShrink: 0 }}>
          <span style={{ fontSize: '2.2rem' }}>♻</span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.4rem', color: 'var(--accent-glow)' }}>
            Aviso de Privacidad
          </h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
            LFPDPPP · Vigente desde junio 2026 · v1.0
          </p>
        </div>

        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            paddingRight: '0.25rem',
          }}
        >
          <Section icon="🎯" title="Finalidad">
            Registrar tu participación en eventos de reciclaje; acreditar la entrega de residuos y
            emitir el cupón o beneficio correspondiente; calcular indicadores de impacto ambiental
            para el organizador del evento; y dar cumplimiento a obligaciones legales.
          </Section>

          <Section icon="📋" title="Datos que recopilamos">
            Nombre o seudónimo de participación; correo electrónico (solo si decides recibirlo
            así); folio del evento al que asistes; tipo y peso aproximado de residuos entregados;
            fecha y hora de la operación.
          </Section>

          <Section icon="🚫" title="Lo que NO recopilamos">
            Geolocalización GPS; datos biométricos — la autenticación biométrica ocurre
            íntegramente en tu dispositivo (WebAuthn) y solo recibimos una credencial
            criptográfica pública, nunca el biométrico en sí; datos sensibles; datos de
            menores sin consentimiento.
          </Section>

          <Section icon="🖼" title="Imágenes del clasificador">
            Las imágenes que envías al clasificador de residuos se procesan{' '}
            <strong>en memoria RAM</strong> y se descartan de inmediato.
            No se almacenan ni vinculan a tu perfil.
          </Section>

          <Section icon="🔒" title="Transferencias">
            Tus datos <strong>no se comparten</strong> con terceros con fines comerciales.
            Los reportes entregados a organizadores de eventos contienen únicamente información
            agregada que no te identifica individualmente.
          </Section>

          <Section icon="🛡" title="Seguridad">
            Cifrado en tránsito (TLS 1.3) y en reposo (AES-256); controles de acceso por roles;
            bitácoras de auditoría; y programa de respuesta a incidentes conforme a la LFPDPPP.
          </Section>

          <Section icon="📅" title="Conservación">
            Datos operativos: <strong>12 meses</strong>. Registros contables y de cumplimiento:
            hasta <strong>5 años</strong>. Pasados esos plazos, se eliminan mediante borrado
            seguro o disociación irreversible.
          </Section>

          <Section icon="⚖️" title="Derechos ARCO">
            Puedes Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos, así
            como revocar tu consentimiento, desde el panel de Privacidad de la plataforma.
          </Section>

          <Section icon="🍪" title="Cookies">
            Solo se usan cookies estrictamente necesarias para la sesión y para persistir tu
            consentimiento. No hay cookies publicitarias ni de seguimiento de terceros.
          </Section>

          <Section icon="🏛" title="Autoridad competente">
            Si consideras que tus derechos han sido vulnerados puedes acudir ante el{' '}
            <strong>INAI</strong> (Instituto Nacional de Transparencia, Acceso a la Información
            y Protección de Datos Personales) en{' '}
            <a
              href="https://www.inai.org.mx"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-glow)' }}
            >
              www.inai.org.mx
            </a>.
          </Section>
        </div>

        {!isReview && (
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              cursor: 'pointer',
              marginBottom: '1.25rem',
              flexShrink: 0,
            }}
          >
            <input
              type="checkbox"
              id="privacy-accept-check"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
              He leído el aviso de privacidad y acepto el tratamiento de mis datos con las
              finalidades descritas.
            </span>
          </label>
        )}

        {isReview ? (
          <button
            id="privacy-close-btn"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}
            onClick={onClose}
          >
            Cerrar
          </button>
        ) : (
          <button
            id="privacy-accept-btn"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}
            disabled={!checked}
            onClick={onAccept}
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Componente interno que renderiza una sección informativa dentro del aviso de privacidad.
 * 
 * @private
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.icon - Icono representativo de la sección.
 * @param {string} props.title - Título de la sección.
 * @param {React.ReactNode} props.children - Contenido de la sección.
 * @returns {JSX.Element} Elemento JSX de la sección.
 */
function Section({ icon, title, children }) {
  return (
    <div className="glass-flat" style={{ padding: '0.8rem 1rem', display: 'flex', gap: '0.75rem', borderRadius: 10 }}>
      <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.1rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.2rem' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-2)', lineHeight: 1.55 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Enlace discreto para que el usuario pueda reabrir el aviso de privacidad en cualquier momento.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {function} props.onOpen - Función callback para abrir el modal del aviso de privacidad.
 * @returns {JSX.Element} Elemento JSX que contiene el enlace para volver a activar el aviso.
 */
export function PrivacyLink({ onOpen }) {
  return (
    <p
      style={{
        textAlign: 'center',
        fontSize: '0.68rem',
        color: 'var(--text-3)',
        marginTop: '0.75rem',
        flexShrink: 0,
      }}
    >
      <button
        id="privacy-reopen-btn"
        onClick={onOpen}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent-glow)',
          cursor: 'pointer',
          fontSize: '0.68rem',
          textDecoration: 'underline',
          padding: 0,
        }}
      >
        Ver aviso de privacidad
      </button>
    </p>
  );
}
