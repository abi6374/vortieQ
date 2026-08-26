import axios from 'axios'
import { supabase } from './supabaseClient'

/**
 * Pick a safe baseURL for API calls.
 *
 * In production the Vercel-hosted frontend proxies `/api/*` to the EC2 backend
 * via vercel.json rewrites, so calls stay same-origin HTTPS and dodge
 * mixed-content blocking. In local dev, VITE_API_URL points at
 * http://localhost:8000 directly.
 *
 * Guardrail: if the page is loaded over HTTPS and someone left VITE_API_URL
 * pointing at a plain-HTTP host (other than localhost), IGNORE that var and
 * fall through to same-origin so the Vercel proxy handles the HTTP hop. This
 * exists because a stale VITE_API_URL on Vercel silently reintroduces
 * mixed-content 401s that are painful to diagnose.
 */
function resolveBaseURL() {
  const explicit = import.meta.env.VITE_API_URL
  if (typeof window === 'undefined') {
    // SSR / build-time — trust env, fall back to localhost
    return explicit || 'http://localhost:8000'
  }
  const pageIsHttps = window.location.protocol === 'https:'
  if (explicit) {
    const isInsecure = explicit.startsWith('http://')
    const isLocalhost = /localhost|127\.0\.0\.1/.test(explicit)
    if (pageIsHttps && isInsecure && !isLocalhost) {
      console.warn(
        `[apiClient] Ignoring VITE_API_URL="${explicit}" — mixing HTTP into an HTTPS page. ` +
        `Falling back to same-origin so Vercel's /api/* rewrite handles the backend.`
      )
      return ''
    }
    return explicit
  }
  // No explicit URL: same-origin in browsers, localhost in tests/SSR.
  return ''
}

const api = axios.create({ baseURL: resolveBaseURL() })

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
