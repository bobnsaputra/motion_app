import React from 'react'
import { Keyframe } from '../types'
import { Button } from '@/components/ui/button'
import {
  Plus, Play, Square, ChevronLeft, ChevronRight, Pencil, Trash2, X
} from 'lucide-react'

interface TimelineProps {
  keyframes: Keyframe[]
  activeKeyframeIndex: number
  isPlaying: boolean
  onSelectKeyframe: (index: number) => void
  onAddKeyframe: () => void
  onDeleteKeyframe: (index: number) => void
  onRenameKeyframe: (index: number, name: string) => void
  onPlay: () => void
  onStop: () => void
  onPrev: () => void
  onNext: () => void
  // Keyframe mode toggle
  keyframeMode: boolean
  onToggleKeyframeMode: () => void
}

export default function Timeline({
  keyframes,
  activeKeyframeIndex,
  isPlaying,
  onSelectKeyframe,
  onAddKeyframe,
  onDeleteKeyframe,
  onRenameKeyframe,
  onPlay,
  onStop,
  onPrev,
  onNext,
  keyframeMode,
  onToggleKeyframeMode
}: TimelineProps) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [editValue, setEditValue] = React.useState('')

  if (!keyframeMode) {
    return (
      <div className="mt-3 flex items-center justify-center">
        <Button variant="outline" size="sm" onClick={onToggleKeyframeMode}>
          <Play className="h-4 w-4" />
          Keyframe Mode
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        {/* Mode label + close */}
        <div className="flex items-center gap-1.5 mr-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleKeyframeMode} title="Exit keyframe mode">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Playback controls */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} disabled={isPlaying || activeKeyframeIndex <= 0} title="Previous">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {isPlaying ? (
          <Button variant="default" size="icon" className="h-8 w-8" onClick={onStop} title="Stop">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="default" size="icon" className="h-8 w-8" onClick={onPlay} disabled={keyframes.length < 2} title="Play">
            <Play className="h-4 w-4" />
          </Button>
        )}

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} disabled={isPlaying || activeKeyframeIndex >= keyframes.length - 1} title="Next">
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border" />

        {/* Keyframe pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {keyframes.map((kf, i) => (
            <div key={kf.id} className="flex items-center">
              {/* Connector line between keyframes */}
              {i > 0 && <div className="h-px w-4 bg-border" />}
              <div
                className={`group relative flex items-center rounded-md border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                  i === activeKeyframeIndex
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent'
                }`}
                onClick={() => !isPlaying && onSelectKeyframe(i)}
              >
                {editingIndex === i ? (
                  <input
                    autoFocus
                    className="w-16 bg-transparent text-xs outline-none"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => {
                      if (editValue.trim()) onRenameKeyframe(i, editValue.trim())
                      setEditingIndex(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editValue.trim()) onRenameKeyframe(i, editValue.trim())
                        setEditingIndex(null)
                      }
                      if (e.key === 'Escape') setEditingIndex(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span>{kf.label}</span>
                    <div className="ml-1 hidden gap-0.5 group-hover:flex">
                      <button
                        className="rounded p-0.5 hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingIndex(i)
                          setEditValue(kf.label)
                        }}
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      {keyframes.length > 1 && (
                        <button
                          className="rounded p-0.5 hover:bg-destructive/10 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteKeyframe(i)
                          }}
                          title="Delete keyframe"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add keyframe */}
        <Button variant="outline" size="sm" className="h-7 ml-1" onClick={onAddKeyframe} disabled={isPlaying} title="Add keyframe">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>

        {/* Keyframe counter */}
        <span className="ml-auto text-xs text-muted-foreground">
          {activeKeyframeIndex + 1} / {keyframes.length}
        </span>
      </div>
    </div>
  )
}
