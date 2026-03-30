import React, { useState, useRef, useEffect } from 'react'
import { Character, User, Keyframe } from '../types'
import { Button } from '@/components/ui/button'
import {
  UserPlus, Trash2, Copy, Undo2, Redo2,
  Settings, Save, LogOut, Menu, Film,
  Eye, EyeOff,
  Info, StickyNote, Box,
  Plus, Play, Square, ChevronLeft, ChevronRight, Pencil, PlayCircle, StepForward
} from 'lucide-react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import ConfigMenu from './ConfigMenu'
import FileMenu from './FileMenu'

function SceneNameEditor({ sceneIndex, sceneName, onRename, disabled }: { sceneIndex: number; sceneName?: string; onRename?: (name: string) => void; disabled?: boolean }) {
  const defaultName = `Scene ${sceneIndex + 1}`
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(sceneName ?? defaultName)
  useEffect(() => {
    setValue(sceneName ?? defaultName)
  }, [sceneIndex, sceneName])
  return (
    <div>
      {editing ? (
        <input autoFocus className="w-24 text-sm rounded border px-1 py-0.5" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => { setEditing(false); if (value.trim() && onRename) onRename(value.trim()) }} onKeyDown={(e) => { if (e.key === 'Enter') { setEditing(false); if (value.trim() && onRename) onRename(value.trim()) } if (e.key === 'Escape') { setEditing(false); setValue(sceneName ?? defaultName) } }} disabled={disabled} />
      ) : (
        <button className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded" onClick={() => !disabled && setEditing(true)} title="Rename scene">{sceneName ?? defaultName}</button>
      )}
    </div>
  )
}

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
  personSize?: { headW: number; headH: number; shoulderW: number; shoulderH: number }
  defaultPersonColor: string
  defaultShoulderColor: string
  onSizeChange: (size: { headW: number; headH: number; shoulderW: number; shoulderH: number }) => void
  onColorChange: (head: string, shoulder: string) => void
  stageReversed: boolean
  onToggleReverse: () => void
  labelFontSize?: number
  onLabelFontSizeChange?: (size: number) => void
  noteFontSize?: number
  onNoteFontSizeChange?: (size: number) => void
  showWings?: boolean
  setShowWings?: (v: boolean) => void
  wingSize?: { width: number; height: number }
  onWingSizeChange?: (size: { width: number; height: number }) => void
  lockWingSize?: boolean
  setLockWingSize?: (v: boolean) => void
  preventOverlap?: boolean
  setPreventOverlap?: (v: boolean) => void
  stageOffset?: { top: number; right: number; bottom: number; left: number }
  onStageOffsetChange?: (offset: { top: number; right: number; bottom: number; left: number }) => void
  lockStageOffset?: boolean
  setLockStageOffset?: (v: boolean) => void
  fileMenuOpen: boolean
  setFileMenuOpen: (open: boolean) => void
  onSave: () => void
  onLoad: () => void
  onExportJSON: () => void
  onImportJSON: () => void
  onExportPNG: () => void
  onCloudSave: () => void
  onOpenProjects: () => void
  onShareProject?: () => void
  canShare?: boolean
  cloudSaving?: boolean
  readOnly?: boolean
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
  onPlaySingle: () => void
  onPlayAll: () => void
  onStop: () => void
  onPrev: () => void
  onNext: () => void
  onUpdateCharVisible: (charId: string, visible: boolean) => void
  sceneIndex?: number
  sceneSize?: number
  sceneStart?: number
  sceneLength?: number
  onPrevScene?: () => void
  onNextScene?: () => void
  sceneName?: string
  onRenameScene?: (name: string) => void
  onCreateScene?: () => void
  onDeleteScene?: () => void
  sceneCount?: number
  keyframeSpeed: number
  onKeyframeSpeedChange: (speed: number) => void
  fadeSpeed?: number
  onFadeSpeedChange?: (speed: number) => void
  lockStageSize?: boolean
  setLockStageSize?: (v: boolean) => void
  lockKeyframeTiming?: boolean
  setLockKeyframeTiming?: (v: boolean) => void
  projectTitle?: string
  onProjectTitleChange?: (t: string) => void
  sceneNotes?: Record<number, string>
  keyframeNotes?: Record<string, string>
  noteMode?: boolean
  onToggleNoteMode?: () => void
  propsMode?: boolean
  selectedPropId?: string | null
  onTogglePropsMode?: () => void
  onDeselectChar?: () => void
  subscriptionInfo?: { status: string }
}

