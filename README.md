# ♻ ConciencIA — Plataforma de Gestión de Residuos en Eventos Masivos

> **"Lo que no se mide se tira. Lo que se mide se transforma."**

ConciencIA es una plataforma web de código abierto que permite registrar, clasificar y analizar residuos generados en eventos masivos (conciertos, festivales, ferias, etc.) promoviendo la economía circular en México mediante IA, cupones de incentivo y dashboards de impacto ambiental en tiempo real.

---

## 📐 Arquitectura

```
┌─────────────────────────────────────────────────────┐
│              Usuarios / Clientes                    │
│   👤 Admin   📱 Intendente   🙋 Invitado/Asistente   │
└────────────────────┬────────────────────────────────┘
                     │  HTTPS
┌────────────────────▼────────────────────────────────┐
│           Frontend  ·  Vite + React                 │
│  AdminApp │ MovilApp │ InvitadoApp                  │
│  Login │ PrivacyModal │ ChatBot │ Clasificador       │
└────────────────────┬────────────────────────────────┘
                     │  REST / JSON  :3001
┌────────────────────▼────────────────────────────────┐
│        Backend  ·  Express.js + Node.js             │
│                                                     │
│  /auth  /intendentes  /eventos  /limpieza           │
│  /conteo  /dashboard  /invitado  /cupones           │
│  /chat  /privacidad                                 │
│                                                     │
│  Middleware: JWT Auth · Helmet · CORS               │
│                                                     │
│  ┌──────────────────────────────────────────┐      │
│  │  AI Engine                               │      │
│  │  IdentificarService (MLP + heurístico)   │      │
│  │  ContadorService · AIHub                 │      │
│  └──────────────────────────────────────────┘      │
└────────────────────┬────────────────────────────────┘
                     │  SQL
┌────────────────────▼────────────────────────────────┐
│     Almacenamiento  ·  SQLite (sql.js)              │
│  usuarios · eventos · registros_limpieza            │
│  sesiones_invitado · registros_invitado             │
│  cupones · precios_recicladoras                     │
└─────────────────────────────────────────────────────┘
```

> Las imágenes enviadas al clasificador de IA se procesan **exclusivamente en RAM** (sin persistir en disco), cumpliendo con la LFPDPPP.

---

## 🚀 Inicio rápido

### Prerequisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18 LTS |
| npm | 9+ |
| Git | 2.x |

### 1. Clonar el repositorio

```bash
git clone https://github.com/emiliopenarosas1/ConcienIA-Hackathon-E1.git
cd ConcienIA-Hackathon-E1
```

### 2. Backend

```bash
cd backend
npm install
npm run dev        # nodemon server.js → http://localhost:3001
```

El servidor crea y migra la base de datos SQLite automáticamente en el primer arranque.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev        # Vite → http://localhost:5173
```

### 4. Acceder a la app

| URL | Descripción |
|---|---|
| `http://localhost:5173` | App principal (Login → Admin / Intendente) |
| `http://localhost:5173/#invitado` | Vista pública para asistentes del evento |
| `http://localhost:3001/health` | Health-check del backend |

---

## 🗂 Estructura del proyecto

```
ConciencIA/
├── frontend/                    # Vite + React SPA
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx              # Router principal (roles)
│       ├── main.jsx
│       ├── components/
│       │   ├── AdminApp.jsx     # Shell del panel de administración
│       │   ├── MovilApp.jsx     # Shell del intendente (móvil)
│       │   ├── InvitadoApp.jsx  # Shell del asistente (público)
│       │   ├── Login.jsx        # Autenticación WebAuthn + JWT
│       │   ├── PrivacyModal.jsx # Aviso de privacidad LFPDPPP
│       │   ├── ChatBot.jsx      # Chat de IA para recomendaciones
│       │   ├── Clasificador.jsx # Clasificador visual de residuos
│       │   ├── Dashboard.jsx    # Métricas en tiempo real
│       │   ├── ARCOPanel.jsx    # Panel derechos ARCO
│       │   └── ...
│       ├── views/
│       │   ├── admin/           # Eventos, Historial, Intendencia, Cupones, Analytics
│       │   ├── movil/           # Registro, Identificar, MisRegistros
│       │   └── invitado/        # CamaraBasura, MiProgreso, MisCupones
│       └── styles/
│           ├── main.css
│           ├── global.css
│           ├── glassmorphism.css
│           └── animations.css
│
├── backend/                     # Express.js API
│   ├── server.js                # Entry point
│   ├── package.json
│   ├── api/
│   │   ├── auth.js              # POST /auth/login · GET /auth/me
│   │   ├── intendentes.js       # CRUD de operadores
│   │   ├── eventos.js           # Estimación de residuos por evento
│   │   ├── limpieza.js          # Registro en tiempo real por zona
│   │   ├── conteo.js            # Conteo por bolsa/contenedor
│   │   ├── dashboard.js         # KPIs, historial, zonas
│   │   ├── invitado.js          # Clasificación pública + canjes
│   │   ├── cupones.js           # CRUD cupones (admin)
│   │   ├── chat.js              # POST /chat (IA conversacional)
│   │   └── privacidad.js (*)    # DELETE /eliminar-datos · GET /aviso
│   ├── ai/
│   │   └── inference/
│   │       ├── IdentificarService.js  # Clasificador MLP + heurístico de color
│   │       ├── ContadorService.js     # Estimación de cantidad de residuos
│   │       ├── AIHub.js              # Orquestador de servicios IA
│   │       └── ClasificadorService.js # Alias de compatibilidad
│   ├── db/
│   │   ├── schema.sql           # DDL de todas las tablas
│   │   ├── init.js              # Inicialización y seed de DB
│   │   └── database.js          # Singleton de conexión sql.js
│   └── middleware/
│       └── auth.js              # Middleware JWT (rol: admin | intendente)
│
└── README.md
```

