import React, { useEffect, useRef, useState } from 'react'
import { PanelLeft, FileText, Clock, Trash2, Plus } from 'lucide-react'
import { listProjects, deleteProject, type ProjectSummary } from '../lib/projects'
import { useTheme } from '../hooks/useTheme'

interface SidebarProps {
    isOpen: boolean
    onToggle: () => void
    currentProjectId: string | null
    onSelectProject: (id: string) => void
    onNewProject: () => void
}

export default function Sidebar({ isOpen, onToggle, currentProjectId, onSelectProject, onNewProject }: SidebarProps) {
    const [projects, setProjects] = useState<ProjectSummary[]>([])
    const [loading, setLoading] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const { isDark } = useTheme()
    const sidebarRef = useRef<HTMLDivElement>(null)

    // Close sidebar when clicking outside
    useEffect(() => {
        if (!isOpen) return
        function handleClickOutside(e: MouseEvent) {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
                onToggle()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onToggle])

    // Fetch projects when sidebar opens
    useEffect(() => {
        if (!isOpen) return
        setLoading(true)
        listProjects()
            .then(setProjects)
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [isOpen])

    function formatRelative(iso: string) {
        const diff = Date.now() - new Date(iso).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        if (days < 7) return `${days}d ago`
        const d = new Date(iso)
        return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`
    }

    async function handleDelete(e: React.MouseEvent, id: string, title: string) {
        e.stopPropagation()
        if (!confirm(`Delete "${title}"?`)) return
        setDeletingId(id)
        try {
            await deleteProject(id)
            setProjects(prev => prev.filter(p => p.id !== id))
        } catch {}
        setDeletingId(null)
    }

    return (
        <div
            ref={sidebarRef}
            className={`sidebar-root fixed left-0 top-0 h-screen z-50 flex flex-col border-r shadow-xl transition-all duration-300 ease-in-out ${
                isDark ? 'border-white/5' : 'border-border/50 bg-gradient-to-b from-yellow-50 to-white'
            } ${isOpen ? 'w-64' : 'w-12'}`}
            style={isDark ? { background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' } : undefined}
        >
            <div className="p-2 flex items-center justify-center border-b border-border/20">
                <button
                    onClick={onToggle}
                    className={`p-2 rounded-md transition-colors ${isDark ? 'text-slate-400 hover:bg-white/10 hover:text-indigo-300' : 'hover:bg-yellow-100 text-muted-foreground hover:text-yellow-700'}`}
                    title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                    <PanelLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Collapsed icon */}
            {!isOpen && (
                <div className="flex flex-col items-center gap-3 pt-3">
                    <button
                        onClick={onToggle}
                        className={`p-2 rounded-md transition-colors ${isDark ? 'text-slate-400 hover:bg-white/10 hover:text-indigo-300' : 'hover:bg-yellow-100 text-muted-foreground hover:text-yellow-700'}`}
                        title="Recent Projects"
                    >
                        <Clock className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Sidebar Content (Hidden when collapsed) */}
            <div className={`flex-1 overflow-hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 invisible'}`}>
                <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Recent Projects
                        </p>
                        <button
                            onClick={onNewProject}
                            className={`p-1 rounded transition-colors ${isDark ? 'text-slate-400 hover:bg-white/10 hover:text-indigo-300' : 'hover:bg-yellow-100 text-muted-foreground hover:text-yellow-700'}`}
                            title="New project"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {loading && (
                        <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
                    )}

                    {!loading && projects.length === 0 && (
                        <p className="text-xs text-muted-foreground py-4 text-center">No projects yet</p>
                    )}

                    {!loading && projects.length > 0 && (
                        <div className="flex flex-col gap-0.5">
                            {projects.slice(0, 7).map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => onSelectProject(p.id)}
                                    className={`group flex items-start gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                                        p.id === currentProjectId
                                            ? (isDark ? 'bg-indigo-500/15 text-indigo-200' : 'bg-yellow-100/80 text-yellow-900')
                                            : (isDark ? 'hover:bg-white/5 text-foreground' : 'hover:bg-yellow-50 text-foreground')
                                    }`}
                                >
                                    <FileText className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                                        p.id === currentProjectId ? (isDark ? 'text-indigo-400' : 'text-yellow-600') : 'text-muted-foreground'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{p.title}</div>
                                        <div className="text-[10px] text-muted-foreground">{formatRelative(p.updated_at)}</div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, p.id, p.title)}
                                        disabled={deletingId === p.id}
                                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <div className="border-t border-border/30 my-2" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