export default function Toolbar(props: ToolbarProps) {
  const {
    addMode, setAddMode, selectedCharId, characters, awaitingDirectionFor,
    onDeleteSelected, onDuplicateSelected, canUndo, canRedo, onUndo, onRedo,
    onNameChange, user, onLogout, configMenuOpen, setConfigMenuOpen,
    canvasSize, onCanvasSizeChange, defaultPersonSize, defaultPersonColor, defaultShoulderColor,
    onSizeChange, onColorChange, stageReversed, onToggleReverse,
    fileMenuOpen, setFileMenuOpen, onSave, onLoad, onExportJSON, onImportJSON, onExportPNG, onCloudSave, onOpenProjects,
    keyframeMode, onToggleKeyframeMode, keyframes, activeKeyframeIndex, isPlaying,
    onSelectKeyframe, onAddKeyframe, onDeleteKeyframe, onRenameKeyframe, onPlay, onPlayAll, onStop, onPrev, onNext,
    onUpdateCharVisible, keyframeSpeed, onKeyframeSpeedChange, fadeSpeed, onFadeSpeedChange
  } = props

  const [titleEditing, setTitleEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(props.projectTitle || 'Untitled')
  useEffect(() => { setTitleValue(props.projectTitle || 'Untitled') }, [props.projectTitle])

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
  const scrollRef = useRef<HTMLDivElement | null>(null)

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

  // Auto-scroll the keyframe strip so the active keyframe is visible
  useEffect(() => {
    if (!keyframeMode) return
    const root = scrollRef.current
    if (!root) return
    const el = root.querySelector(`[data-kf-index="${activeKeyframeIndex}"]`) as HTMLElement | null
    if (el) {
      try { el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }) } catch (e) { /* ignore */ }
    }
  }, [activeKeyframeIndex, keyframes, keyframeMode])

  return (
    <header className="toolbar-root toolbar">
      <div className="toolbar-row">
        {keyframeMode ? (
          <>
            <Button variant="default" size="sm" onClick={onToggleKeyframeMode} title="Exit Keyframe Mode (Esc)">
              <Film className="h-4 w-4" />
              Keyframes (Esc)
            </Button>

            <div className="h-6 w-px bg-border" />

            {isPlaying ? (
              <Button variant="default" size="icon" className="h-8 w-8" onClick={onStop} title="Stop (Space)">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={props.onPlaySingle} disabled={keyframes.length < 2} title="Play This Keyframe (Q)">
                  <StepForward className="h-4 w-4" />
                </Button>
                <Button variant="default" size="icon" className="h-8 w-8" onClick={onPlay} disabled={keyframes.length < 2} title="Play Scene (W / Space)">
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPlayAll} disabled={keyframes.length < 2} title="Play All Scenes (E)">
                  <PlayCircle className="h-4 w-4" />
                </Button>
              </>
            )}

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Shortcuts"
                onMouseEnter={() => setShowShortcuts(true)}
                onMouseLeave={() => setShowShortcuts(false)}
              >
                <Info className="h-4 w-4" />
              </Button>
              {showShortcuts && (
                <div className="absolute left-1/2 top-full -translate-x-1/2 mt-2 z-50 w-64 rounded-lg border border-border bg-white p-3 text-xs shadow-sm floating-panel">
                  <strong className="block text-sm mb-2">Shortcuts</strong>
                  <div className="flex flex-col gap-1">
                    <div className="leading-tight">Q: Play This Keyframe / Stop</div>
                    <div className="leading-tight">W / Space: Play Scene / Stop</div>
                    <div className="leading-tight">E: Play All Scenes / Stop</div>
                    <div className="leading-tight">K: Toggle Keyframe Mode</div>
                    <div className="leading-tight">A: Add character</div>
                    <div className="leading-tight">D: Delete selected</div>
                    <div className="leading-tight">P: Duplicate (with selection)</div>
                    <div className="leading-tight">P: Toggle Props mode (no selection)</div>
                    <div className="leading-tight">U: Undo, O: Redo</div>
                    <div className="leading-tight">S: Save</div>
                    <div className="leading-tight">X: Export JSON</div>
                    <div className="leading-tight">← / → : Previous / Next keyframe</div>
                    <div className="leading-tight">↑ / ↓ : Previous / Next scene</div>
                    <div className="leading-tight">Double-click keyframe: Rename</div>
                    <div className="leading-tight">+: Add keyframe</div>
                    <div className="leading-tight">V: Toggle visibility</div>
                    <div className="leading-tight">N: Note mode (place text)</div>
                    <div className="leading-tight">R: Reverse stage</div>
                    <div className="leading-tight">Esc: Exit / Cancel</div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-border flex-shrink-0" />

            {/* Up then Left controls adjacent to keyframe chips */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => props.onPrevScene && props.onPrevScene()} disabled={typeof props.sceneIndex === 'undefined' || isPlaying} title="Previous Scene">
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onPrev && onPrev()} disabled={isPlaying || (props.sceneLength ?? keyframes.length) <= 1} title="Previous">
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </div>

            {/* Scene name (inline editable) - condensed */}
            <div className="flex items-center gap-0.5">
              <SceneNameEditor sceneIndex={props.sceneIndex ?? 0} sceneName={props.sceneName} onRename={(name: string) => props.onRenameScene && props.onRenameScene(name)} disabled={isPlaying || props.readOnly} />
              {props.sceneNotes && typeof props.sceneIndex === 'number' && props.sceneNotes[props.sceneIndex] && (
                <span className="ml-1 inline-block w-2 h-2 bg-amber-500 rounded-full" title="Scene note" />
              )}
              {!props.readOnly && (
              <button title="Create new scene" onClick={() => props.onCreateScene && props.onCreateScene()} disabled={isPlaying} className="p-0.5 rounded hover:bg-accent/10 ml-1">
                <Plus className="h-3 w-3 text-muted-foreground" />
              </button>
              )}
              {!props.readOnly && (
              <button
                className="rounded p-1 hover:bg-destructive/10 text-destructive disabled:opacity-50"
                onClick={() => props.onDeleteScene && props.onDeleteScene()}
                disabled={isPlaying || (props.sceneCount ?? 1) <= 1 || (props.sceneIndex ?? 0) === 0}
                title="Delete scene"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              )}
            </div>

            {/* Compact Horizontal Scroll Area for Keyframes (only show current scene/page) */}
            <div ref={scrollRef} className="flex-1 min-w-0 flex items-center gap-1 kf-scrollbar py-1 px-1">
              {(() => {
                const sIndex = props.sceneIndex ?? 0
                const sSize = props.sceneSize ?? 10
                const start = props.sceneStart ?? (sIndex * sSize)
                const length = props.sceneLength ?? sSize
                const visible = keyframes.slice(start, start + length)
                return visible.map((kf, i) => {
                  const globalIdx = start + i
                  return (
                    <div key={kf.id} data-kf-index={globalIdx} className="flex items-center flex-shrink-0">
                      {i > 0 && <div className="h-px w-3 bg-border" />}
                      <div className={`group relative flex items-center rounded border px-2 py-0.5 text-xs cursor-pointer transition-colors ${globalIdx === activeKeyframeIndex ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border bg-background text-muted-foreground hover:bg-accent'}`} onClick={() => !isPlaying && onSelectKeyframe(globalIdx)}>
                          {editingKfIndex === globalIdx ? (
                          <input autoFocus className="w-16 bg-transparent text-xs outline-none" value={editKfValue} onChange={(e) => setEditKfValue(e.target.value)} onBlur={() => { if (editKfValue.trim()) onRenameKeyframe(globalIdx, editKfValue.trim()); setEditingKfIndex(null) }} onKeyDown={(e) => { if (e.key === 'Enter') { if (editKfValue.trim()) onRenameKeyframe(globalIdx, editKfValue.trim()); setEditingKfIndex(null) } if (e.key === 'Escape') setEditingKfIndex(null) }} onClick={(e) => e.stopPropagation()} />
                        ) : (
                          <>
                            <button className="text-left" onDoubleClick={(e) => { e.stopPropagation(); setEditingKfIndex(globalIdx); setEditKfValue(kf.label) }}>{kf.label}</button>
                            {kf.characters && kf.characters.filter(c => c.visible === false).length > 0 && (
                              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-semibold px-1">{kf.characters.filter(c => c.visible === false).length}</span>
                            )}
                            {props.keyframeNotes && props.keyframeNotes[String(kf.id)] && (
                              <span className="ml-1 inline-block w-2 h-2 bg-amber-500 rounded-full" title="Keyframe note" />
                            )}
                            {!props.readOnly && keyframes.length > 1 && (
                              <button
                                className="absolute -top-2.5 -right-2.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-white hover:bg-destructive/80 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); onDeleteKeyframe(globalIdx) }}
                                title="Delete keyframe"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })
                })()}


            </div>

            {/* Right controls adjacent to keyframe chips */}
            <div className="flex items-center gap-1 ml-2">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onNext && onNext()} disabled={isPlaying || (props.sceneLength ?? keyframes.length) <= 1} title="Next">
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => props.onNextScene && props.onNextScene()} disabled={typeof props.sceneIndex === 'undefined' || isPlaying} title="Next Scene">
                <ChevronDown className="h-3 w-3" />
              </Button>
              {!props.readOnly && (
              <button className="rounded p-1 hover:bg-accent/10" onClick={onAddKeyframe} disabled={isPlaying} title="Add keyframe (+)" aria-label="Add keyframe">
                <Plus className="h-3.5 w-3.5" />
              </button>
              )}
              {!props.readOnly && (
              <button
                className={`rounded p-1 hover:bg-accent/10 ${props.noteMode ? 'bg-amber-100 text-amber-700' : ''}`}
                onClick={() => props.onToggleNoteMode && props.onToggleNoteMode()}
                disabled={isPlaying}
                title="Note Mode (N) — click canvas to place text"
              >
                <StickyNote className="h-3.5 w-3.5" />
              </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {(() => {
                const start = props.sceneStart ?? 0
                const length = props.sceneLength ?? keyframes.length
                const activeInScene = Math.max(1, Math.min(length, activeKeyframeIndex - start + 1))
                const totalInScene = Math.max(1, Math.min(length, keyframes.length - start))
                return <span className="text-[10px] text-muted-foreground tabular-nums">{activeInScene}/{totalInScene}</span>
              })()}
              {!props.readOnly && (
              <>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={onUndo} title="Undo (U)"><Undo2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={onRedo} title="Redo (O)"><Redo2 className="h-4 w-4" /></Button>
              </>
              )}
            </div>
          </>
        ) : (
          <>
            {!props.readOnly && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="relative">
                <Button variant={addMode ? 'default' : 'outline'} size="sm" onClick={() => { if (props.propsMode && props.onTogglePropsMode) props.onTogglePropsMode(); if (props.onDeselectChar) props.onDeselectChar(); setAddMode(s => !s) }} title="Add character (A)" onMouseEnter={() => setShowAddTooltip(true)} onMouseLeave={() => setShowAddTooltip(false)}>
                  <UserPlus className="h-4 w-4" />
                  {addMode ? 'Adding… (Esc)' : <span>Ch<u>a</u>racter</span>}
                </Button>
                {showAddTooltip && (
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 w-max rounded-md border border-border bg-white px-2 py-1 text-xs shadow-sm floating-panel">
                    Character (A)
                  </div>
                )}
              </div>
              <Button variant={props.propsMode ? 'default' : 'outline'} size="sm" onClick={props.onTogglePropsMode} title="Props mode — place stage decorations">
                <Box className="h-4 w-4" />
                {props.propsMode
                  ? (props.selectedPropId ? <span>Edit <u>P</u>rop… (Esc)</span> : <span>Add <u>P</u>rop… (Esc)</span>)
                  : selectedCharId ? <span>Props</span> : <span><u>P</u>rops</span>}
              </Button>

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
            )}

            {!props.readOnly && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Shortcuts"
                onMouseEnter={() => setShowShortcuts(true)}
                onMouseLeave={() => setShowShortcuts(false)}
              >
                <Info className="h-4 w-4" />
              </Button>
              {showShortcuts && (
                <div className="absolute left-1/2 top-full -translate-x-1/2 mt-2 z-50 w-56 rounded-md border border-border bg-white p-3 text-xs shadow-sm floating-panel">
                  <strong className="block text-sm mb-1">Shortcuts</strong>
                  <div className="leading-tight">K: Toggle Keyframe Mode</div>
                  <div className="leading-tight">A: Add character</div>
                  <div className="leading-tight">D: Delete selected</div>
                  <div className="leading-tight">P: Duplicate (with selection)</div>
                  <div className="leading-tight">P: Toggle Props mode (no selection)</div>
                  <div className="leading-tight">U: Undo, O: Redo</div>
                  <div className="leading-tight">S: Save</div>
                  <div className="leading-tight">X: Export JSON</div>
                  <div className="leading-tight">Double-click keyframe: Rename</div>
                  <div className="leading-tight">R: Reverse stage</div>
                  <div className="leading-tight">Esc: Exit / Cancel</div>
                </div>
              )}
            </div>
            )}

            {props.readOnly && (
              <span className="text-xs text-muted-foreground italic px-2">View only</span>
            )}

            <div className="mx-2 flex-1 flex items-center justify-center min-w-0 group">
              {titleEditing && !props.readOnly ? (
                <input
                  autoFocus
                  className="w-64 text-sm font-semibold rounded border px-2 py-1 text-center"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={() => { setTitleEditing(false); props.onProjectTitleChange && props.onProjectTitleChange(titleValue.trim() || 'Untitled') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setTitleEditing(false); props.onProjectTitleChange && props.onProjectTitleChange(titleValue.trim() || 'Untitled') } if (e.key === 'Escape') { setTitleEditing(false); setTitleValue(props.projectTitle || 'Untitled') } }}
                />
              ) : (
                <div 
                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${!props.readOnly ? 'cursor-pointer hover:bg-accent/50' : ''}`}
                  onClick={() => !props.readOnly && setTitleEditing(true)}
                  title={!props.readOnly ? "Rename Project" : undefined}
                >
                  <span className="text-sm font-semibold truncate project-title">{props.projectTitle || 'Untitled'}</span>
                  {!props.readOnly && (
                    <Pencil className="h-3 w-3 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0 ">
              {!props.readOnly && (
              <>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={onUndo} title="Undo (U)"><Undo2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={onRedo} title="Redo (O)"><Redo2 className="h-4 w-4" /></Button>

              <div className="mx-1 h-6 w-px bg-border" />
              </>
              )}

              <Button variant="outline" size="sm" onClick={onToggleKeyframeMode} title="Keyframe Animation Mode"><Film className="h-4 w-4" /><span><u>K</u>eyframes</span></Button>

              {!props.readOnly && (
              <>
              <div className="mx-1 h-6 w-px bg-border" />

                  <div className="relative">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setConfigMenuOpen(!configMenuOpen); setFileMenuOpen(false); }} title="Configuration"><Settings className="h-4 w-4" /></Button>
                    <ConfigMenu
                      isOpen={configMenuOpen}
                      canvasSize={canvasSize}
                      onCanvasSizeChange={onCanvasSizeChange}
                      onClose={() => setConfigMenuOpen(false)}
                      selectedCharId={selectedCharId}
                      characters={characters}
                      defaultPersonSize={defaultPersonSize}
                      personSize={props.personSize}
                      defaultPersonColor={defaultPersonColor}
                      defaultShoulderColor={defaultShoulderColor}
                      onSizeChange={onSizeChange}
                      onColorChange={onColorChange}
                      stageReversed={stageReversed}
                      onToggleReverse={onToggleReverse}
                      labelFontSize={props.labelFontSize}
                      onLabelFontSizeChange={props.onLabelFontSizeChange}
                      noteFontSize={props.noteFontSize}
                      onNoteFontSizeChange={props.onNoteFontSizeChange}
                      showWings={props.showWings}
                      setShowWings={props.setShowWings}
                      wingSize={props.wingSize}
                      onWingSizeChange={props.onWingSizeChange}
                      lockWingSize={props.lockWingSize}
                      setLockWingSize={props.setLockWingSize}
                      preventOverlap={props.preventOverlap}
                      setPreventOverlap={props.setPreventOverlap}
                      stageOffset={props.stageOffset}
                      onStageOffsetChange={props.onStageOffsetChange}
                      lockStageOffset={props.lockStageOffset}
                      setLockStageOffset={props.setLockStageOffset}
                      keyframeSpeed={keyframeSpeed}
                      onKeyframeSpeedChange={onKeyframeSpeedChange}
                      fadeSpeed={fadeSpeed}
                      onFadeSpeedChange={onFadeSpeedChange}
                      lockStageSize={props.lockStageSize}
                      setLockStageSize={props.setLockStageSize}
                      lockKeyframeTiming={props.lockKeyframeTiming}
                      setLockKeyframeTiming={props.setLockKeyframeTiming}
                    />
                  </div>

              <div className="relative">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFileMenuOpen(!fileMenuOpen); setConfigMenuOpen(false); }} title="File operations"><Save className="h-4 w-4" /></Button>
                <FileMenu isOpen={fileMenuOpen} onSave={onSave} onLoad={onLoad} onExportJSON={onExportJSON} onImportJSON={onImportJSON} onExportPNG={onExportPNG} onCloudSave={onCloudSave} onOpenProjects={onOpenProjects} onShareProject={props.onShareProject} canShare={props.canShare} cloudSaving={props.cloudSaving} onClose={() => setFileMenuOpen(false)} />
              </div>
              </>
              )}

              {/* Pro Badge */}
              {props.subscriptionInfo?.status === 'pro' && (
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 ml-1 mr-1 text-[10px] font-bold uppercase tracking-widest text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/20 rounded-full cursor-default" title="Pro Account">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]"></span>PRO
                </div>
              )}

              <div className="relative" ref={menuRef}>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMenuOpen(!menuOpen)} title="Menu"><Menu className="h-4 w-4" /></Button>
                {menuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-in fade-in slide-in-from-top-1 rounded-lg border border-border bg-white p-4 shadow-lg floating-panel">
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
