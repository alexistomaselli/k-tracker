import { useEffect, useState, ReactNode } from 'react'
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import { Navigate } from 'react-router-dom'
import { Session, User } from '@supabase/supabase-js'

export function useAuth() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const STRICT = (import.meta.env.VITE_REQUIRE_AUTH as string | undefined) === 'true'
  const VERIFIED_REQUIRED = (import.meta.env.VITE_REQUIRE_EMAIL_VERIFIED as string | undefined) === 'true'

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false)
      return
    }
    const supabase = getSupabase()!
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const isAuthenticated = STRICT ? !!session : (!!session || !SUPABASE_CONFIGURED)
  const verified = !!user?.email_confirmed_at

  const signOut = async () => {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()!
    await supabase.auth.signOut()
  }

  return { loading, session, user, isAuthenticated, verified, requireEmailVerified: VERIFIED_REQUIRED, signOut }
}

import { useCurrentUser } from './useData'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, verified, requireEmailVerified } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requireEmailVerified && !verified) return <Navigate to="/login?verifyEmail=true" replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useCurrentUser()

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>

  if (!isAdmin) {
    // Redirect participants to their dashboard/tasks view if they try to access admin routes
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
