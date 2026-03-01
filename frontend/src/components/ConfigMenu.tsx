import React, { useEffect, useRef, useState } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { Character } from '../types'

const COLOR_PAIRS = [
  { head: '#FFD1DC', shoulder: '#B5EAD7' },  // pink + mint
  { head: '#C7CEEA', shoulder: '#FFDAC1' },  // lavender + peach
  { head: '#B5EAD7', shoulder: '#E2F0CB' },  // mint + lime
  { head: '#FFDAC1', shoulder: '#FF9AA2' },  // peach + coral
  { head: '#E2F0CB', shoulder: '#C7CEEA' },  // lime + lavender
  { head: '#FF9AA2', shoulder: '#FFB7B2' },  // coral + salmon
  { head: '#F3E0FF', shoulder: '#A0D2E7' },  // lilac + sky
  { head: '#A0D2E7', shoulder: '#F3E0FF' },  // sky + lilac
  { head: '#FFFFD8', shoulder: '#D4A5A5' },  // cream + rose
  { head: '#D4A5A5', shoulder: '#FFFFD8' },  // rose + cream
  { head: '#C1E1C1', shoulder: '#FFD1DC' },  // sage + pink
  { head: '#FFB347', shoulder: '#B0E0E6' },  // pastel orange + powder blue
  { head: '#6E6E78', shoulder: '#8A8A8A' },  // charcoal + silver
]

interface ConfigMenuProps {
  isOpen: boolean
  canvasSize: { width: number; height: number }
  onCanvasSizeChange: (size: { width: number; height: number }) => void
  onClose?: () => void
  selectedCharId: string | null
  characters: Character[]
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
  keyframeSpeed?: number
  onKeyframeSpeedChange?: (speed: number) => void
  fadeSpeed?: number
  onFadeSpeedChange?: (speed: number) => void
  lockStageSize?: boolean
  setLockStageSize?: (v: boolean) => void
  lockKeyframeTiming?: boolean
  setLockKeyframeTiming?: (v: boolean) => void
  showWings?: boolean
  setShowWings?: (v: boolean) => void
  wingSize?: { width: number; height: number }
  onWingSizeChange?: (size: { width: number; height: number }) => void
  lockWingSize?: boolean
  setLockWingSize?: (v: boolean) => void
  preventOverlap?: boolean
  setPreventOverlap?: (v: boolean) => void
}

