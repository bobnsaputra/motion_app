import React from 'react'
import { Character, User } from '../types'
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

  return (
    <header className="toolbar" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Top row: buttons left, right-side controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className={addMode ? 'active' : ''} onClick={() => setAddMode((s) => !s)}>
          {addMode ? 'Adding… (Esc)' : 'Add Char'}
        </button>

        {selectedCharId && (
          <button onClick={onDeleteSelected}>Delete</button>
        )}

        {selectedCharId && (
          <button onClick={onDuplicateSelected}>Duplicate</button>
        )}

        <button onClick={onClearAll}>Clear All</button>

        <button disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">↶</button>
        <button disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)">↷</button>

        <div style={{ fontSize: 14, color: '#666' }}>
          {awaitingDirectionFor
            ? `Click on the stage to set gaze direction for ${awaitingChar?.name ?? awaitingDirectionFor}.`
            : selectedCharId
              ? `${selectedChar?.name ?? selectedCharId} selected — click head to set direction.`
              : 'Click to select, hold to move.'}
        </div>

        {/* Right side: Welcome, Name, Settings, Save, Logout */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#666' }}>
            Welcome, <strong>{user.username}</strong>
          </span>

          {selectedCharId && (
            <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              Name:
              <input
                type="text"
                maxLength={3}
                value={selectedChar?.name ?? ''}
                onChange={(e) => onNameChange(e.target.value)}
                style={{ width: 60 }}
              />
            </label>
          )}

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setConfigMenuOpen(!configMenuOpen)}
              style={{ fontSize: 20, padding: '4px 12px' }}
              title="Configuration"
            >
              ⚙️
            </button>
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

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setFileMenuOpen(!fileMenuOpen)}
              style={{ fontSize: 20, padding: '4px 12px' }}
              title="File operations"
            >
              💾
            </button>
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

          <button
            onClick={onLogout}
            style={{
              padding: '6px 14px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
