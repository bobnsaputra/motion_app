import React, { useState, useRef, useEffect } from 'react'
import { Character, User, Keyframe } from '../types'
import { Button } from '@/components/ui/button'
import {
  UserPlus, Trash2, Copy, Eraser, Undo2, Redo2,
  Settings, Save, LogOut, Menu, Film,
  Plus, Play, Square, ChevronLeft, ChevronRight, Pencil
} from 'lucide-react'
import ConfigMenu from './ConfigMenu'
import FileMenu from './FileMenu'

interface ToolbarProps {
  // Add mode
  addMode: boolean
  setAddMode: (fn: (s: boolean) => boolean) => void
  // Selection
  selectedCharId: string | null
  characters: Character[]
  awaitingDirectionFor: string | null
  // Character actions
  onDeleteSelected: () => void
  onDuplicateSelected: () => void
  onClearAll: () => void
  // History
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  // Name editing
  onNameChange: (name: string) => void
  // User
  user: User
  onLogout: () => void
  // Config menu
  configMenuOpen: boolean
  setConfigMenuOpen: (open: boolean) => void
  canvasSize: { width: number; height: number }
  onCanvasSizeChange: (size: { width: number; height: number }) => void
  defaultPersonSize: number
  defaultPersonColor: string
  defaultShoulderColor: string
  onSizeChange: (size: number) => void
  onColorChange: (head: string, shoulder: string) => void
  // File menu
  fileMenuOpen: boolean
  setFileMenuOpen: (open: boolean) => void
  onSave: () => void
  onLoad: () => void
  onExportJSON: () => void
  onImportJSON: () => void
  onExportPNG: () => void
  // Keyframe
  keyframeMode: boolean
  onToggleKeyframeMode: () => void
  // Timeline (only used when keyframeMode is on)
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
}

