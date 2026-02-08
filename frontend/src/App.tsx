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
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a0f',
        color: '#fff'
      }}>
        Loading...
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
