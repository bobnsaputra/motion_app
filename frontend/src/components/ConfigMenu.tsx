import React, { useEffect, useRef, useState } from 'react'
import { Character } from '../types'

const COLOR_PAIRS = [
  { head: '#ffd93d', shoulder: '#ff6b6b' },
  { head: '#6ec6ff', shoulder: '#ffb74d' },
  { head: '#81c784', shoulder: '#f48fb1' },
  { head: '#ce93d8', shoulder: '#fff59d' },
  { head: '#80cbc4', shoulder: '#ffab91' },
  { head: '#ef9a9a', shoulder: '#80cbc4' },
  { head: '#b0bec5', shoulder: '#e0e0e0' },
  { head: '#a5d6a7', shoulder: '#90caf9' },
  { head: '#ff8a80', shoulder: '#84ffff' },
  { head: '#b39ddb', shoulder: '#f8bbd0' }
]

interface ConfigMenuProps {
  isOpen: boolean
  canvasSize: { width: number; height: number }
  onCanvasSizeChange: (size: { width: number; height: number }) => void
  onClose?: () => void
  selectedCharId: string | null
  characters: Character[]
  defaultPersonSize: number
  defaultPersonColor: string
  defaultShoulderColor: string
  onSizeChange: (size: number) => void
  onColorChange: (head: string, shoulder: string) => void
  stageReversed: boolean
  onToggleReverse: () => void
  keyframeSpeed?: number
  onKeyframeSpeedChange?: (speed: number) => void
  fadeSpeed?: number
  onFadeSpeedChange?: (speed: number) => void
  lockStageSize?: boolean
  setLockStageSize?: (v: boolean) => void
}