---

## 🎭 Roles y flujos

### 👤 Admin
- Crea y gestiona **eventos** con estimación automática de residuos (tipo evento × asistentes × duración).
- Gestiona el equipo de **intendentes** (altas, bajas, contraseñas).
- Administra el **catálogo de cupones** para incentivar a asistentes.
- Visualiza el **dashboard** con KPIs de impacto ambiental: kg CO₂ evitados, toneladas recicladas, valor económico de materiales.
- Accede al panel **ARCO** para gestionar solicitudes de derechos de datos.

### 📱 Intendente / Operador
- Registra bolsas de basura por **zona y tipo de material** desde su celular.
- Usa el **clasificador de imagen** para identificar el residuo con IA antes de registrarlo.
- Consulta su **historial de registros** del evento activo.

### 🙋 Invitado / Asistente (modo público)
- Accede sin cuenta vía `/#invitado` (sesión anónima UUID).
- Fotografía su residuo → la IA lo clasifica y le indica el contenedor correcto.
- Acumula participaciones y **canjea cupones** (descuentos, accesos futuros).
- Consulta su **progreso** de impacto ambiental personal.

---

## 🤖 Motor de IA

### IdentificarService
Clasifica residuos a partir de una imagen base64 en **6 categorías**:

| Material | Contenedor | Norma |
|---|---|---|
| PET | 🔵 Azul | NOM-161-SEMARNAT-2011 |
| Orgánico | 🟢 Verde | Compostaje / NOM-083 |
| Aluminio | 🟡 Amarillo | NOM-161-SEMARNAT-2011 |
| Vidrio | ⚪ Blanco | NOM-161-SEMARNAT-2011 |
| Cartón | ⬜ Gris | NOM-161-SEMARNAT-2011 |
| No Reciclable | ⬛ Negro | Disposición final NOM-083 |

**Jerarquía de inferencia:**
1. **MLP (Red Neuronal)** — si existe `backend/ai/models/clasificador/mlp_model.json` entrenado con imágenes reales (Kaggle).
2. **Heurístico de color** — extracción de features RGB+HSV + histogramas de 8 bins + análisis de varianza de textura. Activo por defecto.

> Las imágenes se procesan **sólo en RAM** (Jimp, resize 64×64px). Nunca se escriben a disco.

### Entrenar el modelo MLP (opcional)
```bash
cd backend
node ai/training/train_clasificador.js   # requiere dataset en ai/data/
```

---

## 🗄 Esquema de base de datos

| Tabla | Descripción |
|---|---|
| `usuarios` | Admins e intendentes (bcrypt + JWT) |
| `eventos` | Eventos con estimación de residuos en JSON |
| `registros_limpieza` | Registros por zona/tipo durante el evento |
| `sesiones_invitado` | Sesiones anónimas (sólo UUID, sin PII) |
| `registros_invitado` | Clasificaciones públicas sin imagen |
| `cupones` | Catálogo de beneficios configurables |
| `cupones_canjeados` | Canjes con código único por sesión |
| `factores_emision` | Factores CO₂/kg por material |
| `precios_recicladoras` | Precios MXN/kg de recicladoras (2025) |

---

## 🔌 API Reference

### Autenticación
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login usuario/contraseña → JWT 8h |
| GET | `/api/auth/me` | JWT | Datos del usuario autenticado |