export default function Toolbar({
  addMode,
  setAddMode,
  selectedCharId,
  characters,
  awaitingDirectionFor,
  onDeleteSelected,
  onDuplicateSelected,
  onClearAll,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNameChange,
  user,
  onLogout,
  configMenuOpen,
  setConfigMenuOpen,
  canvasSize,
  onCanvasSizeChange,
  defaultPersonSize,
  defaultPersonColor,
  defaultShoulderColor,
  onSizeChange,
  onColorChange,
  fileMenuOpen,
  setFileMenuOpen,
  onSave,
  onLoad,
  onExportJSON,
  onImportJSON,
  onExportPNG,
  keyframeMode,
  onToggleKeyframeMode,
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
  onNext
}: ToolbarProps) {
  const selectedChar = selectedCharId ? characters.find((c) => c.id === selectedCharId) : null
  const awaitingChar = awaitingDirectionFor ? characters.find((c) => c.id === awaitingDirectionFor) : null
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const [editingKfIndex, setEditingKfIndex] = useState<number | null>(null)
  const [editKfValue, setEditKfValue] = useState('')

  return (
    <header className="flex flex-col gap-2 rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        {keyframeMode ? (
          <>
            {/* Keyframe mode toolbar */}
            <Button
              variant="default"
              size="sm"
              onClick={onToggleKeyframeMode}
              title="Exit Keyframe Mode (Esc)"
            >
              <Film className="h-4 w-4" />
              Keyframes (Esc)
            </Button>

            <div className="mx-1 h-6 w-px bg-border" />

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

            <div className="mx-1 h-6 w-px bg-border" />

            {/* Keyframe pills */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {keyframes.map((kf, i) => (
                <div key={kf.id} className="flex items-center">
                  {i > 0 && <div className="h-px w-4 bg-border" />}
                  <div
                    className={`group relative flex items-center rounded-md border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                      i === activeKeyframeIndex
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent'
                    }`}
                    onClick={() => !isPlaying && onSelectKeyframe(i)}
                  >
                    {editingKfIndex === i ? (
                      <input
                        autoFocus
                        className="w-16 bg-transparent text-xs outline-none"
                        value={editKfValue}
                        onChange={(e) => setEditKfValue(e.target.value)}
                        onBlur={() => {
                          if (editKfValue.trim()) onRenameKeyframe(i, editKfValue.trim())
                          setEditingKfIndex(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editKfValue.trim()) onRenameKeyframe(i, editKfValue.trim())
                            setEditingKfIndex(null)
                          }
                          if (e.key === 'Escape') setEditingKfIndex(null)
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <span>{kf.label}</span>
                        <div className="ml-1 hidden gap-0.5 group-hover:flex">
                          <button
                            className="rounded p-0.5 hover:bg-accent"
                            onClick={(e) => { e.stopPropagation(); setEditingKfIndex(i); setEditKfValue(kf.label) }}
                            title="Rename"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {keyframes.length > 1 && (
                            <button
                              className="rounded p-0.5 hover:bg-destructive/10 text-destructive"
                              onClick={(e) => { e.stopPropagation(); onDeleteKeyframe(i) }}
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

            {/* Counter */}
            <span className="ml-auto text-xs text-muted-foreground">
              {activeKeyframeIndex + 1} / {keyframes.length}
            </span>
          </>
        ) : (
          <>
            {/* Normal toolbar */}
            <div className="flex items-center gap-1.5">
              <Button
                variant={addMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAddMode((s) => !s)}
              >
                <UserPlus className="h-4 w-4" />
                {addMode ? 'Adding\u2026 (Esc)' : <span><u>A</u>dd</span>}
              </Button>

              {selectedCharId && (
                <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}

              {selectedCharId && (
                <Button variant="outline" size="sm" onClick={onDuplicateSelected}>
                  <Copy className="h-4 w-4" />
                  Duplicate
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={onClearAll}>
                <Eraser className="h-4 w-4" />
                Clear
              </Button>

              <div className="mx-1 h-6 w-px bg-border" />

              {selectedCharId && (
                <label className="flex items-center gap-1.5 text-sm">
                  Name:
                  <input
                    type="text"
                    maxLength={3}
                    value={selectedChar?.name ?? ''}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="h-8 w-14 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </label>
              )}
            </div>

            <p className="mx-2 text-sm text-muted-foreground">
              {awaitingDirectionFor
                ? `Set gaze: ${awaitingChar?.name ?? awaitingDirectionFor}`
                : selectedCharId
                  ? `${selectedChar?.name ?? selectedCharId} selected`
                  : 'Click to select \u00b7 drag to move'}
            </p>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)">
                <Redo2 className="h-4 w-4" />
              </Button>

              <div className="mx-1 h-6 w-px bg-border" />

              <Button
                variant="outline"
                size="sm"
                onClick={onToggleKeyframeMode}
                title="Keyframe Animation Mode"
              >
                <Film className="h-4 w-4" />
                <span><u>K</u>eyframes</span>
              </Button>

              <div className="mx-1 h-6 w-px bg-border" />

              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfigMenuOpen(!configMenuOpen)}
                  title="Configuration"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <ConfigMenu
                  isOpen={configMenuOpen}
                  canvasSize={canvasSize}
                  onCanvasSizeChange={onCanvasSizeChange}
                  selectedCharId={selectedCharId}
                  characters={characters}
                  defaultPersonSize={defaultPersonSize}
                  defaultPersonColor={defaultPersonColor}
                  defaultShoulderColor={defaultShoulderColor}
                  onSizeChange={onSizeChange}
                  onColorChange={onColorChange}
                />
              </div>

              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFileMenuOpen(!fileMenuOpen)}
                  title="File operations"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <FileMenu
                  isOpen={fileMenuOpen}
                  onSave={onSave}
                  onLoad={onLoad}
                  onExportJSON={onExportJSON}
                  onImportJSON={onImportJSON}
                  onExportPNG={onExportPNG}
                  onClose={() => setFileMenuOpen(false)}
                />
              </div>

              <div className="relative" ref={menuRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMenuOpen(!menuOpen)}
                  title="Menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-in fade-in slide-in-from-top-1 rounded-lg border border-border bg-white p-4 shadow-lg">
                    <p className="text-sm text-muted-foreground">
                      Welcome, <strong className="text-foreground">{user.username}</strong>
                    </p>
                    <div className="my-3 h-px bg-border" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => { setMenuOpen(false); onLogout() }}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
