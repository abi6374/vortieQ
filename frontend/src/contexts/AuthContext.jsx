import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

// Dev/e2e-only auth bypass - lets a local `vite dev` session or a Playwright
// run skip real Supabase auth by setting one of these localStorage flags.
// `import.meta.env.DEV` is a Vite build-time constant: false in a real
// `vite build` (what actually ships to Vercel), so this whole branch is
// dead code the bundler can strip from the production bundle - it is not
// just "hard to trigger in prod", it does not exist in the shipped JS at
// all. Previously this had no such gate and was duplicated across four
// separate spots in this file (three of which is a plain runtime
// localStorage check with ZERO environment gating) - meaning anyone
// opening devtools on the live production site could set one flag and get
// a fully fabricated session + profile with no backend involvement
// whatsoever. Consolidated into one helper, one flag check, one mock
// object - real prod code no longer sees fabricated learner data.
function getDevBypassUser() {
  if (!import.meta.env.DEV) return null
  if (typeof window === 'undefined') return null
  if (localStorage.getItem('pf_dev_bypass') !== 'true' && localStorage.getItem('e2e_mock_auth') !== 'true') return null
  return {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'dev-bypass@pathfinder.local',
    user_metadata: { full_name: 'Dev Bypass User', name: 'Dev Bypass User' },
  }
}

export function AuthProvider({ children }) {
  const devUser = getDevBypassUser()
  const [session, setSession] = useState(devUser ? { user: devUser, access_token: 'dev-bypass-token' } : null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(!devUser)
  const [oauthError, setOauthError] = useState(null)

  const loadProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (data) setProfile(data)
    } catch (err) {
      console.warn('Could not load profile:', err)
    }
  }

  useEffect(() => {
    let mounted = true

    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const search = typeof window !== 'undefined' ? window.location.search : ''
    const isOAuthCallback =
      hash.includes('access_token') ||
      search.includes('code=') ||
      search.includes('source=github') ||
      hash.includes('error=')

    // Check for OAuth error in URL params
    const rawParams = search || (hash.startsWith('#') ? '?' + hash.slice(1) : hash)
    if (rawParams) {
      try {
        const params = new URLSearchParams(rawParams)
        const errDesc = params.get('error_description') || params.get('error')
        if (errDesc) {
          const formatted = decodeURIComponent(errDesc.replace(/\+/g, ' '))
          console.warn('[AuthContext] OAuth provider error:', formatted)
          setOauthError(formatted)
          setLoading(false)
          return
        }
      } catch (e) {
        console.warn('[AuthContext] Could not parse URL params:', e)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session && getDevBypassUser()) {
        // Dev/e2e bypass already seeded into state by useState() above -
        // nothing real to reconcile against, so just stop loading.
        setLoading(false)
        return
      }
      setSession(session)
      if (session?.user?.id) loadProfile(session.user.id)
      if (session || !isOAuthCallback) {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (!session && getDevBypassUser()) {
        return
      }
      setSession(session)
      if (session?.user?.id) await loadProfile(session.user.id)
      if (session || event === 'SIGNED_IN' || event === 'USER_UPDATED' || !isOAuthCallback) {
        setLoading(false)
      }
    })

    // 6-second safety timeout so we never hang indefinitely on broken OAuth
    let timeoutId
    if (isOAuthCallback) {
      timeoutId = setTimeout(() => {
        if (mounted) setLoading(false)
      }, 6000)
    }

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data?.user?.id) loadProfile(data.user.id)
    return data
  }

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, name: fullName } }
    })
    if (error) throw error
    return data
  }

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding?source=google` },
    })
    if (error) throw error
    if (data?.url) {
      window.location.assign(data.url)
    }
    return data
  }

  const signInWithGithub = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/onboarding?source=github`,
        scopes: 'read:user repo user:email',
        queryParams: {
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
    if (data?.url) {
      window.location.assign(data.url)
    }
    return data
  }

  // Link GitHub to the CURRENTLY signed-in user (Google, email, whatever they
  // used originally) - this is the "Connect GitHub" action from the roadmap
  // popup and the Account page, always used on an already-authenticated
  // learner. Deliberately NOT signInWithOAuth: that starts a brand-new
  // top-level sign-in and, if this GitHub account has never been seen by
  // Supabase before, GoTrue creates a SEPARATE auth.users row and the
  // browser's session silently switches to that new, empty account -
  // exactly the "does this create a separate user?" risk this feature must
  // avoid. supabase.auth.linkIdentity() is the purpose-built API for adding
  // a second provider to the CURRENT session's user (see
  // docs/security_audit.md and Supabase's identity-linking guide) - it
  // requires "Manual linking" enabled in the project's Auth > Providers
  // settings (this project already has at least one real linked identity in
  // auth.identities, so it's on; if this ever starts failing with a
  // "manual linking is disabled" error, that's the toggle to check).
  const linkGithub = async () => {
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/account?github_linked=true`,
          scopes: 'read:user repo user:email',
          queryParams: { prompt: 'consent' },
        },
      })
      if (error) throw error
      if (data?.url) {
        window.location.assign(data.url)
      }
      return data
    } catch (err) {
      // Real, actionable message instead of Supabase's raw error - the
      // username-sync path (already on this same screen/modal) still works
      // regardless of this project setting, so point there rather than
      // leaving the learner stuck on a cryptic OAuth failure.
      const msg = err?.message?.toLowerCase() || ''
      if (msg.includes('manual linking is disabled') || msg.includes('404') || err?.status === 404) {
        throw new Error(
          'GitHub OAuth linking is currently disabled in this project\'s settings. Please use the username sync option above instead.'
        )
      }
      throw err
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const updateProfile = async (updatedData) => {
    if (!updatedData) return
    setProfile((prev) => ({ ...prev, ...updatedData }))
    if (updatedData.full_name) {
      try {
        await supabase.auth.updateUser({
          data: { full_name: updatedData.full_name, name: updatedData.full_name }
        })
      } catch (err) {
        console.warn('Could not update auth metadata:', err)
      }
    }
  }

  // session/profile/loading already correctly reflect the dev bypass (seeded
  // once via useState above, in DEV builds only) or a real Supabase session -
  // no separate "effective" fallback needed, and critically, no fabricated
  // profile fields (target_role/weekly_hours/goal_text) presented as if they
  // were real learner data.
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        profile,
        updateProfile,
        refreshProfile: () => session?.user?.id && loadProfile(session.user.id),
        signIn,
        signUp,
        signInWithGoogle,
        signInWithGithub,
        linkGithub,
        signOut,
        user: session?.user || null,
        oauthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
