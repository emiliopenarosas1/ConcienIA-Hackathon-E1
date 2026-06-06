const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/aviso-privacidad
router.get('/aviso-privacidad', (req, res) => {
  res.json({
    responsable: 'Data Circular — Hackathon Medioambiente 2024',
    domicilio: 'México, D.F.',
    finalidad: 'Estimación de residuos en eventos masivos para promover la economía circular',
    datos_recopilados: [
      'Nombre del evento (no identificable)',
      'Tipo de evento',
      'Número de asistentes',
      'Duración del evento en horas',
    ],
    datos_NO_recopilados: [
      'Imágenes (procesadas en memoria RAM y descartadas inmediatamente)',
      'Datos personales identificables',
      'Ubicación geográfica',
      'Datos de contacto',
    ],
    transferencias: 'Los datos NO se transfieren a terceros ni se comparten con ninguna entidad.',
    derechos_ARCO:
      'Puede ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición a través del botón "Eliminar mis datos" en la sección de Privacidad.',
    contacto: 'datacircular@hackathon.mx',
    fecha_actualizacion: '2024-01-01',
    base_legal: 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)',
  });
});

// DELETE /api/eliminar-datos  (Derecho de Cancelación ARCO)
router.delete('/eliminar-datos', (req, res) => {
  try {
    const { changes } = db.prepare('DELETE FROM eventos').run();
    res.json({
      mensaje: 'Todos los datos han sido eliminados correctamente.',
      registros_eliminados: changes,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/eliminar-datos]', err.message);
    res.status(500).json({ error: 'Error al eliminar datos' });
  }
});

// GET /api/mis-datos (Derecho de Acceso ARCO — resumen anónimo)
router.get('/mis-datos', (req, res) => {
  const resumen = db.prepare(
    'SELECT COUNT(*) as eventos_guardados, SUM(toneladas_totales) as toneladas_total FROM eventos'
  ).get();
  res.json({
    eventos_guardados: resumen.eventos_guardados,
    toneladas_estimadas: resumen.toneladas_total || 0,
    datos_personales_almacenados: 'Ninguno',
    imagenes_almacenadas: 'Ninguna (procesadas en memoria)',
  });
});

module.exports = router;
