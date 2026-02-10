import React, { useState, useRef, useEffect } from 'react'
import { Character, User, Keyframe } from '../types'
import { Button } from '@/components/ui/button'
import {
  UserPlus, Trash2, Copy, Undo2, Redo2,
  Settings, Save, LogOut, Menu, Film,
  Eye, EyeOff,
  Info,
  Plus, Play, Square, ChevronLeft, ChevronRight, Pencil
} from 'lucide-react'
import ConfigMenu from './ConfigMenu'
import FileMenu from './FileMenu'

interface ToolbarProps {
  addMode: boolean
  setAddMode: (fn: (s: boolean) => boolean) => void
  selectedCharId: string | null
  characters: Character[]
  awaitingDirectionFor: string | null
  onDeleteSelected: () => void
  onDuplicateSelected: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onNameChange: (name: string) => void
  user: User
  onLogout: () => void
  configMenuOpen: boolean
  setConfigMenuOpen: (open: boolean) => void
  canvasSize: { width: number; height: number }
  onCanvasSizeChange: (size: { width: number; height: number }) => void
  defaultPersonSize: number
  defaultPersonColor: string
  defaultShoulderColor: string
  onSizeChange: (size: number) => void
  onColorChange: (head: string, shoulder: string) => void
  stageReversed: boolean
  onToggleReverse: () => void
  fileMenuOpen: boolean
  setFileMenuOpen: (open: boolean) => void
  onSave: () => void
  onLoad: () => void
  onExportJSON: () => void
  onImportJSON: () => void
  onExportPNG: () => void
  keyframeMode: boolean
  onToggleKeyframeMode: () => void
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
  onUpdateCharVisible: (charId: string, visible: boolean) => void
}

