# Dashboard RRHH — H-AI-R

Segundo microservicio del ecosistema **H-AI-R**. Es el panel interno que usa
el equipo de Recursos Humanos para gestionar vacantes y dar seguimiento a las
entrevistas que realiza el [agente de voz H-AI-R](https://github.com/MiguelRArt/agente-voz-entrevistador)
(el primer microservicio: un entrevistador conversacional con IA que habla
con los candidatos, evalúa sus respuestas y guarda el resultado en MongoDB).

Este dashboard **no interactúa con el candidato** — es de uso exclusivo de
RRHH, y comparte la misma base de datos de MongoDB Atlas que el agente de voz.

## Qué hace

- **Vacantes**: RRHH crea, edita, pausa/cierra y elimina las vacantes desde
  aquí — es la fuente de verdad de qué posiciones existen.
- **Entrevistas**: lista y detalle de cada entrevista realizada por el
  agente de voz, con la evaluación generada por IA (aprobado/rechazado,
  puntaje, resumen, fortalezas, áreas de mejora) y la transcripción completa.
- **Pipeline (Kanban)**: tablero de arrastrar y soltar con los candidatos
  agrupados por estado de proceso (*pendiente*, *en revisión*, *contratado*,
  *descartado*) — independiente del veredicto que dio la IA, es el estado
  real que define RRHH.
- **Notas internas**: cada entrevista admite notas de RRHH, separadas de lo
  que generó la IA.
- **Vínculo vacante ↔ entrevista por id**: además de relacionarse por el
  texto de la vacante (como llega del agente de voz), cada entrevista se
  puede vincular explícitamente a una vacante real desde su ficha — así no
  se pierden candidatos por una tilde o mayúscula distinta en el texto.
- **Filtros**: por vacante, por veredicto de la IA, por estado del pipeline,
  por texto (nombre de candidato o título de vacante) y por rango de fechas,
  en todas las vistas relevantes.
- **Exportar a CSV**: tanto la lista de entrevistas como la de vacantes,
  respetando los filtros activos, para reportes fuera del dashboard.
- **Tema claro/oscuro**: con memoria de la preferencia del usuario y
  detección automática del tema del sistema la primera vez.

## Stack

- **Frontend**: [Vite](https://vite.dev) + React 19 + React Router.
- **Backend**: funciones serverless en `/api`, con la firma estándar de
  [Vercel Functions](https://vercel.com/docs/functions) — se despliegan tal
  cual, sin build adicional.
- **Base de datos**: MongoDB Atlas (mismo clúster que el agente de voz),
  driver oficial `mongodb`.
- **Desarrollo local sin depender de Vercel**: un plugin de Vite
  (`vite-plugins/local-api.js`) ejecuta los mismos archivos de `/api`
  directamente dentro del servidor de desarrollo — `npm run dev` es un único
  proceso local, sin `vercel dev` ni login.

## Estructura del proyecto

```
api/
  _lib/          # helpers compartidos: conexión Mongo, filtros, CSV, fechas
  entrevistas/    # GET/PATCH por id, listado con filtros, export CSV
  vacantes/       # CRUD completo, listado con filtros, export CSV
  stats.js        # KPIs agregados para el home
src/
  components/     # Select, StatusSelect, ScoreBadge, formularios, etc.
  hooks/          # useTheme
  lib/            # cliente de la API del propio dashboard, etiquetas de UI
  pages/          # DashboardHome, InterviewDetail, Pipeline, Vacantes*
vite-plugins/
  local-api.js    # ejecuta /api dentro de Vite en desarrollo local
```

## Modelo de datos (colección `agente_voz` en MongoDB Atlas)

**`entrevistas`** (la crea el agente de voz; este dashboard la lee y la
enriquece):

```
vacante, vacanteId, candidato, cedula, celular, transcripcion[],
aprobado, puntaje, resumen, fortalezas[], areasDeMejora[], creadoEn,
estadoProceso, notas   ← estadoProceso y notas los agrega este dashboard
```

**`vacantes`** (la crea y administra por completo este dashboard):

```
titulo, descripcion, departamento, ubicacion, modalidad,
tipoContrato, requisitos, estado, creadoEn, actualizadoEn
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/stats` | KPIs agregados (total, tasa de aprobación, puntaje promedio, desglose por vacante) |
| GET | `/api/entrevistas` | Lista paginada, filtrable por `vacante`, `vacanteId`, `aprobado`, `q`, `desde`, `hasta` |
| GET | `/api/entrevistas/:id` | Detalle completo, incluye transcripción |
| PATCH | `/api/entrevistas/:id` | Actualiza `estadoProceso`, `notas` y/o `vacanteId` |
| GET | `/api/entrevistas/export` | Exporta a CSV (mismos filtros que el listado) |
| GET | `/api/vacantes` | Lista paginada, filtrable por `q`, `estado`, `desde`, `hasta` |
| POST | `/api/vacantes` | Crea una vacante |
| GET | `/api/vacantes/:id` | Detalle de una vacante |
| PUT | `/api/vacantes/:id` | Edita una vacante (incluye cambiar `estado`) |
| DELETE | `/api/vacantes/:id` | Elimina una vacante |
| GET | `/api/vacantes/export` | Exporta a CSV (mismos filtros que el listado) |

## Desarrollo local

```bash
npm install
```

Crea `.env.local` en la raíz con la misma cadena de conexión que usa el
agente de voz:

```
MONGODB_URI=mongodb+srv://usuario:password@tu-cluster.mongodb.net/?...
```

```bash
npm run dev      # Vite + /api en un solo proceso, sin vercel dev
```

## Despliegue (Vercel)

Los archivos de `/api` ya están escritos con el formato que Vercel detecta
automáticamente — no requieren cambios para desplegarse.

```bash
npx vercel        # preview
npx vercel --prod
```

Antes de desplegar: confirma en Atlas → Network Access que `0.0.0.0/0` esté
permitido (las funciones de Vercel usan IPs dinámicas), y configura
`MONGODB_URI` como variable de entorno en el proyecto de Vercel para los
tres entornos (Development, Preview, Production).

## Nota sobre el vínculo con el agente de voz

El agente de voz ahora arma el plan de la entrevista a partir de una vacante
real seleccionada de la colección `vacantes`, y guarda tanto `vacante`
(título, texto libre) como `vacanteId` (el `_id` real) en cada entrevista
nueva — el vínculo queda hecho automáticamente, sin pasos manuales. El
selector "Vacante vinculada" en la ficha de cada entrevista sigue existiendo
para corregir un vínculo o para entrevistas antiguas, previas a este cambio,
que solo tienen el texto libre.
