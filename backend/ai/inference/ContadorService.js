/**
 * @file ContadorService.js
 * @description Motor de agregación analítica para los registros de limpieza de la plataforma ConciencIA.
 * Permite calcular el volumen total de residuos, su desglose, impacto en la huella de carbono
 * e ingresos potenciales por reciclaje.
 */

const db = require('../../db/database');

/**
 * Servicio encargado de procesar y estructurar la analítica de los residuos recolectados.
 * @class ContadorService
 */
class ContadorService {
  /**
   * Analiza y consolida los registros de limpieza de un evento específico.
   * 
   * @param {Object} evento - Datos del evento objeto del análisis.
   * @param {number} evento.id - Identificador único del evento.
   * @param {string} evento.nombre - Nombre del evento.
   * @param {Array<Object>} registros - Lista de registros de residuos recolectados en el evento.
   * @returns {Object} Reporte estadístico y financiero consolidado del evento.
   */
  analizar(evento, registros) {
    if (!registros.length) {
      return {
        evento_id: evento.id,
        nombre_evento: evento.nombre,
        desglose: [],
        resumen: {
          total_kg: 0,
          reciclable_kg: 0,
          reciclable_pct: 0,
          no_reciclable_kg: 0,
          no_reciclable_pct: 0,
          ingreso_esperado_mxn: 0,
          huella_carbono_kg: 0,
          camiones_estimados: 0,
        },
        zonas: [],
        ingresos_desglosados: [],
      };
    }

    const factores = db.prepare('SELECT material, kg_co2_por_kg, reciclable FROM factores_emision').all();
    const precios  = db.prepare('SELECT material, precio_ref_mxn, precio_min_mxn, precio_max_mxn, recicladora_ref FROM precios_recicladoras').all();

    const factorMap = Object.fromEntries(factores.map(f => [f.material, f]));
    const precioMap = Object.fromEntries(precios.map(p => [p.material, p]));

    const porTipo = {};
    for (const reg of registros) {
      if (!porTipo[reg.tipo_basura]) {
        porTipo[reg.tipo_basura] = { kg: 0, bolsas: 0 };
      }
      porTipo[reg.tipo_basura].kg     += reg.kg_estimado;
      porTipo[reg.tipo_basura].bolsas += reg.cantidad_bolsas;
    }

    const total_kg = Object.values(porTipo).reduce((s, v) => s + v.kg, 0);

    const desglose = Object.entries(porTipo).map(([tipo, data]) => {
      const factor   = factorMap[tipo]  || { kg_co2_por_kg: 1.8, reciclable: 0 };
      const precio   = precioMap[tipo]  || { precio_ref_mxn: 0, precio_min_mxn: 0, precio_max_mxn: 0, recicladora_ref: 'N/A' };
      const reciclable   = Boolean(factor.reciclable);
      const ingreso_mxn  = reciclable ? parseFloat((data.kg * precio.precio_ref_mxn).toFixed(2)) : 0;

      return {
        tipo,
        kg:              parseFloat(data.kg.toFixed(2)),
        bolsas:          data.bolsas,
        porcentaje:      total_kg > 0 ? parseFloat((data.kg / total_kg * 100).toFixed(2)) : 0,
        reciclable,
        kg_co2_por_kg:   factor.kg_co2_por_kg,
        precio_ref_mxn_kg: precio.precio_ref_mxn,
        ingreso_mxn,
        recicladora:     precio.recicladora_ref,
      };
    }).sort((a, b) => b.kg - a.kg);

    const reciclables     = desglose.filter(d => d.reciclable);
    const no_reciclables  = desglose.filter(d => !d.reciclable);

    const reciclable_kg        = reciclables.reduce((s, d) => s + d.kg, 0);
    const no_reciclable_kg     = no_reciclables.reduce((s, d) => s + d.kg, 0);
    const ingreso_esperado_mxn = reciclables.reduce((s, d) => s + d.ingreso_mxn, 0);
    const huella_carbono_kg    = no_reciclables.reduce((s, d) => s + d.kg * d.kg_co2_por_kg, 0);
    const camiones_estimados   = Math.ceil(total_kg / 4800);

    const porZona = {};
    for (const reg of registros) {
      if (!porZona[reg.zona]) {
        porZona[reg.zona] = { kg: 0, bolsas: 0, porTipo: {} };
      }
      porZona[reg.zona].kg     += reg.kg_estimado;
      porZona[reg.zona].bolsas += reg.cantidad_bolsas;
      porZona[reg.zona].porTipo[reg.tipo_basura] =
        (porZona[reg.zona].porTipo[reg.tipo_basura] || 0) + reg.kg_estimado;
    }

    const zonas = Object.entries(porZona).map(([zona, data]) => ({
      zona,
      kg:                parseFloat(data.kg.toFixed(2)),
      pct:               total_kg > 0 ? parseFloat((data.kg / total_kg * 100).toFixed(2)) : 0,
      bolsas:            data.bolsas,
      tipo_predominante: Object.entries(data.porTipo).sort(([,a],[,b]) => b - a)[0]?.[0] || 'N/A',
      desglose_tipos:    data.porTipo,
    })).sort((a, b) => b.kg - a.kg);

    const porRecicladora = {};
    for (const d of reciclables) {
      if (!porRecicladora[d.recicladora]) {
        porRecicladora[d.recicladora] = { recicladora: d.recicladora, materiales: [], total_mxn: 0 };
      }
      porRecicladora[d.recicladora].materiales.push({ material: d.tipo, kg: d.kg, mxn: d.ingreso_mxn });
      porRecicladora[d.recicladora].total_mxn += d.ingreso_mxn;
    }

    return {
      evento_id:     evento.id,
      nombre_evento: evento.nombre,
      desglose,
      resumen: {
        total_kg:              parseFloat(total_kg.toFixed(2)),
        reciclable_kg:         parseFloat(reciclable_kg.toFixed(2)),
        reciclable_pct:        total_kg > 0 ? parseFloat((reciclable_kg / total_kg * 100).toFixed(2)) : 0,
        no_reciclable_kg:      parseFloat(no_reciclable_kg.toFixed(2)),
        no_reciclable_pct:     total_kg > 0 ? parseFloat((no_reciclable_kg / total_kg * 100).toFixed(2)) : 0,
        ingreso_esperado_mxn:  parseFloat(ingreso_esperado_mxn.toFixed(2)),
        huella_carbono_kg:     parseFloat(huella_carbono_kg.toFixed(2)),
        camiones_estimados,
      },
      zonas,
      ingresos_desglosados: Object.values(porRecicladora).sort((a, b) => b.total_mxn - a.total_mxn),
    };
  }
}

module.exports = new ContadorService();
