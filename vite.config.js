import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import localApi from './vite-plugins/local-api.js'

dotenv.config({ path: '.env.local', quiet: true })

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
})
