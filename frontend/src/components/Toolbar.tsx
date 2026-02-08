import React, { useState, useRef, useEffect } from 'react'
import { Character, User } from '../types'
import { Button } from '@/components/ui/button'
import {
  UserPlus, Trash2, Copy, Eraser, Undo2, Redo2,
  Settings, Save, LogOut, Menu
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
  onExportPNG
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

  return (
    <header className="flex flex-col gap-2 rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        {/* Left: Tool buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant={addMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAddMode((s) => !s)}
          >
            <UserPlus className="h-4 w-4" />
            {addMode ? 'Adding… (Esc)' : 'Add'}
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

        {/* Center: Status text */}
        <p className="mx-2 text-sm text-muted-foreground">
          {awaitingDirectionFor
            ? `Set gaze: ${awaitingChar?.name ?? awaitingDirectionFor}`
            : selectedCharId
              ? `${selectedChar?.name ?? selectedCharId} selected`
              : 'Click to select · drag to move'}
        </p>

        {/* Right: User controls */}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
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
      </div>
    </header>
  )
}
