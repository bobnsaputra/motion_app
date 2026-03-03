import React from 'react'
import { Button } from '@/components/ui/button'
import { Eye, Trash2 } from 'lucide-react'
import { Keyframe, Character } from '../types'

interface OffstagePanelProps {
  isOpen: boolean
  onClose: () => void
  keyframe: Keyframe | null
  onUnhide: (charId: string) => void
  onUnhideAll: () => void
  onDelete: (charId: string) => void
}

export default function OffstagePanel({ isOpen, onClose, keyframe, onUnhide, onUnhideAll, onDelete }: OffstagePanelProps) {
  if (!isOpen) return null

  const hidden = keyframe ? keyframe.characters.filter(c => c.visible === false) : []

  return (
    <aside className="fixed right-4 top-20 z-50 w-64 max-h-[70vh] overflow-auto rounded-lg border border-border bg-white p-3 shadow-lg floating-panel">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Offstage</h4>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onUnhideAll} disabled={!hidden.length}>
            Unhide All
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <Trash2 className="h-4 w-4 opacity-0" />
          </Button>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">Hidden in this keyframe</div>

      <ul className="mt-2 space-y-2">
        {hidden.length === 0 && (
          <li className="text-sm text-muted-foreground">No offstage characters</li>
        )}
        {hidden.map((c: Character) => (
          <li key={c.id} className="flex items-center justify-between rounded-md border border-border p-2">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 36 36" className="rounded-full">
                <ellipse cx="18" cy="24" rx="9" ry="5" fill={c.shoulderColor || '#ff6b6b'} />
                <ellipse cx="18" cy="18" rx="6" ry="5" fill={c.color || '#ffd93d'} stroke="#ccc" strokeWidth="1" />
              </svg>
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.id}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => onUnhide(c.id)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
