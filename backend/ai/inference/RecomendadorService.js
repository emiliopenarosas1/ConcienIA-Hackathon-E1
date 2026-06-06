const { RandomForestClassifier } = require('ml-random-forest');
const fs = require('fs');
const path = require('path');

const MODEL_PATH = path.join(__dirname, '../models/recomendador.json');

const TEMPLATES = {
  reciclaje_intensivo: {
    titulo: 'Intensifica la Separación en la Fuente',
    descripcion: (d) => `Con ${(d.pet_ratio * 100).toFixed(0)}% de plástico PET, instala contenedores azules cada 50 metros y capacita a personal de limpieza en separación diferenciada.`,
    impacto: 'alto',
    reduccion_co2: (d) => (d.kg_total * d.pet_ratio * 6.0 * 0.3).toFixed(0),
    dificultad: 'media',
    icono: '♻',
  },
  compostaje: {
    titulo: 'Implementa Compostaje en Sitio',
    descripcion: (d) => `${(d.organico_ratio * 100).toFixed(0)}% de residuos orgánicos. Instala composta en el recinto; en 30 días tendrás abono para áreas verdes del evento.`,
    impacto: 'alto',
    reduccion_co2: (d) => (d.kg_total * d.organico_ratio * 0.5 * 0.8).toFixed(0),
    dificultad: 'media',
    icono: '🌱',
  },
  prohibir_plastico: {
    titulo: 'Prohibición de Plásticos de Un Solo Uso',
    descripcion: (d) => `El ratio PET (${(d.pet_ratio * 100).toFixed(0)}%) supera el umbral crítico. Coordina con vendors para eliminar PET desechable y ahorrar hasta ${(d.kg_total * d.pet_ratio * 0.4 / 1000).toFixed(1)} ton.`,
    impacto: 'muy alto',
    reduccion_co2: (d) => (d.kg_total * d.pet_ratio * 6.0 * 0.4).toFixed(0),
    dificultad: 'alta',
    icono: '🚫',
  },
  agua_refill: {
    titulo: 'Estaciones de Hidratación Reutilizables',
    descripcion: (d) => `Instala estaciones de refill cada 100 asistentes para eliminar botellas de agua desechable. Ahorro estimado: ${(d.asistentes_norm * 100000 * 0.012).toFixed(0)} botellas.`,
    impacto: 'alto',
    reduccion_co2: (d) => (d.asistentes_norm * 100000 * 0.012 * 0.05).toFixed(0),
    dificultad: 'baja',
    icono: '💧',
  },
  embajadores: {
    titulo: 'Programa de Embajadores de Residuos',
    descripcion: (d) => `Para un evento de ${Math.round(d.asistentes_norm * 100000).toLocaleString()} asistentes, recluta ${Math.round(d.asistentes_norm * 100000 / 500)} embajadores (1 cada 500 personas) para guiar la separación correcta.`,
    impacto: 'medio',
    reduccion_co2: (d) => (d.kg_total * 0.15 * 3.0).toFixed(0),
    dificultad: 'media',
    icono: '👥',
  },
  contenedores_opt: {
    titulo: 'Optimización de Contenedores por Zona',
    descripcion: (d) => `Distribuye contenedores según la densidad del evento. Ratio actual PET+Al: ${((d.pet_ratio + d.aluminio_ratio) * 100).toFixed(0)}%. Prioriza azules y amarillos en zonas de alimentos.`,
    impacto: 'medio',
    reduccion_co2: (d) => (d.kg_total * 0.20 * 4.0).toFixed(0),
    dificultad: 'baja',
    icono: '🗑',
  },
  alianzas_recicladores: {
    titulo: 'Alianzas con Empresas Recicladoras',
    descripcion: (d) => `CO₂ potencial: ${(d.co2_total_norm * 10000).toFixed(0)} kg. Contacta a ECOCE para PET y ALMEXA para aluminio; ofrece los residuos clasificados como materia prima.`,
    impacto: 'muy alto',
    reduccion_co2: (d) => (d.co2_total_norm * 10000 * 0.6).toFixed(0),
    dificultad: 'alta',
    icono: '🤝',
  },
  educacion_ambiental: {
    titulo: 'Módulo Educativo de Economía Circular',
    descripcion: (d) => `Instala un módulo interactivo con información SEMARNAT sobre los ${Object.keys(TEMPLATES).length} tipos de residuos. El 73% de asistentes cambia conducta tras ver datos en tiempo real.`,
    impacto: 'medio',
    reduccion_co2: (d) => (d.kg_total * 0.08 * 2.0).toFixed(0),
    dificultad: 'baja',
    icono: '📊',
  },
};

