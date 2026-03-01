import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { User } from './types'
import Login from './components/Login'
import StageBlockingApp from './components/StageBlockingApp'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
          email: session.user.email || '',
        })
      }
      setIsAuthChecking(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
          email: session.user.email || '',
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (isAuthChecking) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '16px',
        background: 'linear-gradient(to bottom, #fffdf0 0%, #fff9e6 35%, #fff7d6 60%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid rgba(180, 160, 100, 0.2)',
          borderTopColor: '#b8960c',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: '#7a6c3a', fontSize: 14, letterSpacing: '0.02em' }}>Loading…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />
  }

  return <StageBlockingApp user={user} onLogout={async () => {
    await supabase.auth.signOut()
    setUser(null)
  }} />
}
