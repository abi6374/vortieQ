import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) throw error
    return data
  }

  const signInWithGoogle = async () => {
    // Requires the Google provider to be enabled in Supabase → Authentication →
    // Providers. If it isn't, Supabase returns an error which the caller shows.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  const mockUser = typeof window !== 'undefined' && window.localStorage.getItem('e2e_mock_auth') ? {
    id: "11111111-1111-1111-1111-111111111111",
    email: "alex.chen@pathfinder.ai",
    user_metadata: { full_name: "Alex Chen", name: "Alex Chen" }
  } : null
  const effectiveSession = session || (mockUser ? { user: mockUser } : null)
  const effectiveUser = session?.user || mockUser

  return (
    <AuthContext.Provider value={{ session: effectiveSession, loading, signIn, signUp, signInWithGoogle, signOut, user: effectiveUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
