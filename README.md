# Dashboard RRHH

Microservicio de solo lectura para visualizar las entrevistas guardadas por el
[agente de voz H-AI-R](../agente-voz%20H-AI-R). Vite + React en el frontend,
funciones serverless de Vercel en `/api` para leer MongoDB Atlas.

## Desarrollo local

```bash
npm install
npx vercel link
npx vercel env add MONGODB_URI     # mismo valor que server/.env del agente de voz
npx vercel env pull .env.local
npm run dev                        # corre `vercel dev` (Vite + /api juntos)
```

## Endpoints

- `GET /api/stats` — KPIs agregados (total, tasa de aprobación, puntaje promedio, desglose por vacante).
- `GET /api/entrevistas` — lista de entrevistas, filtrable con `?vacante=` y `?aprobado=true|false`.
- `GET /api/entrevistas/:id` — detalle completo de una entrevista (incluye transcripción).

## Despliegue

```bash
npx vercel        # preview
npx vercel --prod
```

Antes de desplegar, confirma en Atlas → Network Access que `0.0.0.0/0` esté
permitido (las funciones de Vercel usan IPs dinámicas), y que `MONGODB_URI`
esté configurado en el proyecto de Vercel para los tres entornos.
