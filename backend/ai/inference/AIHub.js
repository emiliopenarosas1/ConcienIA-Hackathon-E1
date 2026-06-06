/**
 * AIHub — fachada unificada para los 3 servicios de IA.
 *
 * Estimar   → RF Regression     — predice residuos y huella a partir de datos del evento
 * Contar    → Motor analítico   — procesa registros reales y devuelve métricas completas
 * Identificar → MLP + heurístico — identifica tipo de residuo en una imagen
 */

const estimador   = require('./EstimadorService');
const contador    = require('./ContadorService');
const identificar = require('./IdentificarService');

module.exports = {
  /**
   * @param {{ asistentes: number, duracion_horas: number, tipo: string }} params
   * @returns {{ residuos, total_kg, toneladas_totales }}
   */
  estimar: (params) => estimador.predict(params),

  /**
   * @param {{ id, nombre, tipo }} evento
   * @param {Array}               registros  — filas de registros_limpieza
   * @returns {object}            análisis completo con desglose, resumen, zonas e ingresos
   */
  contar: (evento, registros) => contador.analizar(evento, registros),

  /**
   * @param {string} base64  — data:image/jpeg;base64,...
   * @returns {Promise<object>}
   */
  identificar: (base64) => identificar.classify(base64),
};
