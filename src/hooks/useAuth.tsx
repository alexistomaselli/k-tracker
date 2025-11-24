import { useEffect, useState } from 'react'
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import { Navigate } from 'react-router-dom'

export function useAuth() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const STRICT = (import.meta.env.VITE_REQUIRE_AUTH as string | undefined) === 'true'

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
  return { loading, session, user, isAuthenticated }
}

export function RequireAuth({ children }: { children: any }) {
  const { loading, isAuthenticated } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}
