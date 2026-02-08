import React from 'react'
// import { User } from './types'
// import Login from './components/Login'
import StageBlockingApp from './components/StageBlockingApp'

const guestUser = { id: 0, username: 'Guest', email: '' }

export default function App() {
  // Auth bypassed for development — restore later
  return <StageBlockingApp user={guestUser} onLogout={() => {}} />
}
