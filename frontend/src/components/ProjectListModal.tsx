import React, { useEffect, useState } from 'react'
import { listProjects, deleteProject, type ProjectSummary } from '../lib/projects'
import { useTheme } from '../hooks/useTheme'

interface ProjectListModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (projectId: string) => void
  onNew: () => void
  currentProjectId: string | null
}

export default function ProjectListModal({ isOpen, onClose, onSelect, onNew, currentProjectId }: ProjectListModalProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { isDark } = useTheme()

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    listProjects()
      .then(setProjects)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [isOpen])

  if (!isOpen) return null

  function formatDate(iso: string) {
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, '0')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const mon = months[d.getMonth()]
    const year = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${day} ${mon} ${year} ${hh}:${mm}`
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete project "${title}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(null)
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
          borderRadius: 12, width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.35)' : '0 20px 60px rgba(0,0,0,0.2)',
          backdropFilter: isDark ? 'blur(20px)' : undefined
        }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111' }}>My Projects</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onNew} style={{
              padding: '6px 14px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, cursor: 'pointer',
              ...(isDark
                ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }
                : { background: '#2563eb', color: '#fff' })
            }}>
              + New Project
            </button>
            <button onClick={onClose} style={{ padding: '6px 10px', fontSize: 13, background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 24px 20px', overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 14 }}>Loading projects…</div>}
          {error && <div style={{ textAlign: 'center', padding: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}
          {!loading && !error && projects.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 14 }}>
              No projects yet. Click <strong>+ New Project</strong> to create one.
            </div>
          )}
          {!loading && projects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    border: p.id === currentProjectId ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    background: p.id === currentProjectId ? '#eff6ff' : '#fff',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (p.id !== currentProjectId) (e.currentTarget as HTMLDivElement).style.background = '#f9fafb' }}
                  onMouseLeave={e => { if (p.id !== currentProjectId) (e.currentTarget as HTMLDivElement).style.background = '#fff' }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14, color: '#111' }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      Updated {formatDate(p.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.title) }}
                    disabled={deleting === p.id}
                    style={{ padding: '4px 10px', fontSize: 12, color: '#ef4444', background: 'transparent', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', opacity: deleting === p.id ? 0.5 : 1 }}
                  >
                    {deleting === p.id ? '…' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
