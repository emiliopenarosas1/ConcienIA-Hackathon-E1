const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const AIHub   = require('../ai/inference/AIHub');

// ── Utilidades de texto ──────────────────────────────────────────────────────

function norm(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ── Extracción de parámetros para estimación ─────────────────────────────────

function extractEstimacionParams(msg) {
  const m = norm(msg);

  let tipo = 'concierto';
  if (/festival/.test(m))                                       tipo = 'festival';
  else if (/deportiv|partido|futbol|basquet|beisbol|atletismo/.test(m)) tipo = 'deportivo';
  else if (/conferencia|congreso|foro|seminario|cumbre/.test(m)) tipo = 'conferencia';

  let asistentes = 10000;
  const mK   = msg.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  const mMil = msg.match(/(\d+)\s*mil\b/i);
  const mNum = msg.match(/(\d{4,})/);
  const mPeq = msg.match(/(\d{1,3})\s*(?:personas|asistentes|gente)/i);
  if      (mK)   asistentes = parseFloat(mK[1].replace(',', '.')) * 1000;
  else if (mMil) asistentes = parseInt(mMil[1]) * 1000;
  else if (mNum) asistentes = parseInt(mNum[1]);
  else if (mPeq) asistentes = parseInt(mPeq[1]);

  let duracion_horas = 4;
  const mH = msg.match(/(\d+)\s*(horas?|hrs?|h)\b/i);
  if (mH) duracion_horas = parseInt(mH[1]);

  return { tipo, asistentes: Math.round(asistentes), duracion_horas };
}

// ── Clasificación de intención ───────────────────────────────────────────────

function parseIntent(msg) {
  const m    = norm(msg);
  const nums = (msg.match(/\d+/g) || []).map(Number);

  if (/\b(ayuda|hola|hi|buenas|que (sabes|puedes)|como funciona|inicio)\b/.test(m))
    return { intent: 'AYUDA', nums };

  if (/modelo|entrenamiento|algoritmo|como.*(calcula|genera|sale|funciona|obtiene)|por.*(que|qué).*(estima|genera|sale|valor|numero|resultado)|ia |inteligencia|random.?forest|mlp|red.?neural|prediccion|aprend/.test(m))
    return { intent: 'EXPLICAR_MODELO', nums };

  if (/estadistic|global|sistema|total.*evento|cuantos eventos|todos los eventos/.test(m))
    return { intent: 'ESTADISTICAS', nums };

  if (/zona|sector|(area|punto).*(sucio|sucia|basura)|ranking.*(limpieza|zona)|mas sucio/.test(m))
    return { intent: 'ZONAS', nums };

  if (/estim|futuro|planear|planific|voy a (organ|hacer|tener)|organiz(ar|ando|amos)|proximo|siguiente event/.test(m))
    return { intent: 'ESTIMAR', nums };

  if (/ultim[ao]|reciente|mas nuevo|ultimo evento/.test(m))
    return { intent: 'ULTIMO', nums };

  if (/lista|historial|que event|cuales event|ver event|eventos registrado|mostrar event/.test(m))
    return { intent: 'LISTAR', nums };

  if (nums.length > 0)
    return { intent: 'CONTEO', nums };

  if (/basura|residuo|recicla|tonelad|kg|kilo|dinero|ingreso|analisi|conteo|cuanta|cuanto|carbon|co2/.test(m))
    return { intent: 'CONTEO_SIN_ID', nums };

  return { intent: 'NO_ENTENDI', nums };
}

// ── Formateadores de respuesta ───────────────────────────────────────────────

function fmtEstimacion(params, residuos) {
  const RECICLABLES = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton'];
  const total_kg    = Object.values(residuos).reduce((s, v) => s + v, 0);
  const recicl_kg   = RECICLABLES.reduce((s, m) => s + (residuos[`kg_${m}`] || 0), 0);
  const no_recicl   = Math.max(0, total_kg - recicl_kg);

  let ingreso = 0;
  try {
    const precios = db.prepare('SELECT material, precio_ref_mxn FROM precios_recicladoras').all();
    for (const p of precios) ingreso += (residuos[`kg_${p.material}`] || 0) * p.precio_ref_mxn;
  } catch (_) {}

  const desglose = Object.entries(residuos)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `  · ${k.replace('kg_', '')}: ${v.toFixed(0)} kg`)
    .join('\n');

  return `Estimación — ${params.tipo} de ${params.asistentes.toLocaleString('es-MX')} personas (${params.duracion_horas}h):

Total estimado: ${(total_kg / 1000).toFixed(2)} toneladas
Reciclable: ${recicl_kg.toFixed(0)} kg | No reciclable: ${no_recicl.toFixed(0)} kg
Ingreso potencial reciclaje: $${ingreso.toFixed(0)} MXN

Desglose:
${desglose}`;
}

