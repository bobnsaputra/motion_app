import React, { useState, useRef } from 'react'
import { X, UploadCloud, Trash2, Music } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'

interface AudioModalProps {
  onClose: () => void
  currentAudio?: { url: string; name: string; path: string }
  onSave: (audio: { url: string; name: string; path: string } | undefined) => void
  projectId: string
  keyframeId: number
}

export default function AudioModal({
  onClose,
  currentAudio,
  onSave,
  projectId,
  keyframeId
}: AudioModalProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Only allow .mp3 files
    if (!file.name.toLowerCase().endsWith('.mp3')) {
      setError('Only .mp3 files are allowed.')
      return
    }

    // Limit to under 10MB to be polite
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Max 10MB please.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Secure Cloud Path pattern: user_id/project_id/keyframe_id_timestamp.mp3
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Authentication required")

      const fileExt = file.name.split('.').pop()
      const fileName = `${keyframeId}_${Date.now()}.${fileExt}`
      const storagePath = `${session.user.id}/${projectId}/${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from('project-audio')
        .upload(storagePath, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage
        .from('project-audio')
        .getPublicUrl(data.path)

      onSave({
        url: publicData.publicUrl,
        name: file.name,
        path: data.path,
      })
      onClose()

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error uploading file')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentAudio) return
    setError(null)
    setUploading(true)

    try {
      // Best-effort destroy from storage
      await supabase.storage.from('project-audio').remove([currentAudio.path])
      onSave(undefined)
      onClose()
    } catch (err: any) {
      console.error(err)
      setError('Failed to physically delete sound: ' + err.message)
      setUploading(false)
    }
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div 
        className="fixed left-[50%] top-[50%] z-50 flex w-full max-w-md translate-x-[-50%] translate-y-[-50%] flex-col rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] shadow-2xl p-6"
        role="dialog"
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Music className="w-5 h-5 text-indigo-400" />
          Keyframe Sound Effect
        </h2>

        {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded">
              {error}
            </div>
        )}

        {currentAudio ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-[var(--color-foreground)] bg-opacity-5 rounded-lg border border-[var(--color-border)]">
              <p className="font-medium text-sm mb-3 truncate" title={currentAudio.name}>
                {currentAudio.name}
              </p>
              
              <audio 
                controls 
                className="w-full h-10 outline-none" 
                src={currentAudio.url}
                preload="metadata"
              >
                Your browser does not support audio playback.
              </audio>
            </div>

            <input 
              type="file" 
              accept="audio/mpeg,audio/mp3,.mp3" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Change Sound'}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                {uploading ? <span className="animate-pulse">Deleting...</span> : (
                  <>
                     <Trash2 className="w-4 h-4" />
                     Remove
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input 
              type="file" 
              accept="audio/mpeg,audio/mp3,.mp3" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`
                border-2 border-dashed border-[var(--color-border)] rounded-xl py-10
                flex flex-col items-center justify-center gap-3 transition-colors
                ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-500/5 hover:border-indigo-500/50 cursor-pointer'}
              `}
            >
              <UploadCloud className={`w-10 h-10 ${uploading ? 'text-gray-400 animate-bounce' : 'text-indigo-400'}`} />
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="font-semibold text-sm">
                  {uploading ? 'Uploading securely...' : 'Click to select audio file'}
                </span>
                <span className="text-xs opacity-60">MP3 files under 10MB</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
