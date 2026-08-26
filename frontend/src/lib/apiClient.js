import axios from 'axios'
import { supabase } from './supabaseClient'

/**
 * In production the Vercel-hosted frontend proxies `/api/*` to the EC2 backend
 * via vercel.json rewrites (server-side), so calls stay same-origin HTTPS and
 * dodge mixed-content blocking. In local dev, VITE_API_URL points at
 * http://localhost:8000 directly.
 *
 * Precedence:
 *   1. VITE_API_URL if set (dev override)
 *   2. Same-origin (empty baseURL) in the browser — hits the Vercel proxy
 *   3. http://localhost:8000 as a last-resort dev fallback
 */
const explicit = import.meta.env.VITE_API_URL
const baseURL = explicit ?? (typeof window !== 'undefined' ? '' : 'http://localhost:8000')

const api = axios.create({ baseURL })

api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch (err) {
    console.warn('Could not attach auth header:', err)
  }
  return config
}, (error) => Promise.reject(error))

export default api