const PRIORIDAD = { 'muy alto': 4, 'alto': 3, 'medio': 2, 'bajo': 1 };

class RecomendadorService {
  constructor() {
    this.models = null;
    this.labels = null;
  }

  _load() {
    if (!fs.existsSync(MODEL_PATH)) {
      throw new Error('Modelo recomendador no encontrado. Ejecuta: node ai/training/train_recomendador.js');
    }
    const { labels, models } = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
    this.labels = labels;
    this.models = {};
    for (const label of labels) {
      this.models[label] = RandomForestClassifier.load(models[label]);
    }
    console.log('[RecomendadorService] Modelo cargado.');
  }

  recommend({ pet_ratio, organico_ratio, aluminio_ratio, asistentes_norm, tipo, co2_total_norm }) {
    if (!this.models) this._load();

    const kg_total = (pet_ratio + organico_ratio + aluminio_ratio) * asistentes_norm * 100000 * 0.05;

    const features = [
      pet_ratio,
      organico_ratio,
      aluminio_ratio,
      asistentes_norm,
      tipo === 'concierto'   ? 1 : 0,
      tipo === 'deportivo'   ? 1 : 0,
      tipo === 'festival'    ? 1 : 0,
      tipo === 'conferencia' ? 1 : 0,
      Math.min(co2_total_norm, 1),
    ];

    const ctx = { pet_ratio, organico_ratio, aluminio_ratio, asistentes_norm, co2_total_norm, kg_total };

    const recomendaciones = [];
    for (const label of this.labels) {
      const pred = this.models[label].predict([features])[0];
      if (pred === 1 && TEMPLATES[label]) {
        const tmpl = TEMPLATES[label];
        recomendaciones.push({
          id: label,
          titulo: tmpl.titulo,
          descripcion: tmpl.descripcion(ctx),
          impacto: tmpl.impacto,
          reduccion_co2_kg: parseFloat(tmpl.reduccion_co2(ctx)),
          dificultad: tmpl.dificultad,
          icono: tmpl.icono,
          prioridad: PRIORIDAD[tmpl.impacto] || 1,
        });
      }
    }

    // Garantizar mínimo 4 recomendaciones (fallback reglas)
    if (recomendaciones.length < 4) {
      const fallbacks = ['contenedores_opt', 'agua_refill', 'embajadores', 'educacion_ambiental'];
      for (const fb of fallbacks) {
        if (recomendaciones.length >= 4) break;
        if (!recomendaciones.find(r => r.id === fb) && TEMPLATES[fb]) {
          const tmpl = TEMPLATES[fb];
          recomendaciones.push({
            id: fb,
            titulo: tmpl.titulo,
            descripcion: tmpl.descripcion(ctx),
            impacto: tmpl.impacto,
            reduccion_co2_kg: parseFloat(tmpl.reduccion_co2(ctx)),
            dificultad: tmpl.dificultad,
            icono: tmpl.icono,
            prioridad: PRIORIDAD[tmpl.impacto] || 1,
          });
        }
      }
    }

    return recomendaciones.sort((a, b) => b.prioridad - a.prioridad);
  }
}

module.exports = new RecomendadorService();
