import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, UploadCloud, Trash2, FileText, Download, File } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'

interface DocumentFile {
  name: string
  path: string
  url: string
  size: number
  created_at: string
}

interface DocumentsModalProps {
  onClose: () => void
  projectId: string
}

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx', 'rtf', 'txt'].includes(ext)) return '📝'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊'
  if (['ppt', 'pptx'].includes(ext)) return '📑'
  return '📎'
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD}d ago`
  return d.toLocaleDateString()
}

export default function DocumentsModal({ onClose, projectId }: DocumentsModalProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Authentication required')

      const folderPath = `${session.user.id}/${projectId}`
      const { data, error: listError } = await supabase.storage
        .from('project-documents')
        .list(folderPath, { sortBy: { column: 'created_at', order: 'desc' } })

      if (listError) throw listError

      const docs: DocumentFile[] = (data ?? [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => {
          const fullPath = `${folderPath}/${f.name}`
          const { data: publicData } = supabase.storage
            .from('project-documents')
            .getPublicUrl(fullPath)
          return {
            name: f.name,
            path: fullPath,
            url: publicData.publicUrl,
            size: f.metadata?.size ?? 0,
            created_at: f.created_at ?? new Date().toISOString(),
          }
        })

      setDocuments(docs)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleUpload = async (file: File) => {
    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`File type "${ext}" is not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`)
      return
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large (${formatFileSize(file.size)}). Maximum is ${formatFileSize(MAX_FILE_SIZE)}.`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Authentication required')

      // Use timestamp prefix to avoid name collisions, but keep original name readable
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storageName = `${Date.now()}_${safeName}`
      const storagePath = `${session.user.id}/${projectId}/${storageName}`

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(storagePath, file, { upsert: false })

      if (uploadError) throw uploadError

      // Refresh the list
      await loadDocuments()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      await handleUpload(files[i])
    }
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      await handleUpload(files[i])
    }
  }

  const handleDelete = async (doc: DocumentFile) => {
    if (!confirm(`Delete "${doc.name.replace(/^\d+_/, '')}"?`)) return
    setError(null)
    try {
      const { error: delError } = await supabase.storage
        .from('project-documents')
        .remove([doc.path])
      if (delError) throw delError
      setDocuments(prev => prev.filter(d => d.path !== doc.path))
    } catch (err: any) {
      setError('Failed to delete: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDownload = (doc: DocumentFile) => {
    const a = document.createElement('a')
    a.href = doc.url
    a.download = doc.name.replace(/^\d+_/, '') // Strip timestamp prefix for download
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  // Strip the timestamp prefix for display
  const displayName = (name: string) => name.replace(/^\d+_/, '')

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="fixed left-[50%] top-[50%] z-50 flex w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] shadow-2xl"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Project Documents
          </h2>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Upload zone */}
        <div className="px-6 pt-4">
          <input
            type="file"
            accept={ALLOWED_EXTENSIONS.join(',')}
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            disabled={uploading}
            className={`
              w-full border-2 border-dashed rounded-xl py-6
              flex flex-col items-center justify-center gap-2 transition-colors
              ${dragOver
                ? 'border-blue-500 bg-blue-500/10'
                : uploading
                  ? 'border-gray-300 opacity-50 cursor-not-allowed'
                  : 'border-[var(--color-border)] hover:bg-blue-500/5 hover:border-blue-500/50 cursor-pointer'
              }
            `}
          >
            <UploadCloud className={`w-8 h-8 ${uploading ? 'text-gray-400 animate-bounce' : dragOver ? 'text-blue-500' : 'text-blue-400'}`} />
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="font-semibold text-sm">
                {uploading ? 'Uploading…' : dragOver ? 'Drop files here' : 'Click or drag files to upload'}
              </span>
              <span className="text-xs opacity-60">PDF, Word, Excel, PowerPoint, TXT · Max 25MB each</span>
            </div>
          </button>
        </div>

        {/* Document list */}
        <div className="px-6 py-4 flex-1 max-h-[320px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground opacity-60">
              Loading documents…
            </div>
          ) : documents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground opacity-60">
              <File className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No documents uploaded yet.
              <br />
              <span className="text-xs">Upload scripts, rehearsal schedules, or set designs.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {documents.map((doc) => (
                <div
                  key={doc.path}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/10 group transition-colors"
                >
                  <span className="text-lg flex-shrink-0">{getFileIcon(doc.name)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" title={displayName(doc.name)}>
                      {displayName(doc.name)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)} · {timeAgo(doc.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDownload(doc)}
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(doc)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </>
  )
}