### Eventos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/estimar` | admin | Crear evento con estimación de residuos |
| GET | `/api/eventos` | admin | Listar eventos |
| GET | `/api/eventos/:id` | admin | Detalle de un evento |

### Limpieza / Operación
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/limpieza/registro` | intendente | Registrar bolsa(s) por zona |
| POST | `/api/limpieza/identificar` | intendente | Clasificar imagen (IA) |
| GET | `/api/limpieza/:evento_id` | admin/intendente | Registros del evento |

### Intendentes
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/intendentes` | admin | Listar operadores |
| POST | `/api/intendentes` | admin | Crear operador |
| PUT | `/api/intendentes/:id` | admin | Editar operador |
| PATCH | `/api/intendentes/:id` | admin | Activar/desactivar |

### Dashboard
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/dashboard/:id` | admin | KPIs del evento |
| GET | `/api/dashboard/historial` | admin | Todos los eventos |
| GET | `/api/dashboard/zonas/:id` | admin | Desglose por zona |

### Invitado (público, sin auth)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/invitado/clasificar` | — | Clasificar imagen como invitado |
| GET | `/api/invitado/sesion/:id` | — | Estado de sesión anónima |
| POST | `/api/invitado/canjear` | — | Canjear cupón |
| GET | `/api/cupones` | — | Cupones activos disponibles |

### Cupones (admin)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/admin/cupones` | admin | Listar cupones |
| POST | `/api/admin/cupones` | admin | Crear cupón |
| PUT | `/api/admin/cupones/:id` | admin | Editar cupón |
| PATCH | `/api/admin/cupones/:id` | admin | Activar/desactivar |

### Chat IA
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/chat` | — | Pregunta al asistente de IA |

### Privacidad / ARCO
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| DELETE | `/api/eliminar-datos` | — | Eliminar datos de sesión (ARCO-Cancelación) |
| GET | `/api/aviso` | — | Texto del aviso de privacidad vigente |

---

## 🔒 Seguridad y privacidad

- **Autenticación**: JWT (8h) firmado con secreto de entorno + bcryptjs (rounds=10).
- **RBAC**: middleware `auth(rol)` verifica rol (`admin` | `intendente`) en cada ruta protegida.
- **Biometría**: WebAuthn en dispositivo del usuario — el backend recibe únicamente claves públicas criptográficas.
- **Imágenes**: procesadas en RAM únicamente, sin escritura a disco (LFPDPPP).
- **TLS**: se recomienda proxy inverso (nginx/Caddy) con TLS 1.3 en producción.
- **Headers**: Helmet.js activa CSP, HSTS, X-Frame-Options, etc.
- **Datos anónimos**: sesiones de invitados usan UUID sin PII (no nombre, no email, no IP fina).
- **Retención**: datos operativos 12 meses; contables/fiscales hasta 5 años.
- **ARCO**: endpoint `DELETE /api/eliminar-datos` para cancelación inmediata de datos de sesión.

---

## 🌱 Impacto ambiental — cálculo

```
kg_CO₂_evitados = Σ (kg_material × factor_emisión_kg_CO₂/kg)
valor_económico  = Σ (kg_material × precio_referencia_MXN/kg)
```

Los factores de emisión y precios de recicladoras se almacenan en la DB (`factores_emision`, `precios_recicladoras`) y pueden actualizarse desde el panel de admin.

---

## 🛠 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite 5, Vanilla CSS (glassmorphism) |
| Backend | Node.js 18, Express 4, Helmet, CORS |
| Base de datos | SQLite vía sql.js (en memoria + persistencia en disco) |
| IA / ML | MLP propio (JSON weights) + heurístico de color (Jimp) |
| Auth | JWT (jsonwebtoken) + bcryptjs + WebAuthn (dispositivo) |
| Empaquetado | Vite (frontend) · nodemon (backend dev) |

---

## 📋 Aviso de privacidad

ConciencIA opera conforme a la **Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)**. El aviso completo se muestra en la plataforma al primer acceso y puede consultarse en cualquier momento desde el enlace "Ver aviso de privacidad" en la interfaz.

**Vigente desde:** junio 2026 · **Versión:** v1.0-2026-06

---

## 🤝 Contribuir

1. Haz fork del repositorio.
2. Crea una rama desde `Frontend` o `Backend` según corresponda.
3. Realiza tus cambios y agrega tests si aplica.
4. Abre un Pull Request describiendo el cambio.

---

## 📄 Licencia

MIT © 2026 — Equipo E1 · Hackathon ConcienIA