export default function Toolbar(props: ToolbarProps) {
  const {
    addMode, setAddMode, selectedCharId, characters, awaitingDirectionFor,
    onDeleteSelected, onDuplicateSelected, canUndo, canRedo, onUndo, onRedo,
    onNameChange, user, onLogout, configMenuOpen, setConfigMenuOpen,
    canvasSize, onCanvasSizeChange, defaultPersonSize, defaultPersonColor, defaultShoulderColor,
    onSizeChange, onColorChange, stageReversed, onToggleReverse,
    fileMenuOpen, setFileMenuOpen, onSave, onLoad, onExportJSON, onImportJSON, onExportPNG,
    keyframeMode, onToggleKeyframeMode, keyframes, activeKeyframeIndex, isPlaying,
    onSelectKeyframe, onAddKeyframe, onDeleteKeyframe, onRenameKeyframe, onPlay, onStop, onPrev, onNext,
    onUpdateCharVisible
  } = props

  const selectedChar = selectedCharId ? characters.find(c => c.id === selectedCharId) : null
  const awaitingChar = awaitingDirectionFor ? characters.find(c => c.id === awaitingDirectionFor) : null

  const [menuOpen, setMenuOpen] = useState(false)
  const [editingKfIndex, setEditingKfIndex] = useState<number | null>(null)
  const [editKfValue, setEditKfValue] = useState('')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showAddTooltip, setShowAddTooltip] = useState(false)
  const [renameEditing, setRenameEditing] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Reset rename input when selection changes
  useEffect(() => {
    setRenameEditing(false)
    setRenameValue('')
  }, [selectedCharId])

  return (
    <header className="relative flex flex-col gap-2 rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        {keyframeMode ? (
          <>
            <Button variant="default" size="sm" onClick={onToggleKeyframeMode} title="Exit Keyframe Mode (Esc)">
              <Film className="h-4 w-4" />
              Keyframes (Esc)
            </Button>

            <div className="mx-1 h-6 w-px bg-border" />

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} disabled={isPlaying || activeKeyframeIndex <= 0} title="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
              if (!selectedCharId) return
              const newVis = !(selectedChar?.visible !== false)
              onUpdateCharVisible(selectedCharId, newVis)
            }} disabled={!selectedCharId} title="Toggle visibility (V)">
              {selectedChar?.visible === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>

            {isPlaying ? (
              <Button variant="default" size="icon" className="h-8 w-8" onClick={onStop} title="Stop (Space)">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="default" size="icon" className="h-8 w-8" onClick={onPlay} disabled={keyframes.length < 2} title="Play (Space)">
                <Play className="h-4 w-4" />
              </Button>
            )}

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} disabled={isPlaying || activeKeyframeIndex >= keyframes.length - 1} title="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="relative">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Shortcuts" onMouseEnter={() => setShowShortcuts(true)} onMouseLeave={() => setShowShortcuts(false)}>
                <Info className="h-4 w-4" />
              </Button>
              {showShortcuts && (
                <div className="absolute left-1/2 top-full -translate-x-1/2 mt-2 z-50 w-56 rounded-md border border-border bg-white p-3 text-xs shadow-sm">
                  <strong className="block text-sm mb-1">Shortcuts</strong>
                  <div className="leading-tight">Space: Play / Stop</div>
                  <div className="leading-tight">K: Toggle Keyframe Mode</div>
                  <div className="leading-tight">A: Add</div>
                  <div className="leading-tight">D: Delete selected</div>
                  <div className="leading-tight">P: Duplicate selected</div>
                  <div className="leading-tight">U: Undo, O: Redo</div>
                  <div className="leading-tight">S: Save</div>
                  <div className="leading-tight">+: Add keyframe</div>
                  <div className="leading-tight">V: Toggle visibility (keyframe mode)</div>
                  <div className="leading-tight">R: Reverse stage</div>
                  <div className="leading-tight">Esc: Exit / Cancel</div>
                </div>
              )}
            </div>

            <div className="mx-1 h-6 w-px bg-border" />

            <div className="flex flex-wrap items-center gap-1">
              {keyframes.map((kf, i) => (
                <div key={kf.id} className="flex items-center">
                  {i > 0 && <div className="h-px w-4 bg-border" />}
                  <div className={`group relative flex items-center rounded-md border px-2.5 py-1 text-xs cursor-pointer transition-colors ${i === activeKeyframeIndex ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border bg-background text-muted-foreground hover:bg-accent'}`} onClick={() => !isPlaying && onSelectKeyframe(i)}>
                    {editingKfIndex === i ? (
                      <input autoFocus className="w-16 bg-transparent text-xs outline-none" value={editKfValue} onChange={(e) => setEditKfValue(e.target.value)} onBlur={() => { if (editKfValue.trim()) onRenameKeyframe(i, editKfValue.trim()); setEditingKfIndex(null) }} onKeyDown={(e) => { if (e.key === 'Enter') { if (editKfValue.trim()) onRenameKeyframe(i, editKfValue.trim()); setEditingKfIndex(null) } if (e.key === 'Escape') setEditingKfIndex(null) }} onClick={(e) => e.stopPropagation()} />
                    ) : (
                      <>
                        <span>{kf.label}</span>
                        {kf.characters && kf.characters.filter(c => c.visible === false).length > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-semibold px-1">{kf.characters.filter(c => c.visible === false).length}</span>
                        )}
                        <div className="ml-1 hidden gap-0.5 group-hover:flex">
                          <button className="rounded p-0.5 hover:bg-accent" onClick={(e) => { e.stopPropagation(); setEditingKfIndex(i); setEditKfValue(kf.label) }} title="Rename"><Pencil className="h-3 w-3" /></button>
                          {keyframes.length > 1 && (<button className="rounded p-0.5 hover:bg-destructive/10 text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteKeyframe(i) }} title="Delete keyframe"><Trash2 className="h-3 w-3" /></button>)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="icon" className="h-7 w-7 ml-1" onClick={onAddKeyframe} disabled={isPlaying} title="Add keyframe (+)">
              <Plus className="h-3.5 w-3.5" />
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{activeKeyframeIndex + 1} / {keyframes.length}</span>
              <Button variant="ghost" size="icon" disabled={!canUndo} onClick={onUndo} title="Undo (U)"><Undo2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" disabled={!canRedo} onClick={onRedo} title="Redo (O)"><Redo2 className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Button variant={addMode ? 'default' : 'outline'} size="sm" onClick={() => setAddMode(s => !s)} title="Add character (A)" onMouseEnter={() => setShowAddTooltip(true)} onMouseLeave={() => setShowAddTooltip(false)}>
                  <UserPlus className="h-4 w-4" />
                  {addMode ? 'Adding… (Esc)' : <span><u>A</u>dd</span>}
                </Button>
                {showAddTooltip && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 w-max rounded-md border border-border bg-white px-2 py-1 text-xs shadow-sm">
                    Add character (A)
                  </div>
                )}
              </div>

              {selectedCharId && !(keyframeMode && selectedChar?.visible === false) && (
                <Button variant="destructive" size="sm" onClick={onDeleteSelected}><Trash2 className="h-4 w-4" /><span><u>D</u>elete</span></Button>
              )}

              {selectedCharId && !(keyframeMode && selectedChar?.visible === false) && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={onDuplicateSelected}><Copy className="h-4 w-4" /><span>Du<u>p</u>licate</span></Button>
                  {renameEditing ? (
                    <input
                      autoFocus
                      className="w-28 rounded border px-2 py-1 text-sm"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => { if (renameValue.trim()) onNameChange(renameValue.trim()); setRenameEditing(false) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { if (renameValue.trim()) onNameChange(renameValue.trim()); setRenameEditing(false) }
                        if (e.key === 'Escape') { setRenameEditing(false); setRenameValue(selectedChar?.name || '') }
                      }}
                    />
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => { setRenameValue(selectedChar?.name || ''); setRenameEditing(true) }} title="Rename"><Pencil className="h-4 w-4" /><span className="sr-only">Rename</span></Button>
                  )}
                </div>
              )}

            </div>

            <p className="mx-2 text-sm text-muted-foreground">{awaitingDirectionFor ? `Set gaze: ${awaitingChar?.name ?? awaitingDirectionFor}` : selectedCharId ? `${selectedChar?.name ?? selectedCharId} selected` : 'Click to select · drag to move'}</p>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" disabled={!canUndo} onClick={onUndo} title="Undo (U)"><Undo2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" disabled={!canRedo} onClick={onRedo} title="Redo (O)"><Redo2 className="h-4 w-4" /></Button>

              <div className="mx-1 h-6 w-px bg-border" />

              <Button variant="outline" size="sm" onClick={onToggleKeyframeMode} title="Keyframe Animation Mode"><Film className="h-4 w-4" /><span><u>K</u>eyframes</span></Button>

              <div className="mx-1 h-6 w-px bg-border" />

              <div className="relative">
                <Button variant="ghost" size="icon" onClick={() => setConfigMenuOpen(!configMenuOpen)} title="Configuration"><Settings className="h-4 w-4" /></Button>
                <ConfigMenu isOpen={configMenuOpen} canvasSize={canvasSize} onCanvasSizeChange={onCanvasSizeChange} selectedCharId={selectedCharId} characters={characters} defaultPersonSize={defaultPersonSize} defaultPersonColor={defaultPersonColor} defaultShoulderColor={defaultShoulderColor} onSizeChange={onSizeChange} onColorChange={onColorChange} stageReversed={stageReversed} onToggleReverse={onToggleReverse} />
              </div>

              <div className="relative">
                <Button variant="ghost" size="icon" onClick={() => setFileMenuOpen(!fileMenuOpen)} title="File operations"><Save className="h-4 w-4" /></Button>
                <FileMenu isOpen={fileMenuOpen} onSave={onSave} onLoad={onLoad} onExportJSON={onExportJSON} onImportJSON={onImportJSON} onExportPNG={onExportPNG} onClose={() => setFileMenuOpen(false)} />
              </div>

              <div className="relative" ref={menuRef}>
                <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} title="Menu"><Menu className="h-4 w-4" /></Button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-in fade-in slide-in-from-top-1 rounded-lg border border-border bg-white p-4 shadow-lg">
                    <p className="text-sm text-muted-foreground">Welcome, <strong className="text-foreground">{user.username}</strong></p>
                    <div className="my-3 h-px bg-border" />
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setMenuOpen(false); onLogout() }}><LogOut className="h-4 w-4" /> Logout</Button>
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
