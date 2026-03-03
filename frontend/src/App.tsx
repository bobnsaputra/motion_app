import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { User } from './types'
import Login from './components/Login'
import StageBlockingApp from './components/StageBlockingApp'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const { isDark } = useTheme()

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
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        background: isDark
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: isDark ? '3px solid rgba(255,255,255,0.08)' : '3px solid rgba(255, 255, 255, 0.15)',
          borderTopColor: isDark ? '#818cf8' : '#ffffff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: isDark ? 'rgba(148,163,184,0.7)' : 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: "'Inter', sans-serif", letterSpacing: '0.05em' }}>Loading…</span>
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