export default function ConfigMenu({
  isOpen,
  canvasSize,
  onCanvasSizeChange,
  onClose,
  selectedCharId,
  characters,
  defaultPersonSize,
  personSize,
  defaultPersonColor,
  defaultShoulderColor,
  onSizeChange,
  onColorChange,
  stageReversed,
  onToggleReverse
  , keyframeSpeed, onKeyframeSpeedChange, fadeSpeed, onFadeSpeedChange, lockStageSize, setLockStageSize
  , lockKeyframeTiming, setLockKeyframeTiming, labelFontSize, onLabelFontSizeChange, noteFontSize, onNoteFontSizeChange
  , showWings, setShowWings, wingSize, onWingSizeChange, lockWingSize, setLockWingSize
  , preventOverlap, setPreventOverlap
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
  const [localKeyframeSpeedStr, setLocalKeyframeSpeedStr] = useState<string>(String((keyframeSpeed ?? 1200) / 1000))
  const [localFadeSpeedStr, setLocalFadeSpeedStr] = useState<string>(String((fadeSpeed ?? 300) / 1000))
  const [keyframeSpeedError, setKeyframeSpeedError] = useState<string | null>(null)
  const [fadeSpeedError, setFadeSpeedError] = useState<string | null>(null)
  const [localWingWidthStr, setLocalWingWidthStr] = useState<string>(String(wingSize?.width ?? Math.round(canvasSize.width / 8)))
  const [localWingHeightStr, setLocalWingHeightStr] = useState<string>(String(wingSize?.height ?? canvasSize.height))
  const MIN_WING_W = 20
  const MAX_WING_W = 500
  const MIN_WING_H = 20
  const MAX_WING_H = canvasSize.height
  const MIN_MOVE_MS = 100
  const MAX_MOVE_MS = 10000
  const MIN_FADE_MS = 50
  const MAX_FADE_MS = 3000

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

  function applyWingWidthVal(n: number) {
    if (autoApplyTimer.current) { window.clearTimeout(autoApplyTimer.current); autoApplyTimer.current = null }
    const clamped = Math.min(MAX_WING_W, Math.max(MIN_WING_W, Math.round(n)))
    onWingSizeChange && onWingSizeChange({ width: clamped, height: wingSize?.height ?? canvasSize.height })
    setLocalWingWidthStr(String(clamped))
  }

  function applyWingHeightVal(n: number) {
    if (autoApplyTimer.current) { window.clearTimeout(autoApplyTimer.current); autoApplyTimer.current = null }
    const clamped = Math.min(MAX_WING_H, Math.max(MIN_WING_H, Math.round(n)))
    onWingSizeChange && onWingSizeChange({ width: wingSize?.width ?? Math.round(canvasSize.width / 8), height: clamped })
    setLocalWingHeightStr(String(clamped))
  }

  function applyKeyframeSpeedVal(n: number) {
    if (autoApplyTimer.current) { window.clearTimeout(autoApplyTimer.current); autoApplyTimer.current = null }
    const clamped = Math.min(MAX_MOVE_MS, Math.max(MIN_MOVE_MS, Math.round(n)))
    if (onKeyframeSpeedChange) onKeyframeSpeedChange(clamped)
    setLocalKeyframeSpeedStr(String((clamped / 1000)))
    setKeyframeSpeedError(null)
  }

  function applyFadeVal(n: number) {
    if (autoApplyTimer.current) { window.clearTimeout(autoApplyTimer.current); autoApplyTimer.current = null }
    const clamped = Math.min(MAX_FADE_MS, Math.max(MIN_FADE_MS, Math.round(n)))
    if (onFadeSpeedChange) onFadeSpeedChange(clamped)
    setLocalFadeSpeedStr(String((clamped / 1000)))
    setFadeSpeedError(null)
  }

  useEffect(() => {
    // sync string inputs when menu opens or external canvasSize changes
    setLocalWidthStr(String(canvasSize.width))
    setLocalHeightStr(String(canvasSize.height))
    setLocalKeyframeSpeedStr(String((keyframeSpeed ?? 1200) / 1000))
    setLocalFadeSpeedStr(String((fadeSpeed ?? 300) / 1000))
    setLocalWingWidthStr(String(wingSize?.width ?? Math.round(canvasSize.width / 8)))
    setLocalWingHeightStr(String(wingSize?.height ?? canvasSize.height))
  }, [canvasSize.width, canvasSize.height, isOpen, wingSize?.width, wingSize?.height])

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

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-50 mt-1 w-56 animate-in fade-in slide-in-from-top-1 rounded-lg border border-border bg-white p-4 shadow-lg"
      style={{ maxHeight: '700px', overflowY: 'auto' }}
    >
      
      

      {/* 1. Color presets + custom pickers */}
      <p className="text-xs text-muted-foreground">Color preset</p>
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

      {/* 2. Person Size */}
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Person Size (px)
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          Shoulder W
          <input
            type="number"
            min={8}
            max={160}
            step={2}
            value={personSize?.shoulderW ?? 72}
            onChange={(e) => {
              const v = Math.max(8, Math.min(160, Number(e.target.value) || 36))
              onSizeChange({ ...(personSize ?? { headW: 48, headH: 40, shoulderW: 72, shoulderH: 40 }), shoulderW: v })
            }}
            className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Shoulder H
          <input
            type="number"
            min={8}
            max={160}
            step={2}
            value={personSize?.shoulderH ?? 40}
            onChange={(e) => {
              const v = Math.max(8, Math.min(160, Number(e.target.value) || 40))
              onSizeChange({ ...(personSize ?? { headW: 48, headH: 40, shoulderW: 72, shoulderH: 40 }), shoulderH: v })
            }}
            className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
      </div>

      <div className="my-3 h-px bg-border" />

      {/* 3. Keyframe Timing */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keyframe Timing (s)</h3>
        <button
          onClick={(e) => { e.stopPropagation(); setLockKeyframeTiming && setLockKeyframeTiming(!lockKeyframeTiming) }}
          className="p-1 rounded hover:bg-accent/10"
          title={lockKeyframeTiming ? 'Unlock keyframe timing' : 'Lock keyframe timing'}
        >
          {lockKeyframeTiming ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Move</span>
            <span className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); const curMs = Math.round((Number(localKeyframeSpeedStr) || (keyframeSpeed ?? 1200) / 1000) * 1000); applyKeyframeSpeedVal(curMs - 1000) }}
                disabled={!!lockKeyframeTiming}
                className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockKeyframeTiming ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="-1 s"
              >
                −
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); const curMs = Math.round((Number(localKeyframeSpeedStr) || (keyframeSpeed ?? 1200) / 1000) * 1000); applyKeyframeSpeedVal(curMs + 1000) }}
                disabled={!!lockKeyframeTiming}
                className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockKeyframeTiming ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="+1 s"
              >
                +
              </button>
            </span>
          </div>
          <div className="mt-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*\.?[0-9]*"
              value={localKeyframeSpeedStr}
              onChange={(e) => {
                const s = e.target.value
                setLocalKeyframeSpeedStr(s)
                setKeyframeSpeedError(null)
                if (autoApplyTimer.current) window.clearTimeout(autoApplyTimer.current)
                autoApplyTimer.current = window.setTimeout(() => {
                  const n = Number(s)
                  if (!Number.isFinite(n) || String(s).trim() === '' || isNaN(n)) {
                    setKeyframeSpeedError('Enter a valid number')
                    autoApplyTimer.current = null
                    return
                  }
                  const ms = Math.round(n * 1000)
                  const clamped = Math.min(MAX_MOVE_MS, Math.max(MIN_MOVE_MS, ms))
                  if (onKeyframeSpeedChange) onKeyframeSpeedChange(clamped)
                  setLocalKeyframeSpeedStr(String((clamped / 1000)))
                  setKeyframeSpeedError(null)
                  autoApplyTimer.current = null
                }, 2000)
              }}
              disabled={!!lockKeyframeTiming}
              className={`mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${lockKeyframeTiming ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
          {keyframeSpeedError && <div className="text-[11px] text-destructive mt-1">{keyframeSpeedError}</div>}
        </label>
        <label className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Fade</span>
            <span className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); const curMs = Math.round((Number(localFadeSpeedStr) || (fadeSpeed ?? 300) / 1000) * 1000); applyFadeVal(curMs - 100) }}
                disabled={!!lockKeyframeTiming}
                className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockKeyframeTiming ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="-100 ms"
              >
                −
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); const curMs = Math.round((Number(localFadeSpeedStr) || (fadeSpeed ?? 300) / 1000) * 1000); applyFadeVal(curMs + 100) }}
                disabled={!!lockKeyframeTiming}
                className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockKeyframeTiming ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="+100 ms"
              >
                +
              </button>
            </span>
          </div>
          <div className="mt-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*\.?[0-9]*"
              value={localFadeSpeedStr}
              onChange={(e) => {
                const s = e.target.value
                setLocalFadeSpeedStr(s)
                setFadeSpeedError(null)
                if (autoApplyTimer.current) window.clearTimeout(autoApplyTimer.current)
                autoApplyTimer.current = window.setTimeout(() => {
                  const n = Number(s)
                  if (!Number.isFinite(n) || String(s).trim() === '' || isNaN(n)) {
                    setFadeSpeedError('Enter a valid number')
                    autoApplyTimer.current = null
                    return
                  }
                  const ms = Math.round(n * 1000)
                  const clamped = Math.min(MAX_FADE_MS, Math.max(MIN_FADE_MS, ms))
                  if (onFadeSpeedChange) onFadeSpeedChange(clamped)
                  setLocalFadeSpeedStr(String((clamped / 1000)))
                  setFadeSpeedError(null)
                  autoApplyTimer.current = null
                }, 2000)
              }}
              disabled={!!lockKeyframeTiming}
              className={`mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${lockKeyframeTiming ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
          {fadeSpeedError && <div className="text-[11px] text-destructive mt-1">{fadeSpeedError}</div>}
        </label>
      </div>

      <div className="my-3 h-px bg-border" />

      {/* 4. Prevent Overlap */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prevent Overlap</span>
        <button
          onClick={(e) => { e.stopPropagation(); setPreventOverlap && setPreventOverlap(!preventOverlap) }}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            preventOverlap ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              preventOverlap ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">When on, overlapping characters show a red ring and are auto-placed beside others when you release the drag.</p>

      <div className="my-3 h-px bg-border" />

      {/* 5. Reverse Stage */}
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

      {/* 5. Stage Size */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage Size</h3>
        <button
          onClick={(e) => { e.stopPropagation(); setLockStageSize && setLockStageSize(!lockStageSize) }}
          className="p-1 rounded hover:bg-accent/10"
          title={lockStageSize ? 'Unlock stage size' : 'Lock stage size'}
        >
          {lockStageSize ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </button>
      </div>
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

      {/* 6. Wing Stage */}
      <div className="mb-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={!!showWings}
            onChange={() => setShowWings && setShowWings(!showWings)}
            className="accent-primary"
          />
          <span className="font-semibold uppercase tracking-wider">Wing Stage</span>
        </label>
        {showWings && (
          <button
            onClick={(e) => { e.stopPropagation(); setLockWingSize && setLockWingSize(!lockWingSize) }}
            className="p-1 rounded hover:bg-accent/10"
            title={lockWingSize ? 'Unlock wing size' : 'Lock wing size'}
          >
            {lockWingSize ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
        )}
      </div>
      {showWings && (
        <div className="grid grid-cols-2 gap-2 mb-1">
          <label className="text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Width</span>
              <span className="flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); applyWingWidthVal(Number(localWingWidthStr || (wingSize?.width ?? Math.round(canvasSize.width / 8))) - 100) }}
                  disabled={!!lockWingSize}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockWingSize ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="-100"
                >
                  −
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); applyWingWidthVal(Number(localWingWidthStr || (wingSize?.width ?? Math.round(canvasSize.width / 8))) + 100) }}
                  disabled={!!lockWingSize}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockWingSize ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="+100"
                >
                  +
                </button>
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={localWingWidthStr}
              onChange={(e) => {
                const s = e.target.value
                setLocalWingWidthStr(s)
                if (autoApplyTimer.current) window.clearTimeout(autoApplyTimer.current)
                autoApplyTimer.current = window.setTimeout(() => {
                  const n = Number(s)
                  if (!Number.isFinite(n) || String(s).trim() === '' || isNaN(n)) { autoApplyTimer.current = null; return }
                  const clamped = Math.min(MAX_WING_W, Math.max(MIN_WING_W, Math.round(n)))
                  onWingSizeChange && onWingSizeChange({ width: clamped, height: wingSize?.height ?? canvasSize.height })
                  setLocalWingWidthStr(String(clamped))
                  autoApplyTimer.current = null
                }, 2000)
              }}
              disabled={!!lockWingSize}
              className={`mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${lockWingSize ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Height</span>
              <span className="flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); applyWingHeightVal(Number(localWingHeightStr || (wingSize?.height ?? canvasSize.height)) - 100) }}
                  disabled={!!lockWingSize}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockWingSize ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="-100"
                >
                  −
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); applyWingHeightVal(Number(localWingHeightStr || (wingSize?.height ?? canvasSize.height)) + 100) }}
                  disabled={!!lockWingSize}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded bg-transparent text-sm ${lockWingSize ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="+100"
                >
                  +
                </button>
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={localWingHeightStr}
              onChange={(e) => {
                const s = e.target.value
                setLocalWingHeightStr(s)
                if (autoApplyTimer.current) window.clearTimeout(autoApplyTimer.current)
                autoApplyTimer.current = window.setTimeout(() => {
                  const n = Number(s)
                  if (!Number.isFinite(n) || String(s).trim() === '' || isNaN(n)) { autoApplyTimer.current = null; return }
                  const clamped = Math.min(MAX_WING_H, Math.max(MIN_WING_H, Math.round(n)))
                  onWingSizeChange && onWingSizeChange({ width: wingSize?.width ?? Math.round(canvasSize.width / 8), height: clamped })
                  setLocalWingHeightStr(String(clamped))
                  autoApplyTimer.current = null
                }, 2000)
              }}
              disabled={!!lockWingSize}
              className={`mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${lockWingSize ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </label>
        </div>
      )}

      <div className="my-3 h-px bg-border" />

      {/* 7. Label Font Size */}
      <label className="text-xs text-muted-foreground">
        Stage / Audience Label Size
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min={8}
            max={32}
            step={1}
            value={labelFontSize ?? 14}
            onChange={(e) => onLabelFontSizeChange && onLabelFontSizeChange(Number(e.target.value))}
            className="flex-1 h-1.5 accent-primary"
          />
          <span className="text-xs tabular-nums w-6 text-center">{labelFontSize ?? 14}</span>
        </div>
      </label>

      {/* 8. Note Font Size */}
      <label className="text-xs text-muted-foreground mt-2">
        Note Font Size
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min={8}
            max={48}
            step={1}
            value={noteFontSize ?? 14}
            onChange={(e) => onNoteFontSizeChange && onNoteFontSizeChange(Number(e.target.value))}
            className="flex-1 h-1.5 accent-primary"
          />
          <span className="text-xs tabular-nums w-6 text-center">{noteFontSize ?? 14}</span>
        </div>
      </label>

      <div className="my-3 h-px bg-border" />
    </div>
  )
}
