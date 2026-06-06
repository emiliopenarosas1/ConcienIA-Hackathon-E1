/**
 * @file AIHub.js
 * @description Fachada unificada para la interacción con los servicios de Inteligencia Artificial
 * y motores analíticos de la plataforma ConciencIA.
 */

const estimador = require('./EstimadorService');
const contador = require('./ContadorService');
const identificar = require('./IdentificarService');

/**
 * Módulo unificado de servicios de IA y análisis.
 * @module AIHub
 */
module.exports = {
  /**
   * Realiza la estimación predictiva de generación de residuos para un evento masivo.
   * 
   * @param {Object} params - Parámetros del evento para estimar.
   * @param {number} params.asistentes - Cantidad estimada de asistentes al evento.
   * @param {number} params.duracion_horas - Duración total del evento en horas.
   * @param {string} params.tipo - Tipo de evento (por ejemplo, 'concierto', 'festival', 'deportivo').
   * @returns {Object} Estimación de residuos, kg totales y toneladas totales estimadas.
   */
  estimar: (params) => estimador.predict(params),

  /**
   * Procesa el historial de registros de limpieza en tiempo real para generar reportes analíticos.
   * 
   * @param {Object} evento - Datos informativos del evento.
   * @param {number} evento.id - ID único del evento.
   * @param {string} evento.nombre - Nombre descriptivo del evento.
   * @param {string} evento.tipo - Categoría del evento.
   * @param {Array<Object>} registros - Lista de registros de limpieza recopilados en el evento.
   * @returns {Object} Reporte analítico con desgloses, zonas, impactos y estimaciones financieras.
   */
  contar: (evento, registros) => contador.analizar(evento, registros),

  /**
   * Clasifica una imagen de residuo para determinar su tipo de material y contenedor correspondiente.
   * 
   * @param {string} base64 - Imagen codificada en formato Base64.
   * @returns {Promise<Object>} Promesa que resuelve a un objeto con la categoría, nivel de confianza y contenedor.
   */
  identificar: (base64) => identificar.classify(base64),
};