function fmtConteo(conteo) {
  const r    = conteo.resumen || conteo;
  const nombre = conteo.nombre_evento ? `"${conteo.nombre_evento}"` : '';
  const zonas  = (conteo.zonas || []).slice(0, 3)
    .map((z, i) => `  ${i + 1}. ${z.zona}: ${z.kg?.toFixed(1)} kg`)
    .join('\n');

  return `Análisis del evento ${nombre}:

Total real: ${r.total_kg?.toFixed(1)} kg (${(r.total_kg / 1000).toFixed(2)} t)
Reciclable: ${r.reciclable_kg?.toFixed(1)} kg (${r.reciclable_pct?.toFixed(1)}%)
Ingreso esperado reciclaje: $${r.ingreso_esperado_mxn?.toFixed(0)} MXN
Camiones estimados: ${r.camiones_estimados}
Huella CO₂: ${r.huella_carbono_kg?.toFixed(0)} kg CO₂eq
${zonas ? `\nTop zonas más sucias:\n${zonas}` : ''}`.trim();
}

// ── Endpoint POST /api/chat ──────────────────────────────────────────────────

router.post('/chat', (req, res) => {
  try {
    const { mensaje } = req.body;
    if (!mensaje?.trim()) return res.status(400).json({ error: 'Falta mensaje' });

    const { intent, nums } = parseIntent(mensaje);

    switch (intent) {

      case 'EXPLICAR_MODELO': {
        return res.json({ respuesta:
`Los modelos de IA que generan las estimaciones y análisis de ConciencIA son:

── Modelo Estimar (Random Forest Regression) ──
Predice residuos antes de que ocurra el evento.

Entrenamiento: datos sintéticos calibrados con fuentes oficiales:
  · SEMARNAT — Diagnóstico Básico para la Gestión Integral de Residuos 2020
  · EPA WARM Tool 2023 (factores de emisión CO₂ por material)
  · International Aluminium Institute (factor 8.2 kg CO₂/kg aluminio)
  · BID Hub Residuos Circulares (factor NoReciclable 1.8 kg CO₂/kg)

Variables de entrada: tipo de evento · asistentes · duración (horas)
Variables de salida: kg por material (PET, Orgánico, Aluminio, Vidrio, Cartón)

Benchmarks de validación:
  · Concierto 50 k / 4 h → ~12 toneladas
  · Festival  50 k / 8 h → ~14 toneladas
  · Deportivo 64 k / 3 h → ~24 toneladas
  · Conferencia 5 k / 8 h → ~7 toneladas

── Modelo Contar (Motor analítico) ──
Procesa registros reales de limpieza.
Cruza los kg reales con precios de recicladoras (ECOCE/ALMEXA/Vitro/Smurfit/SIAP) y factores de emisión para calcular ingresos, huella CO₂ real y camiones necesarios (umbral: 4 800 kg por camión compactador SEMOVI-CDMX).

── Modelo Identificar (MLP + heurístico) ──
Clasifica residuos por imagen usando una red neuronal multicapa entrenada con datos sintéticos de características visuales por tipo de material.` });
      }

      case 'AYUDA': {
        return res.json({ respuesta:
          `Hola, soy el asistente de ConciencIA. Puedo ayudarte con:\n\n` +
          `• "lista los eventos" — historial de eventos\n` +
          `• "analiza el evento 3" — análisis de residuos reales\n` +
          `• "estima un festival de 20k personas 8 horas" — predicción pre-evento\n` +
          `• "zonas del evento 2" — ranking de zonas más sucias\n` +
          `• "estadísticas del sistema" — totales globales`
        });
      }

      case 'ESTADISTICAS': {
        const stats = db.prepare(
          'SELECT COUNT(*) as n, SUM(toneladas_totales) as ton, SUM(huella_carbono_kg) as co2 FROM eventos'
        ).get();
        return res.json({ respuesta:
          `Estadísticas globales:\n\n` +
          `• Eventos registrados: ${stats.n}\n` +
          `• Toneladas procesadas: ${(stats.ton || 0).toFixed(2)} t\n` +
          `• Huella CO₂ acumulada: ${(stats.co2 || 0).toFixed(0)} kg CO₂eq`
        });
      }

      case 'LISTAR': {
        const tipo = norm(mensaje).match(/concierto|deportivo|festival|conferencia/)?.[0];
        const rows = tipo
          ? db.prepare('SELECT id, nombre, tipo, asistentes, toneladas_totales FROM eventos WHERE tipo = ? ORDER BY id DESC LIMIT 8').all(tipo)
          : db.prepare('SELECT id, nombre, tipo, asistentes, toneladas_totales FROM eventos ORDER BY id DESC LIMIT 8').all();
        if (!rows.length) return res.json({ respuesta: 'No hay eventos registrados aún.' });
        const lista = rows.map(e =>
          `  #${e.id} ${e.nombre} · ${e.tipo} · ${(e.asistentes || 0).toLocaleString('es-MX')} personas · ${(e.toneladas_totales || 0).toFixed(1)} t`
        ).join('\n');
        return res.json({ respuesta: `Últimos eventos registrados:\n\n${lista}` });
      }

      case 'ULTIMO': {
        const ev = db.prepare('SELECT * FROM eventos ORDER BY id DESC LIMIT 1').get();
        if (!ev) return res.json({ respuesta: 'No hay eventos registrados.' });
        const registros = db.prepare('SELECT * FROM registros_limpieza WHERE evento_id = ?').all(ev.id);
        if (!registros.length)
          return res.json({ respuesta: `Último evento: #${ev.id} "${ev.nombre}" (${ev.tipo}, ${(ev.asistentes || 0).toLocaleString('es-MX')} personas). Sin registros de limpieza aún.` });
        return res.json({ respuesta: fmtConteo(AIHub.contar(ev, registros)) });
      }

      case 'CONTEO': {
        const id = nums[0];
        const ev = db.prepare('SELECT * FROM eventos WHERE id = ?').get(id);
        if (!ev) return res.json({ respuesta: `No encontré el evento #${id}. Escribe "lista eventos" para ver los IDs disponibles.` });
        const registros = db.prepare('SELECT * FROM registros_limpieza WHERE evento_id = ?').all(id);
        if (!registros.length) return res.json({ respuesta: `El evento #${id} "${ev.nombre}" no tiene registros de limpieza aún.` });
        return res.json({ respuesta: fmtConteo(AIHub.contar(ev, registros)) });
      }

      case 'CONTEO_SIN_ID': {
        const ev = db.prepare('SELECT * FROM eventos ORDER BY id DESC LIMIT 1').get();
        if (!ev) return res.json({ respuesta: 'No hay eventos registrados.' });
        const registros = db.prepare('SELECT * FROM registros_limpieza WHERE evento_id = ?').all(ev.id);
        if (!registros.length)
          return res.json({ respuesta: `¿Para qué evento quieres el análisis? El más reciente es #${ev.id} "${ev.nombre}". Dime "analiza el evento ${ev.id}".` });
        return res.json({ respuesta: fmtConteo(AIHub.contar(ev, registros)) });
      }

      case 'ZONAS': {
        const id = nums[0];
        if (!id) {
          const ev = db.prepare('SELECT id, nombre FROM eventos ORDER BY id DESC LIMIT 1').get();
          if (!ev) return res.json({ respuesta: 'No hay eventos registrados.' });
          return res.json({ respuesta: `¿De qué evento quieres el ranking de zonas? El más reciente es #${ev.id} "${ev.nombre}". Dime "zonas del evento ${ev.id}".` });
        }
        const ev = db.prepare('SELECT nombre FROM eventos WHERE id = ?').get(id);
        if (!ev) return res.json({ respuesta: `No encontré el evento #${id}.` });
        const registros = db.prepare(
          'SELECT zona, kg_estimado, cantidad_bolsas FROM registros_limpieza WHERE evento_id = ?'
        ).all(id);
        if (!registros.length) return res.json({ respuesta: `El evento #${id} no tiene registros de zonas aún.` });
        const porZona = {};
        for (const r of registros) {
          if (!porZona[r.zona]) porZona[r.zona] = { kg: 0, bolsas: 0 };
          porZona[r.zona].kg     += r.kg_estimado;
          porZona[r.zona].bolsas += r.cantidad_bolsas;
        }
        const ranking = Object.entries(porZona)
          .sort(([, a], [, b]) => b.kg - a.kg)
          .map(([z, d], i) => `  ${i + 1}. ${z}: ${d.kg.toFixed(1)} kg (${d.bolsas} bolsas)`)
          .join('\n');
        return res.json({ respuesta: `Zonas del evento #${id} "${ev.nombre}" por residuos:\n\n${ranking}` });
      }

      case 'ESTIMAR': {
        const params  = extractEstimacionParams(mensaje);
        const residuos = AIHub.estimar(params);
        return res.json({ respuesta: fmtEstimacion(params, residuos) });
      }

      default:
        return res.json({ respuesta:
          `No entendí tu pregunta. Prueba con:\n` +
          `• "lista los eventos"\n` +
          `• "analiza el evento 1"\n` +
          `• "estima un festival de 15k personas 6 horas"\n` +
          `• "zonas del evento 2"\n` +
          `• "estadísticas del sistema"`
        });
    }
  } catch (err) {
    console.error('[/chat]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