export default function ConfigMenu({
  isOpen,
  canvasSize,
  onCanvasSizeChange,
  onClose,
  selectedCharId,
  characters,
  defaultPersonSize,
  defaultPersonColor,
  defaultShoulderColor,
  onSizeChange,
  onColorChange,
  stageReversed,
  onToggleReverse
  , keyframeSpeed, onKeyframeSpeedChange, fadeSpeed, onFadeSpeedChange, lockStageSize, setLockStageSize
}: ConfigMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [localWidthStr, setLocalWidthStr] = useState<string>(String(canvasSize.width))
  const [localHeightStr, setLocalHeightStr] = useState<string>(String(canvasSize.height))
  const [widthError, setWidthError] = useState<string | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)
  const autoApplyTimer = useRef<number | null>(null)
  const maxToastTimer = useRef<number | null>(null)
  const MAX_WIDTH = 2000
  const MAX_HEIGHT = 900
  const MIN_WIDTH = 800
  const MIN_HEIGHT = 200
  const [showMaxWidthToast, setShowMaxWidthToast] = useState(false)
  const [showMaxHeightToast, setShowMaxHeightToast] = useState(false)

  function applyWidthVal(n: number) {
    if (autoApplyTimer.current) { window.clearTimeout(autoApplyTimer.current); autoApplyTimer.current = null }
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(n)))
    if (clamped === MAX_WIDTH && n > MAX_WIDTH) {
      setShowMaxWidthToast(true)
      if (maxToastTimer.current) { window.clearTimeout(maxToastTimer.current); maxToastTimer.current = null }
      maxToastTimer.current = window.setTimeout(() => setShowMaxWidthToast(false), 2000)
    }
    const h = Number(localHeightStr)
    onCanvasSizeChange({ width: clamped, height: (Number.isFinite(h) ? h : canvasSize.height) })
    setLocalWidthStr(String(clamped))
    setWidthError(null)
  }

  function applyHeightVal(n: number) {
    if (autoApplyTimer.current) { window.clearTimeout(autoApplyTimer.current); autoApplyTimer.current = null }
    const clamped = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(n)))
    if (clamped === MAX_HEIGHT && n > MAX_HEIGHT) {
      setShowMaxHeightToast(true)
      if (maxToastTimer.current) { window.clearTimeout(maxToastTimer.current); maxToastTimer.current = null }
      maxToastTimer.current = window.setTimeout(() => setShowMaxHeightToast(false), 2000)
    }
    const w = Number(localWidthStr)
    onCanvasSizeChange({ width: (Number.isFinite(w) ? w : canvasSize.width), height: clamped })
    setLocalHeightStr(String(clamped))
    setHeightError(null)
  }

  useEffect(() => {
    // sync string inputs when menu opens or external canvasSize changes
    setLocalWidthStr(String(canvasSize.width))
    setLocalHeightStr(String(canvasSize.height))
  }, [canvasSize.width, canvasSize.height, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (onClose) onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  useEffect(() => {
    return () => {
      if (autoApplyTimer.current) window.clearTimeout(autoApplyTimer.current)
      if (maxToastTimer.current) window.clearTimeout(maxToastTimer.current)
    }
  }, [])

  if (!isOpen) return null

  const selectedChar = selectedCharId ? characters.find((c) => c.id === selectedCharId) : null
  const currentColor = selectedChar?.color ?? defaultPersonColor
  const currentShoulderColor = selectedChar?.shoulderColor ?? defaultShoulderColor
  const currentSize = selectedChar?.size ?? defaultPersonSize

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-50 mt-1 w-56 animate-in fade-in slide-in-from-top-1 rounded-lg border border-border bg-white p-4 shadow-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options</span>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!lockStageSize} onChange={(e) => setLockStageSize && setLockStageSize(e.target.checked)} />
          <span className="text-[12px] text-muted-foreground">Lock Stage Size</span>
        </label>
      </div>
      

      <div className="my-3 h-px bg-border" />
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Stage Size
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Width</span>
            <span className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); applyWidthVal(Number(localWidthStr || canvasSize.width) - 100) }}
                disabled={!!lockStageSize}
                className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockStageSize ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="-100"
              >
                −
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); applyWidthVal(Number(localWidthStr || canvasSize.width) + 100) }}
                disabled={!!lockStageSize}
                className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockStageSize ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="+100"
              >
                +
              </button>
            </span>
          </div>
          <div className="mt-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={localWidthStr}
              onChange={(e) => {
                const s = e.target.value
                setLocalWidthStr(s)
                setWidthError(null)
                if (autoApplyTimer.current) window.clearTimeout(autoApplyTimer.current)
                autoApplyTimer.current = window.setTimeout(() => {
                  const n = Number(s)
                  if (!Number.isFinite(n) || String(s).trim() === '' || isNaN(n)) {
                    setWidthError('Enter a valid number')
                    autoApplyTimer.current = null
                    return
                  }
                  const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(n)))
                  const h = Number(localHeightStr)
                  onCanvasSizeChange({ width: clamped, height: (Number.isFinite(h) ? h : canvasSize.height) })
                  setLocalWidthStr(String(clamped))
                  setWidthError(null)
                  autoApplyTimer.current = null
                }, 2000)
              }}
              disabled={!!lockStageSize}
              className={`mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${lockStageSize ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {widthError && <div className="text-[11px] text-destructive mt-1">{widthError}</div>}
            {showMaxWidthToast && <div className="text-[11px] text-yellow-800 bg-yellow-100 rounded px-2 py-1 mt-1">Max width is 2000</div>}
          </div>
        </label>
        <label className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Height</span>
            <span className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); applyHeightVal(Number(localHeightStr || canvasSize.height) - 100) }}
                disabled={!!lockStageSize}
                className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockStageSize ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="-100"
              >
                −
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); applyHeightVal(Number(localHeightStr || canvasSize.height) + 100) }}
                disabled={!!lockStageSize}
                className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockStageSize ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="+100"
              >
                +
              </button>
            </span>
          </div>
          <div className="mt-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={localHeightStr}
              onChange={(e) => {
                const s = e.target.value
                setLocalHeightStr(s)
                setHeightError(null)
                if (autoApplyTimer.current) window.clearTimeout(autoApplyTimer.current)
                autoApplyTimer.current = window.setTimeout(() => {
                  const n = Number(s)
                  if (!Number.isFinite(n) || String(s).trim() === '' || isNaN(n)) {
                    setHeightError('Enter a valid number')
                    autoApplyTimer.current = null
                    return
                  }
                  const clamped = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(n)))
                  const w = Number(localWidthStr)
                  onCanvasSizeChange({ width: (Number.isFinite(w) ? w : canvasSize.width), height: clamped })
                  setLocalHeightStr(String(clamped))
                  setHeightError(null)
                  autoApplyTimer.current = null
                }, 2000)
              }}
              disabled={!!lockStageSize}
              className={`mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${lockStageSize ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {heightError && <div className="text-[11px] text-destructive mt-1">{heightError}</div>}
            {showMaxHeightToast && <div className="text-[11px] text-yellow-800 bg-yellow-100 rounded px-2 py-1 mt-1">Max height is 900</div>}
          </div>
        </label>
      </div>
      <div className="my-3 h-px bg-border" />

      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Keyframe Timing
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          Move ms
          <input
            type="number"
            min={100}
            max={1600}
            value={keyframeSpeed ?? 1200}
            onChange={(e) => onKeyframeSpeedChange && onKeyframeSpeedChange(Math.max(100, Number(e.target.value) || 1200))}
            className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Fade ms
          <input
            type="number"
            min={50}
            max={3000}
            value={fadeSpeed ?? 300}
            onChange={(e) => onFadeSpeedChange && onFadeSpeedChange(Math.max(50, Number(e.target.value) || 300))}
            className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
      </div>
      <div className="my-3 h-px bg-border" />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"><u>R</u>everse Stage</span>
        <button
          onClick={onToggleReverse}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            stageReversed ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              stageReversed ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="my-3 h-px bg-border" />

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Person
      </h3>
      <label className="text-xs text-muted-foreground">
        Size
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
          className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>

      <p className="mt-3 text-xs text-muted-foreground">Color preset</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
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
            className={`cursor-pointer rounded border-2 bg-white transition-all hover:scale-110 ${
              currentColor === colorPair.head
                ? 'border-foreground shadow-sm'
                : 'border-border'
            }`}
          >
            <ellipse cx="18" cy="24" rx="9" ry="5" fill={colorPair.shoulder} />
            <ellipse cx="18" cy="18" rx="6" ry="5" fill={colorPair.head} stroke="#ccc" strokeWidth="1" />
            <line x1="18" y1="13" x2="18" y2="10" stroke="#000" strokeWidth="1" />
          </svg>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          Head
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onColorChange(e.target.value, currentShoulderColor)}
            className="mt-1 h-7 w-full cursor-pointer rounded border border-input"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Shoulder
          <input
            type="color"
            value={currentShoulderColor}
            onChange={(e) => onColorChange(currentColor, e.target.value)}
            className="mt-1 h-7 w-full cursor-pointer rounded border border-input"
          />
        </label>
      </div>

      <div className="my-3 h-px bg-border" />
    </div>
  )
}
