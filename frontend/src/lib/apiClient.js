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

// 401 auto-handler. If the backend rejects a token as expired/invalid, sign the
// user out of Supabase and bounce them to the landing page so they can sign in
// again — otherwise stale sessions silently produce "failed to update" toasts
// with no obvious remedy. Skip the redirect if we're already on landing to
// avoid loops, and let the caller still see the error for their own logging.
let _redirecting = false
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Dev/e2e bypass only: a bypass session has no real Supabase token, so
    // every real backend call 401s - without this, the redirect-to-login
    // below would fire instantly and make the bypass unusable for local
    // testing. Gated to DEV builds (see AuthContext.getDevBypassUser) so
    // flipping this flag in production can't suppress the real 401 safety
    // net for a real session.
    const isBypass = import.meta.env.DEV && typeof window !== 'undefined' &&
      (window.localStorage.getItem('e2e_mock_auth') === 'true' || window.localStorage.getItem('pf_dev_bypass') === 'true')
    if (error?.response?.status === 401 && typeof window !== 'undefined' && !_redirecting && !isBypass) {
      _redirecting = true
      try { await supabase.auth.signOut() } catch {}
      const path = window.location.pathname
      if (path !== '/' && path !== '') {
        window.location.assign('/')
      } else {
        _redirecting = false
      }
    }
    return Promise.reject(error)
  }
)

// One fresh key per user-initiated mutation (a real click - Generate My
// Path, Mark Done, Too Easy/Too Hard, Swap, Re-recommend), NOT per HTTP
// retry - lets the matching backend idempotency_service collapse a
// double-submit (a fast double-click before a button disables, a browser
// retrying a slow request, or a genuine "the first call actually
// succeeded but the client thought it failed" case) into one real
// mutation instead of double-creating a row, double-applying a mastery
// update, or inserting two different "new" resources for one logical
// action. Shared here (rather than re-implemented at each call site) so
// every mutating call in the app uses the exact same generation logic.
export function genIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for a non-secure-context/older browser where
  // crypto.randomUUID is unavailable - still unique enough for
  // de-duplicating a single click.
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default api
