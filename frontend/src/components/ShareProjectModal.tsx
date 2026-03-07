import React, { useEffect, useState } from 'react'
import { listProjectShares, shareProject, revokeShare, updateSharePermission, type ShareRow } from '../lib/sharing'
import { useTheme } from '../hooks/useTheme'

interface ShareProjectModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectTitle: string
}

export default function ShareProjectModal({ isOpen, onClose, projectId, projectTitle }: ShareProjectModalProps) {
  const [shares, setShares] = useState<ShareRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [sharing, setSharing] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const { isDark } = useTheme()

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    listProjectShares(projectId)
      .then(setShares)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [isOpen, projectId])

  if (!isOpen) return null

  async function handleShare(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setSharing(true)
    setError(null)
    try {
      const row = await shareProject(projectId, trimmed, permission)
      setShares(prev => {
        const existing = prev.findIndex(s => s.shared_with_email === trimmed)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = row
          return updated
        }
        return [row, ...prev]
      })
      setEmail('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSharing(false)
    }
  }

  async function handleRevoke(shareId: string) {
    setRevoking(shareId)
    try {
      await revokeShare(shareId)
      setShares(prev => prev.filter(s => s.id !== shareId))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRevoking(null)
    }
  }

  async function handlePermissionChange(shareId: string, perm: 'view' | 'edit') {
    try {
      await updateSharePermission(shareId, perm)
      setShares(prev => prev.map(s => s.id === shareId ? { ...s, permission: perm } : s))
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div style={{
        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(0,0,0,0.4)',
        backdropFilter: isDark ? 'blur(8px)' : 'blur(2px)'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
          background: isDark ? 'rgba(255,255,255,0.97)' : '#fff',
          borderRadius: 12, width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.35)' : '0 20px 60px rgba(0,0,0,0.2)',
        }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111' }}>Share Project</h2>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{projectTitle}</div>
          </div>
          <button onClick={onClose} style={{ padding: '6px 10px', fontSize: 13, background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>
            Close
          </button>
        </div>

        {/* Share form */}
        <form onSubmit={handleShare} style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              flex: 1, padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db',
              outline: 'none', background: '#fff', color: '#111'
            }}
          />
          <select
            value={permission}
            onChange={e => setPermission(e.target.value as 'view' | 'edit')}
            style={{ padding: '8px 8px', fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#111', cursor: 'pointer' }}
          >
            <option value="view">View</option>
            <option value="edit">Edit</option>
          </select>
          <button
            type="submit"
            disabled={sharing || !email.trim()}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, cursor: 'pointer',
              background: '#2563eb', color: '#fff', opacity: sharing || !email.trim() ? 0.5 : 1
            }}
          >
            {sharing ? '…' : 'Share'}
          </button>
        </form>

        {/* Shares list */}
        <div style={{ padding: '12px 24px 20px', overflowY: 'auto', flex: 1 }}>
          {error && <div style={{ padding: '8px 0', color: '#ef4444', fontSize: 13 }}>{error}</div>}
          {loading && <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 14 }}>Loading…</div>}
          {!loading && shares.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 14 }}>
              Not shared with anyone yet.
            </div>
          )}
          {!loading && shares.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shares.map(s => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8,
                    border: '1px solid #e5e7eb', background: '#fff',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.shared_with_email}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                      {s.shared_with_id ? 'Registered user' : 'Pending invite'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <select
                      value={s.permission}
                      onChange={e => handlePermissionChange(s.id, e.target.value as 'view' | 'edit')}
                      style={{ padding: '4px 6px', fontSize: 12, borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', color: '#111', cursor: 'pointer' }}
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </select>
                    <button
                      onClick={() => handleRevoke(s.id)}
                      disabled={revoking === s.id}
                      style={{ padding: '4px 10px', fontSize: 12, color: '#ef4444', background: 'transparent', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', opacity: revoking === s.id ? 0.5 : 1 }}
                    >
                      {revoking === s.id ? '…' : 'Revoke'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
