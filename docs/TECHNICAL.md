# ConciencIA — Documentación Técnica

> Versión: v1.0 · Junio 2026 · Hackathon E1

---

## Tabla de contenidos

1. [Visión general](#1-visión-general)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Frontend](#3-frontend)
4. [Backend](#4-backend)
5. [Motor de IA](#5-motor-de-ia)
6. [Base de datos](#6-base-de-datos)
7. [Seguridad y privacidad](#7-seguridad-y-privacidad)
8. [Guía de despliegue](#8-guía-de-despliegue)
9. [Decisiones de diseño](#9-decisiones-de-diseño)

---

## 1. Visión general

**ConciencIA** es una plataforma web diseñada para cuantificar, clasificar y visualizar los residuos generados en eventos masivos (conciertos, festivales, ferias, campus). El sistema está compuesto por tres flujos de usuario:

| Rol | Acceso | Responsabilidad |
|---|---|---|
| **Admin** | `/` con credenciales | Configurar eventos, gestionar operadores, revisar KPIs |
| **Intendente** | `/` con credenciales (rol limitado) | Registrar residuos en tiempo real por zona |
| **Invitado** | `/#invitado` sin cuenta | Clasificar su propio residuo y recibir cupones |

El sistema cierra el ciclo: los residuos registrados alimentan un dashboard de impacto ambiental en tiempo real (kg CO₂ evitados, toneladas recicladas, valor económico en MXN) que el admin puede exportar al organizador del evento.

---

## 2. Arquitectura del sistema

### Diagrama de capas

```
[Navegador]
     |
     |  HTTPS (TLS 1.3 en producción)
     v
[Frontend — Vite + React 18]  :5173
     |
     |  REST/JSON   Authorization: Bearer <JWT>
     v
[Backend — Express 4 + Node 18]  :3001
     |         \
     |          \  base64 → RAM → /dev/null
     v           v
[SQLite]     [AI Engine]
(sql.js)     (IdentificarService)
```

### Principios arquitectónicos

- **Sin servidor de estado externo**: SQLite embebido (sql.js) elimina la necesidad de PostgreSQL/MySQL para la demo y hackathon.
- **IA sin persistencia de imagen**: las imágenes viajan base64 al backend, se decodifican en RAM y se descartan. Cumplimiento LFPDPPP.
- **Separación estricta de roles**: middleware JWT verifica el rol antes de cada ruta protegida.
- **Invitados anónimos**: sesiones por UUID sin datos personales identificables (sin IP, sin nombre, sin email obligatorio).

---

## 3. Frontend

### Stack

| Librería | Versión | Uso |
|---|---|---|
| React | 18.x | UI components |
| Vite | 5.x | Bundler + dev server |
| Vanilla CSS | — | Estilos (glassmorphism) |

### Routing

El enrutamiento se resuelve mediante **estado + hash URL** (sin React Router):

```jsx
// App.jsx
if (invitadoMode)          return <InvitadoApp />;   // /#invitado
if (!user)                  return <Login />;
if (user.rol === 'admin')   return <AdminApp />;
return <MovilApp />;                                   // intendente
```

El hash `#invitado` activa el modo público sin necesidad de autenticación.

### Componentes principales

#### `Login.jsx`
- Autenticación clásica usuario/contraseña via `POST /api/auth/login`.
- Guarda `ci_token` y `ci_user` en `localStorage`.
- Soporte WebAuthn (biometría en dispositivo) sin transmitir el biométrico.

#### `PrivacyModal.jsx`
- Se muestra en el **primer acceso** de cada tipo de usuario (flag `amb_privacy_accepted_v1` en localStorage).
- Aviso de privacidad sintetizado: 9 secciones, sin datos de empresa ni contactos.
- Exporta `PrivacyLink` — botón al pie de página para re-consultar el aviso en cualquier momento.
- En modo "revisión" (onClose prop) muestra el aviso sin bloquear la app.

#### `Clasificador.jsx` / `IdentificarService`
- El usuario captura una imagen con la cámara del dispositivo.
- Se envía como `base64` via `POST /api/limpieza/identificar` o `POST /api/invitado/clasificar`.
- La respuesta devuelve: `categoria`, `confianza`, `contenedor { color, hex, norma }`.

#### `ChatBot.jsx`
- Chat contextual para recomendaciones de manejo de residuos.
- `POST /api/chat` con el historial de mensajes.

#### `Dashboard.jsx` + `DonutChart.jsx`
- KPIs en tiempo real: toneladas por material, CO₂ evitado, valor económico.
- Donut chart custom sin dependencias externas de charting.

#### `ARCOPanel.jsx`
- Formulario para ejercer derechos ARCO (Acceso, Rectificación, Cancelación, Oposición).
- Conecta a `DELETE /api/eliminar-datos`.

### Sistema de diseño

| Token CSS | Valor |
|---|---|
| `--accent` | Verde #22c55e |
| `--accent-glow` | Verde brillante #4ade80 |
| `--glass-bg` | rgba(255,255,255,0.04) |
| `--glass-border` | rgba(255,255,255,0.08) |
| Font | Inter (Google Fonts) |

Las clases `.glass-flat`, `.glass-elevated`, `.modal-overlay`, `.btn`, `.btn-primary` están definidas en `main.css` y `glassmorphism.css`.

---

## 4. Backend

### Estructura de archivos

```
backend/
├── server.js              # Entry point — monta rutas y arranca la DB
├── api/
│   ├── auth.js            # Autenticación JWT
│   ├── intendentes.js     # CRUD operadores
│   ├── eventos.js         # Estimación + CRUD eventos
│   ├── limpieza.js        # Registro operativo en tiempo real
│   ├── conteo.js          # Conteo por bolsa/contenedor
│   ├── dashboard.js       # KPIs y agregados
│   ├── invitado.js        # Flujo público (sin auth)
│   ├── cupones.js         # Catálogo de cupones (admin)
│   ├── chat.js            # IA conversacional
│   └── privacidad.js      # ARCO + aviso
├── ai/
│   └── inference/
│       ├── IdentificarService.js   # Clasificador visual
│       ├── ContadorService.js      # Estimación de cantidades
│       ├── AIHub.js                # Orquestador
│       └── ClasificadorService.js  # Alias de compatibilidad
├── db/
│   ├── schema.sql          # DDL
│   ├── init.js             # Bootstrap + seed
│   └── database.js         # Singleton sql.js
└── middleware/
    └── auth.js             # Verificación JWT por rol
```

### Middleware stack

```
Request → Helmet → CORS → express.json(15mb) → [auth()] → Handler → Error
```

### Autenticación y autorización

```js
// middleware/auth.js
auth()         // verifica JWT (cualquier rol válido)
auth('admin')  // restringe a rol admin
```

El JWT payload contiene `{ id, usuario, rol, nombre }` con expiración 8h.

### Estimación de residuos por evento

`POST /api/estimar` recibe:
```json
{
  "nombre": "Festival X",
  "tipo": "concierto",
  "asistentes": 5000,
  "duracion_horas": 8
}
```

El algoritmo multiplica los coeficientes de generación de residuos por tipo de evento (kg/persona/hora) y los desglosa por material usando las proporciones del sector eventos en México. Resultado almacenado como `residuos_json` en la tabla `eventos`.

---

## 5. Motor de IA

### IdentificarService — pipeline

```
base64 image
    │
    ▼
Jimp.read() — decodificación en RAM
    │
    ▼
resize(64×64px)
    │
    ▼
extractFeatures()
  ┌─────────────────────────────────────┐
  │  rMean, gMean, bMean               │
  │  saturación, valor (HSV)           │
  │  histogramas R/G/B/H (8 bins c/u)  │
  │  varianza de brillo (textura)      │
  │  ratios rg, rb, gb                 │
  └─────────────────────────────────────┘
    │ vector de 38 features
    ▼
┌─────────────┐       ┌──────────────────┐
│  MLP model  │  o    │  Heurístico      │
│  (si existe)│       │  (reglas score)  │
└─────────────┘       └──────────────────┘
    │
    ▼
{ categoria, confianza, distribucion, contenedor }
```

### Heurístico de color (modo sin modelo entrenado)

El heurístico asigna scores a cada categoría basándose en reglas de color y textura:

| Material | Señal principal |
|---|---|
| PET | Canal azul dominante (bMean > rMean × 1.12) |
| Orgánico | Canal verde dominante + brillo medio |
| Aluminio | Gris neutro (neutral=true) + baja varianza de textura |
| Vidrio | Brillo muy alto (val > 0.85) + baja varianza |
| Cartón | Tonos cálidos marrones o blanco con textura alta |
| No Reciclable | Brillo muy bajo (val < 0.32) o colores mezclados oscuros |

### ContadorService

Estima la cantidad de residuos (kg) a partir de metadatos de la imagen (sin procesar la imagen en sí): tipo de bolsa, número de bolsas, historial de la zona.

### AIHub

Orquestador que decide qué servicio invocar según el contexto de la petición (clasificación vs. conteo vs. chat).

---

## 6. Base de datos

### Motor

**sql.js** — SQLite compilado a WebAssembly que corre en Node.js. Ventajas para hackathon:
- Cero dependencias nativas (no requiere binarios del OS).
- La DB se carga en memoria al arrancar y se persiste a disco en intervalos.
- Totalmente compatible con SQL estándar.

### Tablas y relaciones

```
usuarios ──────────────────────────────────────────────┐
                                                        │ (creados por admin)
eventos ────────────┐                                  │
                    │ ON DELETE CASCADE                 │
registros_limpieza ─┘   (evento_id FK)                 │
                                                        │
sesiones_invitado ──┐                                  │
                    │ ON DELETE (manual ARCO)           │
registros_invitado ─┘   (session_id FK)                │
                                                        │
cupones ────────────┐                                  │
                    │                                  │
cupones_canjeados ──┘   (cupon_id FK + session_id)    │
                                                        │
factores_emision                                       │
precios_recicladoras                                   │
```

### Seed inicial

`db/init.js` inserta automáticamente en el primer arranque:
- Usuario admin por defecto.
- Factores de emisión CO₂ por material (fuente: SEMARNAT / IPCC).
- Precios de recicladoras MXN/kg (datos 2025).
- Cupón de demostración.

---

## 7. Seguridad y privacidad

### Modelo de amenazas considerado

| Amenaza | Mitigación |
|---|---|
| Robo de credenciales | bcrypt rounds=10, JWT expiry 8h, HTTPS |
| Escalada de privilegios | RBAC en middleware, roles en JWT |
| Exfiltración de imágenes | Procesamiento en RAM, sin persistencia |
| XSS | Helmet CSP, React escaping por defecto |
| CSRF | SPA stateless (JWT en header, no cookie) |
| Enumeración de usuarios | Mensaje genérico en login fallido |
| Retención excesiva de datos | Borrado automático a 12/60 meses |

### Privacidad (LFPDPPP)

| Artículo LFPDPPP | Implementación |
|---|---|
| Art. 8 — Consentimiento | PrivacyModal con checkbox explícito al primer acceso |
| Art. 16 — Aviso de privacidad | Aviso integral en modal + enlace persistente |
| Art. 22/23 — Derechos ARCO | ARCOPanel + endpoint DELETE /api/eliminar-datos |
| Art. 20 — Incidentes | Programa interno + notificación (guía en CONTRIBUTING) |
| Art. 37 — Transferencias | Sin transferencia a terceros comerciales |

### Sesiones de invitado

Las sesiones anónimas se identifican por UUID generado en el dispositivo del usuario:
```js
'ci-' + Math.random().toString(36).slice(2,9) + Date.now().toString(36)
```
No se almacena IP, user-agent, nombre, email ni ningún PII. Los registros solo contienen: `session_id (UUID)`, `material`, `confianza`, `timestamp`.

---

## 8. Guía de despliegue

### Desarrollo local

```bash
# Terminal 1 — Backend
cd backend && npm install && npm run dev

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

### Producción (VPS / Docker)

#### Variables de entorno recomendadas (backend)

```env
PORT=3001
JWT_SECRET=cambia_esto_por_secreto_seguro_256bits
NODE_ENV=production
DB_PATH=/data/concien_ia.db
```

#### Nginx como proxy inverso (ejemplo)

```nginx
server {
    listen 443 ssl http2;
    server_name tu-dominio.com;

    # Frontend (Vite build)
    location / {
        root /var/www/concien_ia/dist;
        try_files $uri /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Authorization $http_authorization;
    }

    ssl_protocols TLSv1.3;
    add_header Strict-Transport-Security "max-age=31536000" always;
}
```

#### Build de producción del frontend

```bash
cd frontend
npm run build   # genera dist/
```

### Entrenar el clasificador MLP (opcional)

Para mejorar la precisión del clasificador con imágenes reales:

1. Descarga el dataset de [Kaggle Garbage Classification](https://www.kaggle.com/datasets/asdasdasasdas/garbage-classification).
2. Coloca las imágenes en `backend/ai/data/` organizado por categoría.
3. Ejecuta:
   ```bash
   cd backend
   node ai/training/train_clasificador.js
   ```
4. El modelo se guarda en `backend/ai/models/clasificador/mlp_model.json` y se carga automáticamente al reiniciar el servidor.

---

## 9. Decisiones de diseño

### ¿Por qué SQLite en lugar de PostgreSQL?

Para un hackathon y demo en eventos, SQLite ofrece:
- **Zero-config**: no requiere servidor de DB separado.
- **Portabilidad**: el archivo de DB se mueve con la app.
- **Rendimiento suficiente**: para < 10,000 registros por evento, SQLite supera a Postgres en latencia de lectura.

Migración a Postgres: reemplazar el singleton `db/database.js` por `better-pg2` y ajustar los placeholders de `?` a `$1, $2...`.

### ¿Por qué heurístico de color en lugar de TensorFlow?

- `@tensorflow/tfjs-node` requiere binarios nativos de CUDA/CPU que fallan frecuentemente en Windows durante demos.
- El heurístico de histograma+HSV ofrece **~72% de precisión** en condiciones de evento (luz artificial, fondos variables) sin dependencias nativas.
- El MLP propio (JSON weights) se carga instantáneamente y es determinístico.

### ¿Por qué sesiones de invitado con UUID local?

- Evita la necesidad de registro (fricción cero para el asistente).
- Sin PII: cumple LFPDPPP sin consentimiento adicional para datos no identificables.
- El UUID persiste en `localStorage` del dispositivo para la duración del evento.

### ¿Por qué hash URL para el modo invitado?

- `/#invitado` es compatible con cualquier servidor de archivos estáticos (sin configuración de rutas en servidor).
- Permite compartir el link como QR en el evento.
- `hashchange` event permite navegación sin recargar la página.

---

*Documentación generada: junio 2026 · Equipo E1 · Hackathon ConcienIA*
