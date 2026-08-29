import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const isDevBypass = typeof window !== 'undefined' && (localStorage.getItem('pf_dev_bypass') === 'true' || localStorage.getItem('e2e_mock_auth') === 'true')
  const defaultUser = isDevBypass ? {
    id: 'demo-user-1',
    email: 'hcltech@pathfinder.io',
    user_metadata: { full_name: 'HCL Tech', name: 'HCL Tech' }
  } : null
  const [session, setSession] = useState(defaultUser ? { user: defaultUser, access_token: 'demo-token' } : null)
  const [profile, setProfile] = useState(defaultUser ? { id: 'demo-user-1', target_role: 'Data Analyst', weekly_hours: 10 } : null)
  const [loading, setLoading] = useState(!isDevBypass)
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
      if (!session && typeof window !== 'undefined' && (localStorage.getItem('pf_dev_bypass') === 'true' || localStorage.getItem('e2e_mock_auth') === 'true')) {
        const mockUser = {
          id: 'demo-user-1',
          email: 'hcltech@pathfinder.io',
          user_metadata: { full_name: 'HCL Tech', name: 'HCL Tech' }
        }
        setSession({ user: mockUser, access_token: 'demo-token' })
        setProfile({ id: 'demo-user-1', target_role: 'Data Analyst', weekly_hours: 10 })
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
      if (!session && typeof window !== 'undefined' && (localStorage.getItem('pf_dev_bypass') === 'true' || localStorage.getItem('e2e_mock_auth') === 'true')) {
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

  const mockUser = typeof window !== 'undefined' && (window.localStorage.getItem('e2e_mock_auth') || window.localStorage.getItem('pf_dev_bypass')) ? {
    id: "11111111-1111-1111-1111-111111111111",
    email: "hcltech@pathfinder.ai",
    user_metadata: { full_name: "HCL Tech", name: "HCL Tech" }
  } : null
  const effectiveSession = session || (mockUser ? { user: mockUser } : null)
  const effectiveUser = session?.user || mockUser
  const effectiveProfile = profile || (mockUser ? { id: mockUser.id, target_role: 'Data Analyst', weekly_hours: 10, goal_text: 'Become a Data Analyst with Python and SQL' } : null)
  const effectiveLoading = mockUser ? false : loading

  return (
    <AuthContext.Provider
      value={{
        session: effectiveSession,
        loading: effectiveLoading,
        profile: effectiveProfile,
        updateProfile,
        refreshProfile: () => effectiveUser?.id && loadProfile(effectiveUser.id),
        signIn,
        signUp,
        signInWithGoogle,
        signInWithGithub,
        linkGithub,
        signOut,
        user: effectiveUser,
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
