import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import localApi from './vite-plugins/local-api.js'

dotenv.config({ path: '.env.local', quiet: true })

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
  server: {
    // host:true = escucha en todas las interfaces de red, no solo localhost,
    // para poder abrir el dashboard desde otro dispositivo de la misma red.
    host: true,
  },
})
