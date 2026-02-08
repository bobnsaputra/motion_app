import React from 'react'
import { Character } from '../types'

const COLOR_PAIRS = [
  { head: '#f1c40f', shoulder: '#c0392b' },
  { head: '#3498db', shoulder: '#e67e22' },
  { head: '#2ecc71', shoulder: '#e91e63' },
  { head: '#9b59b6', shoulder: '#f9e79f' },
  { head: '#1abc9c', shoulder: '#d35400' },
  { head: '#e74c3c', shoulder: '#16a085' },
  { head: '#2c3e50', shoulder: '#ecf0f1' },
  { head: '#95a5a6', shoulder: '#2c3e50' }
]

interface ConfigMenuProps {
  isOpen: boolean
  canvasSize: { width: number; height: number }
  onCanvasSizeChange: (size: { width: number; height: number }) => void
  selectedCharId: string | null
  characters: Character[]
  defaultPersonSize: number
  defaultPersonColor: string
  defaultShoulderColor: string
  onSizeChange: (size: number) => void
  onColorChange: (head: string, shoulder: string) => void
}

export default function ConfigMenu({
  isOpen,
  canvasSize,
  onCanvasSizeChange,
  selectedCharId,
  characters,
  defaultPersonSize,
  defaultPersonColor,
  defaultShoulderColor,
  onSizeChange,
  onColorChange
}: ConfigMenuProps) {
  if (!isOpen) return null

  const selectedChar = selectedCharId ? characters.find((c) => c.id === selectedCharId) : null
  const currentColor = selectedChar?.color ?? defaultPersonColor
  const currentShoulderColor = selectedChar?.shoulderColor ?? defaultShoulderColor
  const currentSize = selectedChar?.size ?? defaultPersonSize

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: '100%',
      marginTop: 4,
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: 4,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      padding: 12,
      minWidth: 200,
      zIndex: 1000
    }}>
      <label style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
        Width:
        <input
          type="number"
          min={100}
          max={3000}
          value={canvasSize.width}
          onChange={(e) => {
            const v = Math.min(3000, Math.max(100, Number(e.target.value) || 0))
            onCanvasSizeChange({ ...canvasSize, width: v })
          }}
          style={{ width: '100%', marginTop: 4 }}
        />
      </label>
      <label style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
        Height:
        <input
          type="number"
          min={100}
          max={3000}
          value={canvasSize.height}
          onChange={(e) => {
            const v = Math.min(3000, Math.max(100, Number(e.target.value) || 0))
            onCanvasSizeChange({ ...canvasSize, height: v })
          }}
          style={{ width: '100%', marginTop: 4 }}
        />
      </label>
      <label style={{ fontSize: 14, display: 'block' }}>
        Person size:
        <input
          type="number"
          min={1}
          max={3}
          step={1}
          value={currentSize}
          onChange={(e) => {
            const v = Math.max(1, Math.min(3, Number(e.target.value) || 1))
            onSizeChange(v)
          }}
          style={{ width: '100%', marginTop: 4 }}
        />
      </label>
      <div style={{ fontSize: 14, marginTop: 8 }}>
        Person color:
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          {COLOR_PAIRS.map((colorPair) => (
            <svg
              key={colorPair.head}
              width="36"
              height="36"
              viewBox="0 0 36 36"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onColorChange(colorPair.head, colorPair.shoulder)
              }}
              style={{
                cursor: 'pointer',
                border: currentColor === colorPair.head ? '3px solid #000' : '1px solid #ccc',
                borderRadius: 4,
                backgroundColor: '#fff'
              }}
            >
              <ellipse cx="18" cy="24" rx="9" ry="5" fill={colorPair.shoulder} />
              <ellipse cx="18" cy="18" rx="6" ry="5" fill={colorPair.head} stroke="#b08a05" strokeWidth="1" />
              <line x1="18" y1="13" x2="18" y2="7" stroke="#000" strokeWidth="1" />
            </svg>
          ))}
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, fontSize: 12 }}>
          <label style={{ flex: 1 }}>
            Head:
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(e.target.value, currentShoulderColor)}
              style={{ width: '100%', marginTop: 4, height: 28, cursor: 'pointer' }}
            />
          </label>
          <label style={{ flex: 1 }}>
            Shoulder:
            <input
              type="color"
              value={currentShoulderColor}
              onChange={(e) => onColorChange(currentColor, e.target.value)}
              style={{ width: '100%', marginTop: 4, height: 28, cursor: 'pointer' }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
