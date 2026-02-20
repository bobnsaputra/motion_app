import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Character, Guide, User, Keyframe } from '../types'
import Toolbar from './Toolbar'
import Sidebar from './Sidebar'
import StageCanvas from './StageCanvas'
import ToastContainer, { ToastType } from './Toast'

interface StageBlockingAppProps {
  user: User
  onLogout: () => void
}

export default function StageBlockingApp({ user, onLogout }: StageBlockingAppProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [addMode, setAddMode] = useState(false)
  const [counter, setCounter] = useState(0)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [awaitingDirectionFor, setAwaitingDirectionFor] = useState<string | null>(null)

  const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 900 })
  const [guides, setGuides] = useState<Guide[]>([])
  const [defaultPersonSize, setDefaultPersonSize] = useState(2)
  const [defaultPersonColor, setDefaultPersonColor] = useState('#ffd93d')
  const [defaultShoulderColor, setDefaultShoulderColor] = useState('#ff6b6b')
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [configMenuOpen, setConfigMenuOpen] = useState(false)
  const [stageReversed, setStageReversed] = useState(false)
  const [alignmentGuides, setAlignmentGuides] = useState<{ x?: number; y?: number }[]>([])
  const [keyframeSpeed, setKeyframeSpeed] = useState(1200)
  const [fadeSpeed, setFadeSpeed] = useState(1200)

  type HistoryEntry = { characters: Character[]; keyframes?: Keyframe[]; activeKeyframeIndex?: number }
  const [history, setHistory] = useState<HistoryEntry[]>([{ characters: [] }])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [toast, setToast] = useState<{ message: string; type: ToastType; key: number } | null>(null)
  const toastKey = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, key: ++toastKey.current })
  }, [])

  // ── Keyframe state ──
  const [keyframeMode, setKeyframeMode] = useState(false)
  const [keyframes, setKeyframes] = useState<Keyframe[]>([])
  const [activeKeyframeIndex, setActiveKeyframeIndex] = useState(0)
  const [sceneIndex, setSceneIndex] = useState(0)
  const [sceneSize, setSceneSize] = useState(10)
  const [sceneNames, setSceneNames] = useState<string[]>([]) // per-scene optional names
  const [sceneBoundaries, setSceneBoundaries] = useState<number[]>([0]) // start indices for each scene
  const [isPlaying, setIsPlaying] = useState(false)
  const [animationProgress, setAnimationProgress] = useState<number | null>(null) // 0-1 during playback (movement easing)
  const [fadeProgress, setFadeProgress] = useState<number | null>(null) // 0-1 faster fade for hide/show
  const animFrameRef = useRef<number | null>(null)
  const nextKfId = useRef(1)
  const [offstageOpen, setOffstageOpen] = useState(false)
  const kfsRef = useRef<Keyframe[] | null>(null)
  const animPairRef = useRef(0)

  const dragRef = useRef<{
    type: 'move' | 'handle' | 'char-move' | 'char-rotate' | null
    guideId?: string
    handle?: 'start' | 'end'
    offset?: number
    charId?: string
    charOffsetX?: number
    charOffsetY?: number
    hasMoved?: boolean
  }>({ type: null })
  const skipNextClickRef = useRef(false)

  // ── Guides initialization ──
  useEffect(() => {
    const w = canvasSize.width
    const h = canvasSize.height
    const newGuides: Guide[] = [
      { id: 'v1', orientation: 'v', pos: w / 3, start: 0, end: h },
      { id: 'v2', orientation: 'v', pos: (2 * w) / 3, start: 0, end: h },
      { id: 'h1', orientation: 'h', pos: h / 3, start: 0, end: w },
      { id: 'h2', orientation: 'h', pos: (2 * h) / 3, start: 0, end: w }
    ]
    setGuides((prev) => {
      if (prev.length === 0) return newGuides
      return newGuides
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.width, canvasSize.height])

  // ── Redraw on state changes ──
  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters, guides, canvasSize, selectedCharId, awaitingDirectionFor, keyframeMode, activeKeyframeIndex, keyframes, animationProgress, stageReversed])

  // ── Mouse move / up for dragging ──
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current.type) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      if (dragRef.current.type === 'char-move') {
        dragRef.current.hasMoved = true

        const currentChar = characters.find(c => c.id === dragRef.current.charId)
        if (!currentChar) return

        const snapThreshold = 8
        const radius = (currentChar.size ?? defaultPersonSize) * 20

        let snappedX = mx
        let snappedY = my
        const guides: { x?: number; y?: number }[] = []

        if (Math.abs(mx - canvasSize.width / 2) < snapThreshold) {
          snappedX = canvasSize.width / 2
          guides.push({ x: canvasSize.width / 2 })
        }
        if (Math.abs(my - canvasSize.height / 2) < snapThreshold) {
          snappedY = canvasSize.height / 2
          guides.push({ y: canvasSize.height / 2 })
        }

        characters.forEach(other => {
          if (other.id === dragRef.current.charId) return
          const otherRadius = (other.size ?? defaultPersonSize) * 20

          if (Math.abs(mx - other.x) < snapThreshold) {
            snappedX = other.x
            guides.push({ x: other.x })
          }
          if (Math.abs(my - other.y) < snapThreshold) {
            snappedY = other.y
            guides.push({ y: other.y })
          }

          if (Math.abs((mx - radius) - (other.x - otherRadius)) < snapThreshold) {
            snappedX = other.x - otherRadius + radius
            guides.push({ x: other.x - otherRadius })
          }
          if (Math.abs((mx + radius) - (other.x + otherRadius)) < snapThreshold) {
            snappedX = other.x + otherRadius - radius
            guides.push({ x: other.x + otherRadius })
          }

          if (Math.abs((my - radius) - (other.y - otherRadius)) < snapThreshold) {
            snappedY = other.y - otherRadius + radius
            guides.push({ y: other.y - otherRadius })
          }
          if (Math.abs((my + radius) - (other.y + otherRadius)) < snapThreshold) {
            snappedY = other.y + otherRadius - radius
            guides.push({ y: other.y + otherRadius })
          }

          if (Math.abs(mx - (other.x - otherRadius)) < snapThreshold) {
            snappedX = other.x - otherRadius
            guides.push({ x: other.x - otherRadius })
          }
          if (Math.abs(mx - (other.x + otherRadius)) < snapThreshold) {
            snappedX = other.x + otherRadius
            guides.push({ x: other.x + otherRadius })
          }
          if (Math.abs(my - (other.y - otherRadius)) < snapThreshold) {
            snappedY = other.y - otherRadius
            guides.push({ y: other.y - otherRadius })
          }
          if (Math.abs(my - (other.y + otherRadius)) < snapThreshold) {
            snappedY = other.y + otherRadius
            guides.push({ y: other.y + otherRadius })
          }

          if (Math.abs((mx - radius) - other.x) < snapThreshold) {
            snappedX = other.x + radius
            guides.push({ x: other.x })
          }
          if (Math.abs((mx + radius) - other.x) < snapThreshold) {
            snappedX = other.x - radius
            guides.push({ x: other.x })
          }
          if (Math.abs((my - radius) - other.y) < snapThreshold) {
            snappedY = other.y + radius
            guides.push({ y: other.y })
          }
          if (Math.abs((my + radius) - other.y) < snapThreshold) {
            snappedY = other.y - radius
            guides.push({ y: other.y })
          }
        })

        setAlignmentGuides(guides)
        setCharacters((prev) =>
          prev.map((c) => {
            if (c.id !== dragRef.current.charId) return c
            return { ...c, x: snappedX, y: snappedY }
          })
        )
        return
      }

      setGuides((prev) =>
        prev.map((g) => {
          if (g.id !== dragRef.current.guideId) return g
          if (dragRef.current.type === 'move') {
            if (g.orientation === 'v') {
              const pos = Math.max(0, Math.min(canvas.width, mx - (dragRef.current.offset || 0)))
              return { ...g, pos }
            } else {
              const pos = Math.max(0, Math.min(canvas.height, my - (dragRef.current.offset || 0)))
              return { ...g, pos }
            }
          } else if (dragRef.current.type === 'handle') {
            const handle = dragRef.current.handle!
            if (g.orientation === 'v') {
              const val = Math.max(0, Math.min(canvas.height, handle === 'start' ? my : my))
              if (handle === 'start') return { ...g, start: Math.min(val, g.end) }
              return { ...g, end: Math.max(val, g.start) }
            } else {
              const val = Math.max(0, Math.min(canvas.width, handle === 'start' ? mx : mx))
              if (handle === 'start') return { ...g, start: Math.min(val, g.end) }
              return { ...g, end: Math.max(val, g.start) }
            }
          }
          return g
        })
      )
    }

    function onMouseUp() {
      if (dragRef.current.type === 'char-move') {
        setAlignmentGuides([])
      }

      if (dragRef.current.type === 'char-move' && !dragRef.current.hasMoved) {
        const charId = dragRef.current.charId
        if (charId && !keyframeMode) {
          setAwaitingDirectionFor(charId)
          skipNextClickRef.current = true
        }
      }
      if (dragRef.current.type === 'char-move' && dragRef.current.hasMoved) {
        if (keyframeMode) {
          const proposedChars = JSON.parse(JSON.stringify(characters)) as Character[]
          const committed = keyframes.map((kf, i) => i === activeKeyframeIndex ? { ...kf, characters: proposedChars } : kf)
          setKeyframes(committed)
          // Now save history with full keyframe objects
          saveToHistory(characters, committed, activeKeyframeIndex)
        } else {
          saveToHistory(characters)
        }
        setSelectedCharId(null)
      }

      dragRef.current = { type: null }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [characters, keyframeMode])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (keyframeMode) {
          // Inline cleanup to avoid stale closure
          setIsPlaying(false)
          setAnimationProgress(null)
          if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current)
            animFrameRef.current = null
          }
          // Save current positions to active keyframe before exiting
          setKeyframes(prev => prev.map((kf, i) =>
            i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf
          ))
          setKeyframeMode(false)
        }
        setAddMode(false)
        setAwaitingDirectionFor(null)
        setSelectedCharId(null)
        setFileMenuOpen(false)
        setConfigMenuOpen(false)
      }
      // Don't trigger shortcuts when typing in an input
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'a' || e.key === 'A') {
        if (!keyframeMode) setAddMode(prev => !prev)
      }
      if ((e.key === 'd' || e.key === 'D') && !keyframeMode) {
        if (selectedCharId) handleDeleteSelected()
      }
      if ((e.key === 'p' || e.key === 'P') && !keyframeMode) {
        if (selectedCharId) handleDuplicateSelected()
      }
      if ((e.key === 'u' || e.key === 'U')) {
        undo()
      }
      if ((e.key === 'o' || e.key === 'O')) {
        redo()
      }
      if (e.key === 'k' || e.key === 'K') {
        toggleKeyframeMode()
      }
      if ((e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        saveToLocalStorage()
      }
      if ((e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        loadFromLocalStorage()
      }
      if ((e.key === 'v' || e.key === 'V') && keyframeMode && selectedCharId) {
        e.preventDefault()
        const sel = characters.find(c => c.id === selectedCharId)
        if (sel) {
          const newVis = !(sel.visible !== false)
          handleUpdateCharVisible(selectedCharId, newVis)
        }
      }
      if ((e.key === 'r' || e.key === 'R') && !keyframeMode) {
        handleToggleReverse()
      }
      if ((e.key === '=') && keyframeMode) {
        e.preventDefault()
        addKeyframe()
      }
      if (e.key === ' ' && keyframeMode) {
        e.preventDefault()
        if (isPlaying) { stopPlayback() } else { startPlayback() }
      }
      if ((e.key === 'ArrowDown') && keyframeMode) {
        e.preventDefault()
        nextScene()
      }
      if ((e.key === 'ArrowUp') && keyframeMode) {
        e.preventDefault()
        prevScene()
      }
      // 'b' shortcut for offstage removed (offstage panel replaced by label)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [historyIndex, history, keyframeMode, isPlaying, selectedCharId, characters])

  // ── Utility functions ──
  function snapToRightAngles(a: number) {
    const step = Math.PI / 2
    return Math.round(a / step) * step
  }

  function saveToHistory(newCharacters: Character[], optKeyframes?: Keyframe[], optActiveIndex?: number) {
    const newHistory = history.slice(0, historyIndex + 1)
    const entry: HistoryEntry = {
      characters: JSON.parse(JSON.stringify(newCharacters))
    }
    if (optKeyframes) {
      entry.keyframes = JSON.parse(JSON.stringify(optKeyframes))
      entry.activeKeyframeIndex = optActiveIndex ?? 0
    } else if (keyframeMode) {
      entry.keyframes = JSON.parse(JSON.stringify(keyframes))
      entry.activeKeyframeIndex = activeKeyframeIndex
    }
    newHistory.push(entry)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }



  function undo() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const entry = history[newIndex]
      setHistoryIndex(newIndex)
      setCharacters(JSON.parse(JSON.stringify(entry.characters)))
      if (entry.keyframes) {
        setKeyframes(JSON.parse(JSON.stringify(entry.keyframes)))
        setKeyframeMode(true)
        setActiveKeyframeIndex(Math.min(entry.activeKeyframeIndex ?? 0, entry.keyframes.length - 1))
      }
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const entry = history[newIndex]
      setHistoryIndex(newIndex)
      setCharacters(JSON.parse(JSON.stringify(entry.characters)))
      if (entry.keyframes) {
        setKeyframes(JSON.parse(JSON.stringify(entry.keyframes)))
        setKeyframeMode(true)
        setActiveKeyframeIndex(Math.min(entry.activeKeyframeIndex ?? 0, entry.keyframes.length - 1))
      }
    }
  }

  // ── Canvas event handlers ──
  function handleCanvasClick(e: React.MouseEvent) {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false
      return
    }
    // In keyframe mode, only allow selecting/moving — no adding or gaze setting
    if (keyframeMode && (addMode || awaitingDirectionFor)) return
    if (awaitingDirectionFor) {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const target = characters.find((c) => c.id === awaitingDirectionFor)
      if (target) {
        const angleToClick = Math.atan2(y - target.y, x - target.x)
        const normalize = (a: number) => {
          while (a <= -Math.PI) a += Math.PI * 2
          while (a > Math.PI) a -= Math.PI * 2
          return a
        }
        const rel = normalize(angleToClick - (target.angle ?? 0))
        if (Math.abs(Math.abs(rel) - Math.PI) < Math.PI / 4) {
          const snapped = snapToRightAngles(angleToClick)
          const updated = characters.map((c) => (c.id === target.id ? { ...c, angle: snapped, eyeOffset: 0 } : c))
          setCharacters(updated)
          saveToHistory(updated)
        } else {
          const updated = characters.map((c) => (c.id === target.id ? { ...c, eyeOffset: rel } : c))
          setCharacters(updated)
          saveToHistory(updated)
        }
      }
      setAwaitingDirectionFor(null)
      return
    }
    if (!addMode) return
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left)
    const y = Math.round(e.clientY - rect.top)
    const id = String.fromCharCode(65 + (counter % 26))
    setCounter((c) => c + 1)
    const updated = [...characters, { id, name: id, x, y, angle: Math.PI / 2, eyeOffset: 0, size: defaultPersonSize, color: defaultPersonColor, shoulderColor: defaultShoulderColor }]
    setCharacters(updated)
    saveToHistory(updated)
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    setFileMenuOpen(false)
    setConfigMenuOpen(false)

    if (addMode) return

    // Prevent dragging characters in keyframe 1 (the starting position)
    const blockDrag = keyframeMode && activeKeyframeIndex === 0

    for (const char of characters) {
      const size = char.size ?? 1
      const angle = char.angle ?? 0

      const d = Math.hypot(mx - char.x, my - char.y)
      if (d <= 12 * size) {
        setSelectedCharId(char.id)
        if (blockDrag) { showToast('Keyframe 1 is the starting position — move characters in other keyframes', 'info'); return }
        dragRef.current = { type: 'char-move', charId: char.id, hasMoved: false }
        return
      }

      const shoulderDist = 8 * size
      const shoulderX = char.x - Math.cos(angle) * shoulderDist
      const shoulderY = char.y - Math.sin(angle) * shoulderDist
      const shoulderD = Math.hypot(mx - shoulderX, my - shoulderY)
      if (shoulderD <= 18 * size) {
        setSelectedCharId(char.id)
        if (blockDrag) { showToast('Keyframe 1 is the starting position — move characters in other keyframes', 'info'); return }
        dragRef.current = { type: 'char-move', charId: char.id, hasMoved: false }
        return
      }
    }

    setSelectedCharId(null)

    for (const g of guides) {
      if (g.orientation === 'v') {
        const hx = g.pos
        const hs = g.start
        const he = g.end
        const d1 = Math.hypot(mx - hx, my - hs)
        const d2 = Math.hypot(mx - hx, my - he)
        if (d1 < 10) {
          dragRef.current = { type: 'handle', guideId: g.id, handle: 'start' }
          return
        }
        if (d2 < 10) {
          dragRef.current = { type: 'handle', guideId: g.id, handle: 'end' }
          return
        }
        if (Math.abs(mx - g.pos) < 6 && my >= g.start - 6 && my <= g.end + 6) {
          dragRef.current = { type: 'move', guideId: g.id, offset: mx - g.pos }
          return
        }
      } else {
        const hy = g.pos
        const hs = g.start
        const he = g.end
        const d1 = Math.hypot(mx - hs, my - hy)
        const d2 = Math.hypot(mx - he, my - hy)
        if (d1 < 10) {
          dragRef.current = { type: 'handle', guideId: g.id, handle: 'start' }
          return
        }
        if (d2 < 10) {
          dragRef.current = { type: 'handle', guideId: g.id, handle: 'end' }
          return
        }
        if (Math.abs(my - g.pos) < 6 && mx >= g.start - 6 && mx <= g.end + 6) {
          dragRef.current = { type: 'move', guideId: g.id, offset: my - g.pos }
          return
        }
      }
    }
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (awaitingDirectionFor) {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      setCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== awaitingDirectionFor) return c
          const angleToCursor = Math.atan2(my - c.y, mx - c.x)
          const normalize = (a: number) => {
            while (a <= -Math.PI) a += Math.PI * 2
            while (a > Math.PI) a -= Math.PI * 2
            return a
          }
          const rel = normalize(angleToCursor - (c.angle ?? 0))
          const opposite = Math.abs(Math.abs(rel) - Math.PI) < Math.PI / 4
          if (opposite) {
            const snappedPreview = snapToRightAngles(angleToCursor)
            return { ...c, angle: snappedPreview, eyeOffset: 0 }
          }
          return { ...c, eyeOffset: rel }
        })
      )
      return
    }

    if (dragRef.current.type) return
    if (addMode) return
  }

  // Drag & drop from Offstage: allow dropping a hidden character onto the canvas
  function handleCanvasDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left)
    const y = Math.round(e.clientY - rect.top)

    if (keyframeMode && keyframes.length > 0) {
      const updatedKfs = keyframes.map((kf, i) =>
        i === activeKeyframeIndex ? { ...kf, characters: kf.characters.map(c => c.id === id ? { ...c, x, y, visible: true } : c) } : kf
      )
      setKeyframes(updatedKfs)
      const updatedChars = JSON.parse(JSON.stringify(updatedKfs[activeKeyframeIndex].characters))
      setCharacters(updatedChars)
      saveToHistory(updatedChars, updatedKfs, activeKeyframeIndex)
      setSelectedCharId(id)
    } else {
      const updated = characters.map(c => c.id === id ? { ...c, x, y, visible: true } : c)
      setCharacters(updated)
      saveToHistory(updated)
      setSelectedCharId(id)
    }
  }

  // ── Drawing ──
  function drawGuides(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.setLineDash([6, 6])
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1
    guides.forEach((g) => {
      if (g.orientation === 'v') {
        ctx.beginPath()
        ctx.moveTo(g.pos, g.start)
        ctx.lineTo(g.pos, g.end)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#333'
        ctx.beginPath()
        ctx.arc(g.pos, g.start, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(g.pos, g.end, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.setLineDash([6, 6])
      } else {
        ctx.beginPath()
        ctx.moveTo(g.start, g.pos)
        ctx.lineTo(g.end, g.pos)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#333'
        ctx.beginPath()
        ctx.arc(g.start, g.pos, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(g.end, g.pos, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.setLineDash([6, 6])
      }
    })
    ctx.restore()
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.width !== canvasSize.width) canvas.width = canvasSize.width
    if (canvas.height !== canvasSize.height) canvas.height = canvasSize.height

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.font = '600 20px "Inter", sans-serif'
    ctx.letterSpacing = '12px'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#94a3b8' // Zinc 400 for subtle contrast
    const topLabel = stageReversed ? 'A U D I E N C E' : 'S T A G E'
    const bottomLabel = stageReversed ? 'S T A G E' : 'A U D I E N C E'
    ctx.fillText(topLabel, canvas.width / 2, 50)
    ctx.fillText(bottomLabel, canvas.width / 2, canvas.height - 25)
    ctx.restore()

    drawGuides(ctx)
    drawMovementPaths(ctx)

    if (alignmentGuides.length > 0) {
      ctx.save()
      ctx.strokeStyle = '#3498db'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])

      alignmentGuides.forEach(guide => {
        if (guide.x !== undefined) {
          ctx.beginPath()
          ctx.moveTo(guide.x, 0)
          ctx.lineTo(guide.x, canvas.height)
          ctx.stroke()
        }
        if (guide.y !== undefined) {
          ctx.beginPath()
          ctx.moveTo(0, guide.y)
          ctx.lineTo(canvas.width, guide.y)
          ctx.stroke()
        }
      })

      ctx.restore()
    }

    characters.forEach((char) => {
      const angle = char.angle ?? 0
      // Determine draw alpha based on per-keyframe visibility and playback
      let alpha = 1
      if (isPlaying && animationProgress !== null && kfsRef.current) {
        const pair = animPairRef.current
        const from = kfsRef.current[pair]?.characters.find(c => c.id === char.id)
        const to = kfsRef.current[pair + 1]?.characters.find(c => c.id === char.id)
        const fromVis = from ? (from.visible !== false) : true
        const toVis = to ? (to.visible !== false) : true
        const fade = (fadeProgress ?? animationProgress) ?? 0
        if (!fromVis && !toVis) alpha = 0
        else if (fromVis && !toVis) alpha = 1 - fade
        else if (!fromVis && toVis) alpha = fade
        else alpha = 1
      } else {
        // Not playing: if character marked invisible in current snapshot, skip drawing
        if (char.visible === false) return
        alpha = 1
      }

      ctx.save()
      ctx.globalAlpha = alpha

      // proceed to draw the character with the applied globalAlpha

      const size = char.size ?? 1
      const shoulderDist = 8 * size
      const shoulderX = char.x - Math.cos(angle) * shoulderDist
      const shoulderY = char.y - Math.sin(angle) * shoulderDist

      const eyeOffsetAngle = (char.eyeOffset ?? 0) + angle
      const shouldersUnder = Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle))

      if (shouldersUnder) {
        ctx.save()
        ctx.translate(shoulderX, shoulderY)
        ctx.beginPath()
        ctx.ellipse(0, 0, 18 * size, 10 * size, 0, 0, Math.PI * 2)
        ctx.fillStyle = char.shoulderColor || '#ff6b6b'
        ctx.fill()
        ctx.restore()
      }

      ctx.save()
      ctx.translate(char.x, char.y)
      ctx.beginPath()
      ctx.ellipse(0, 0, 12 * size, 10 * size, 0, 0, Math.PI * 2)
      ctx.fillStyle = char.color || '#ffd93d'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#e6b800'
      ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.translate(char.x, char.y)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      const headRx = 12 * size
      const headRy = 10 * size
      const startX = Math.cos(eyeOffsetAngle) * (headRx + 2)
      const startY = Math.sin(eyeOffsetAngle) * (headRy + 2)
      const lineLen = 6 * size
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(startX + Math.cos(eyeOffsetAngle) * lineLen, startY + Math.sin(eyeOffsetAngle) * lineLen)
      ctx.stroke()
      ctx.restore()

      ctx.fillStyle = '#000'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(char.name, char.x, char.y)

      if (selectedCharId === char.id && !(dragRef.current.type === 'char-move' && dragRef.current.hasMoved)) {
        ctx.beginPath()
        ctx.arc(char.x, char.y, 16 * size, 0, Math.PI * 2)
        ctx.strokeStyle = '#2c3e50'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      if (!shouldersUnder) {
        ctx.save()
        ctx.translate(shoulderX, shoulderY)
        ctx.beginPath()
        ctx.ellipse(0, 0, 18 * size, 10 * size, 0, 0, Math.PI * 2)
        ctx.fillStyle = char.shoulderColor || '#ff6b6b'
        ctx.fill()
        ctx.restore()
      }

      ctx.restore()
    })
  }

  // ── Keyframe helpers ──
  function renumberKeyframes(kfs: Keyframe[], boundaries?: number[]): Keyframe[] {
    const bnds = boundaries ?? sceneBoundaries
    if (!bnds || bnds.length === 0) {
      return kfs.map((kf, i) => ({ ...kf, label: `${i + 1}` }))
    }
    return kfs.map((kf, i) => {
      // find latest boundary <= i
      let b = 0
      for (let j = 0; j < bnds.length; j++) {
        if (bnds[j] <= i) b = bnds[j]
        else break
      }
      return { ...kf, label: `${i - b + 1}` }
    })
  }

  function toggleKeyframeMode() {
    if (!keyframeMode) {
      setAddMode(false)
      setAwaitingDirectionFor(null)
      setSelectedCharId(null)
      // Re-enter with existing keyframes if available
      if (keyframes.length > 0) {
        // Sync: add new characters to all keyframe snapshots, remove deleted ones, preserve visibility
        const currentIds = new Set(characters.map(c => c.id))
        const synced = keyframes.map(kf => {
          const kfIds = new Set(kf.characters.map(c => c.id))
          // Keep existing characters that still exist, remove deleted ones
          const kept = kf.characters.filter(c => currentIds.has(c.id))
          // Add new characters (not in this keyframe) at their current position, visible by default
          const added = characters.filter(c => !kfIds.has(c.id)).map(c => ({ ...c, visible: true }))
          // For all, ensure visible is set (default true)
          return { ...kf, characters: [...kept, ...added].map(c => ({ ...c, visible: c.visible !== false })) }
        })
        setKeyframes(synced)
        setActiveKeyframeIndex(activeKeyframeIndex)
        setCharacters(JSON.parse(JSON.stringify(synced[activeKeyframeIndex].characters)))
        setKeyframeMode(true)
        saveToHistory(JSON.parse(JSON.stringify(synced[activeKeyframeIndex].characters)), synced, activeKeyframeIndex)
      } else {
        // When creating first keyframes, set all visible true
        const snap = characters.map(c => ({ ...c, visible: true }))
        const kf1: Keyframe = { id: nextKfId.current++, label: '1', characters: snap }
        const kf2: Keyframe = { id: nextKfId.current++, label: '2', characters: snap.map(c => ({ ...c })) }
        const initialKfs = [kf1, kf2]
        const relabeled = renumberKeyframes(initialKfs)
        setKeyframes(relabeled)
        // initial scene starts at 0
        setSceneBoundaries([0])
        setActiveKeyframeIndex(1)
        setKeyframeMode(true)
        saveToHistory(characters, relabeled, 1)
      }
    } else {
      stopPlayback()
      // Commit current characters into keyframes and record history before exiting
      const committed = keyframes.map((kf, i) => i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf)
      setKeyframes(committed)
      saveToHistory(characters, committed, activeKeyframeIndex)
      setKeyframeMode(false)
    }
  }

  // Scene navigation helpers
  const totalScenes = Math.max(1, sceneBoundaries.length)
  function prevScene() {
    setSceneIndex((s) => {
      const total = Math.max(1, sceneBoundaries.length)
      const next = s <= 0 ? total - 1 : s - 1
      const start = sceneBoundaries[next] ?? 0
      setActiveKeyframeIndex(start)
      setCharacters(JSON.parse(JSON.stringify(keyframes[start]?.characters || characters)))
      return next
    })
  }
  function nextScene() {
    setSceneIndex((s) => {
      const total = Math.max(1, sceneBoundaries.length)
      const next = s >= total - 1 ? 0 : s + 1
      const start = sceneBoundaries[next] ?? 0
      setActiveKeyframeIndex(start)
      setCharacters(JSON.parse(JSON.stringify(keyframes[start]?.characters || characters)))
      return next
    })
  }
  function renameScene(idx: number, name: string) {
    setSceneNames((prev) => {
      const copy = prev.slice()
      copy[idx] = name
      return copy
    })
  }

  function deleteScene(idx?: number) {
    const delIdx = typeof idx === 'number' ? idx : sceneIndex
    const totalScenes = Math.max(1, sceneBoundaries.length)
    if (delIdx === 0) {
      showToast('Cannot delete Scene 1', 'info')
      return
    }
    if (totalScenes <= 1) {
      showToast('Cannot delete the last scene', 'info')
      return
    }

    const start = sceneBoundaries[delIdx] ?? 0
    const end = sceneBoundaries[delIdx + 1] ?? keyframes.length
    const removedLen = end - start

    // Remove keyframes for the scene
    const updatedKfs = [...keyframes.slice(0, start), ...keyframes.slice(end)]

    // Adjust boundaries: remove the deleted boundary and shift subsequent ones
    const newBoundaries = sceneBoundaries
      .map((b, i) => ({ b, i }))
      .filter(x => x.i !== delIdx)
      .map(x => (x.b < start ? x.b : x.b - removedLen))

    const newSceneNames = sceneNames.filter((_, i) => i !== delIdx)

    const relabeled = renumberKeyframes(updatedKfs, newBoundaries)

    // Choose new active scene index
    const newSceneIndex = Math.max(0, Math.min(newBoundaries.length - 1, delIdx === 0 ? 0 : delIdx - 1))
    const newActive = newBoundaries[newSceneIndex] ?? 0

    setKeyframes(relabeled)
    setSceneBoundaries(newBoundaries)
    setSceneNames(newSceneNames)
    setSceneIndex(newSceneIndex)
    setActiveKeyframeIndex(newActive)
    setCharacters(JSON.parse(JSON.stringify(relabeled[newActive].characters)))
    saveToHistory(JSON.parse(JSON.stringify(relabeled[newActive].characters)), relabeled, newActive)
    showToast('Scene deleted')
  }

  function createNewScene() {
    // Commit current state to history
    saveToHistory(characters, keyframes, activeKeyframeIndex)
    // Create a new scene containing two keyframes where every character is offstage
    const offstage = characters.map(c => ({ ...c, visible: false }))
    const kf1: Keyframe = { id: nextKfId.current++, label: '', characters: JSON.parse(JSON.stringify(offstage)) }
    // second keyframe follows the first until edited
    const kf2: Keyframe = { id: nextKfId.current++, label: '', characters: JSON.parse(JSON.stringify(offstage)), linkedTo: keyframes.length }
    const next = [...keyframes, kf1, kf2]

    // compute new boundaries and relabel immediately
    const newBoundaries = (sceneBoundaries || []).slice()
    newBoundaries.push(keyframes.length)
    const relabeled = renumberKeyframes(next, newBoundaries)
    setSceneBoundaries(newBoundaries)
    setKeyframes(relabeled)

    // new scene index is last boundary
    const newSceneIndex = newBoundaries.length - 1
    const sceneStart = keyframes.length
    const activeIdx = sceneStart // start at first keyframe in new scene

    setCharacters(JSON.parse(JSON.stringify(relabeled[activeIdx].characters)))
    setActiveKeyframeIndex(activeIdx)
    setSceneIndex(newSceneIndex)

    setSceneNames(prev => {
      const copy = prev.slice()
      copy[newSceneIndex] = copy[newSceneIndex] || `Scene ${newSceneIndex + 1}`
      return copy
    })

    saveToHistory(JSON.parse(JSON.stringify(relabeled[activeIdx].characters)), relabeled, activeIdx)
  }


  function addKeyframe() {

    // When adding a keyframe, preserve visibility
    const kf: Keyframe = {
      id: nextKfId.current++,
      label: '',
      characters: characters.map(c => ({ ...c, visible: c.visible !== false }))
    }
    // By default insert within current scene after its last frame
    const currentSceneStart = sceneBoundaries[sceneIndex] ?? 0
    const nextBoundary = sceneBoundaries[sceneIndex + 1] ?? keyframes.length
    const insertAt = nextBoundary
    const updated = renumberKeyframes([...keyframes.slice(0, insertAt), kf, ...keyframes.slice(insertAt)])
    // expand current scene boundary implicitly handled by renumbering; no explicit sizes
    setKeyframes(updated)
    setActiveKeyframeIndex(insertAt)
    saveToHistory(characters, updated, insertAt)
  }

  function deleteKeyframe(index: number) {
    if (keyframes.length <= 1) return
    const updated = renumberKeyframes(keyframes.filter((_, i) => i !== index))
    setKeyframes(updated)
    const newIndex = Math.min(index, updated.length - 1)
    setActiveKeyframeIndex(newIndex)
    setCharacters(JSON.parse(JSON.stringify(updated[newIndex].characters)))
    saveToHistory(JSON.parse(JSON.stringify(updated[newIndex].characters)), updated, newIndex)
  }

  function renameKeyframe(index: number, name: string) {
    const updated = keyframes.map((kf, i) => i === index ? { ...kf, label: name } : kf)
    setKeyframes(updated)
    saveToHistory(characters, updated, activeKeyframeIndex)
  }

  function selectKeyframe(index: number) {
    if (isPlaying) return
    const newKfs = keyframes.map((kf, i) => i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf)
    setKeyframes(newKfs)
    setKeyframes(prev => prev.map((kf, i) => i === index && (kf as any).linkedTo !== undefined ? { ...kf, linkedTo: undefined } : kf))
    const idx = Math.max(0, Math.min(index, newKfs.length - 1))
    let newScene = 0
    for (let j = 0; j < (sceneBoundaries || []).length; j++) {
      if ((sceneBoundaries || [0])[j] <= idx) newScene = j
      else break
    }
    setSceneIndex(newScene)
    setActiveKeyframeIndex(idx)
    setCharacters(JSON.parse(JSON.stringify(newKfs[idx].characters)))
    setSelectedCharId(null)
    setAwaitingDirectionFor(null)
  }

  function goToPrevKeyframe() {
    const sceneStart = sceneBoundaries[sceneIndex] ?? 0
    const sceneEnd = sceneBoundaries[sceneIndex + 1] ?? keyframes.length
    if (activeKeyframeIndex > sceneStart) {
      selectKeyframe(activeKeyframeIndex - 1)
    } else {
      // wrap within the current scene to its last keyframe
      selectKeyframe(sceneEnd - 1)
    }
  }

  function goToNextKeyframe() {
    const sceneStart = sceneBoundaries[sceneIndex] ?? 0
    const sceneEnd = sceneBoundaries[sceneIndex + 1] ?? keyframes.length
    if (activeKeyframeIndex < sceneEnd - 1) {
      selectKeyframe(activeKeyframeIndex + 1)
    } else {
      // wrap within the current scene to its first keyframe
      selectKeyframe(sceneStart)
    }
  }

  function startPlayback() {
    if (keyframes.length < 2) return
    setIsPlaying(true)
    setSelectedCharId(null)
    setAwaitingDirectionFor(null)

    // Snapshot all keyframes for the animation closure
    const allKfs: Keyframe[] = JSON.parse(JSON.stringify(keyframes.map((kf, i) =>
      i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf
    )))

    // Determine current scene boundaries and animate only within that scene
    const sceneStart = sceneBoundaries[sceneIndex] ?? 0
    const sceneEnd = sceneBoundaries[sceneIndex + 1] ?? allKfs.length
    const sceneKfs = allKfs.slice(sceneStart, sceneEnd)
    if (sceneKfs.length < 2) {
      setIsPlaying(false)
      return
    }

    // Start playback from the first keyframe of the current scene (scene-local index 0)
    const startIndex = 0
    let currentKfPair = startIndex
    const totalPairs = sceneKfs.length - 1
    // Separate durations: slower movement interpolation, configurable faster fade for hide/show
    const msMove = keyframeSpeed
    const msFade = fadeSpeed
    let startTime: number | null = null
    // Use scene-local snapshots for animation
    kfsRef.current = sceneKfs
    animPairRef.current = startIndex
    // Show the "to" frame index in the UI so the beginning appears as the second one
    setActiveKeyframeIndex(Math.min(sceneStart + startIndex + 1, sceneStart + sceneKfs.length - 1))
    setCharacters(JSON.parse(JSON.stringify(sceneKfs[startIndex].characters)))

    function animate(timestamp: number) {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      let pairProgress = elapsed / msMove

      // If we've already reached or passed the last pair, finish the animation
      if (currentKfPair >= totalPairs) {
        setCharacters(JSON.parse(JSON.stringify(sceneKfs[sceneKfs.length - 1].characters)))
        setActiveKeyframeIndex(sceneStart + sceneKfs.length - 1)
        setAnimationProgress(null)
        setFadeProgress(null)
        setIsPlaying(false)
        animFrameRef.current = null
        return
      }

      // Advance through completed transitions
      while (pairProgress >= 1 && currentKfPair < totalPairs) {
        currentKfPair++
        startTime = startTime! + msMove
        pairProgress = (timestamp - startTime) / msMove

        if (currentKfPair >= totalPairs) {
          // Animation complete — snap to final frame within the scene
          setCharacters(JSON.parse(JSON.stringify(sceneKfs[sceneKfs.length - 1].characters)))
          setActiveKeyframeIndex(sceneStart + sceneKfs.length - 1)
          setAnimationProgress(null)
          setFadeProgress(null)
          setIsPlaying(false)
          animFrameRef.current = null
          return
        }
      }

      const t = Math.max(0, Math.min(pairProgress, 1))
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      // Compute fade progress independently so fadeSpeed can be different from move duration
      const fadeElapsed = timestamp - startTime
      const fadeT = Math.max(0, Math.min(fadeElapsed / msFade, 1))

      const fromChars = sceneKfs[currentKfPair].characters
      const toChars = sceneKfs[currentKfPair + 1].characters

      const interpolated = fromChars.map((fc: Character) => {
        const tc = toChars.find((c: Character) => c.id === fc.id)
        if (!tc) return fc

        const fromEntry = sceneKfs[currentKfPair].characters.find((c: Character) => c.id === fc.id)
        const toEntry = sceneKfs[currentKfPair + 1].characters.find((c: Character) => c.id === fc.id)
        const fromVis = fromEntry ? (fromEntry.visible !== false) : true
        const toVis = toEntry ? (toEntry.visible !== false) : true

        // If the character was hidden in the "from" frame but visible in the "to" frame,
        // don't interpolate position — jump to the target and only fade in.
        if (!fromVis && toVis) {
          return { ...tc }
        }
        // If it becomes hidden in the "to" frame, keep the from position and fade out.
        if (fromVis && !toVis) {
          return { ...fc }
        }

        // Normal interpolation when visible on both frames
        return {
          ...fc,
          x: fc.x + (tc.x - fc.x) * eased,
          y: fc.y + (tc.y - fc.y) * eased,
          angle: fc.angle !== undefined && tc.angle !== undefined
            ? fc.angle + (tc.angle - fc.angle) * eased
            : tc.angle,
          eyeOffset: fc.eyeOffset !== undefined && tc.eyeOffset !== undefined
            ? fc.eyeOffset + (tc.eyeOffset - fc.eyeOffset) * eased
            : tc.eyeOffset
        }
      })

      setCharacters(interpolated)
      // Display the target keyframe (current pair + 1) during interpolation (relative to scene)
      setActiveKeyframeIndex(sceneStart + Math.min(currentKfPair + 1, sceneKfs.length - 1))
      animPairRef.current = currentKfPair
      setAnimationProgress(eased)
      setFadeProgress(fadeT)

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }

  function stopPlayback() {
    setIsPlaying(false)
    setAnimationProgress(null)
    setFadeProgress(null)
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    kfsRef.current = null
    animPairRef.current = 0
    if (keyframes.length > 0 && activeKeyframeIndex < keyframes.length) {
      setCharacters(JSON.parse(JSON.stringify(keyframes[activeKeyframeIndex].characters)))
    }
  }

  // Auto-save characters to active keyframe when editing (non-playing)
  useEffect(() => {
    if (keyframeMode && !isPlaying && keyframes.length > 0) {
      setKeyframes(prev => {
        const updated = prev.map((kf, i) => i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf)
        const nextIdx = activeKeyframeIndex + 1
        if (prev[nextIdx] && (prev[nextIdx] as any).linkedTo === activeKeyframeIndex) {
          updated[nextIdx] = { ...updated[nextIdx], characters: JSON.parse(JSON.stringify(characters)) }
        }
        return updated
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters, keyframeMode, isPlaying])

  // ── Draw movement paths ──
  function drawMovementPaths(ctx: CanvasRenderingContext2D) {
    if (!keyframeMode || keyframes.length < 2) return

    // Gather all character IDs
    const charIds = new Set<string>()
    keyframes.forEach(kf => kf.characters.forEach(c => charIds.add(c.id)))

    charIds.forEach(charId => {
      // Get positions across keyframes for this character
      const positions: { kfIndex: number; x: number; y: number; color: string; visible: boolean }[] = []
      keyframes.forEach((kf, kfi) => {
        const c = kf.characters.find(ch => ch.id === charId)
        if (c) positions.push({ kfIndex: kfi, x: c.x, y: c.y, color: c.color || '#ffd93d', visible: c.visible !== false })
      })
      if (positions.length < 2) return

      ctx.save()

      // Two modes:
      // - Playing: draw only the currently-walking pair (animPairRef.current -> animPairRef.current+1)
      //   and respect visibility rules (hide segments when source is hidden).
      // - Editing (paused keyframe mode): draw the previous -> current keyframe connector
      //   so users can preview the move; use live `characters` as the target so dragging
      //   shows the live connector from previous snapshot to the current (dragged) position.
      if (isPlaying) {
        const curPair = animPairRef.current
        // animPairRef is stored as scene-local index; translate to global keyframe index for positions lookup
        const sceneIdx = sceneIndex
        const sceneStartIdx = sceneBoundaries[sceneIdx] ?? 0
        const globalPair = sceneStartIdx + curPair
        const fromEntry = positions.find(p => p.kfIndex === globalPair)
        const toEntry = positions.find(p => p.kfIndex === globalPair + 1)
        if (!fromEntry || !toEntry) { ctx.restore(); return }

        // If the character is hidden in the from frame, don't draw while playing
        if (fromEntry.visible === false) { ctx.restore(); return }

        const fromPos = fromEntry
        const toPos = toEntry

        // Draw segment
        ctx.strokeStyle = '#f1c40f'
        ctx.globalAlpha = 0.6
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(fromPos.x, fromPos.y)
        ctx.lineTo(toPos.x, toPos.y)
        ctx.stroke()

        // Dot at target
        ctx.setLineDash([])
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        ctx.arc(toPos.x, toPos.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = toPos.color
        ctx.fill()

        // Moving arrow
        if (animationProgress !== null) {
          const dx = toPos.x - fromPos.x
          const dy = toPos.y - fromPos.y
          const dist = Math.hypot(dx, dy)
          if (dist >= 20) {
            const t = animationProgress
            const ax = fromPos.x + dx * t
            const ay = fromPos.y + dy * t
            const angle = Math.atan2(dy, dx)
            const arrowSize = 6
            ctx.setLineDash([])
            ctx.beginPath()
            ctx.moveTo(ax + Math.cos(angle) * arrowSize, ay + Math.sin(angle) * arrowSize)
            ctx.lineTo(ax + Math.cos(angle + 2.5) * arrowSize, ay + Math.sin(angle + 2.5) * arrowSize)
            ctx.lineTo(ax + Math.cos(angle - 2.5) * arrowSize, ay + Math.sin(angle - 2.5) * arrowSize)
            ctx.closePath()
            ctx.fillStyle = '#f1c40f'
            ctx.fill()
          }
        }

        ctx.restore()
        return
      }

      // Editing/paused: show previous -> current connector. Use live `characters` as the
      // target so dragging updates the endpoint in real time.
      const curIdx = activeKeyframeIndex
      const prevIdx = curIdx - 1
      if (prevIdx < 0) { ctx.restore(); return }

      // Don't draw editing connectors across scene boundaries
      const curSceneStart = sceneBoundaries[sceneIndex] ?? 0
      if (prevIdx < curSceneStart) { ctx.restore(); return }

      const fromEntry = positions.find(p => p.kfIndex === prevIdx)
      // live target from `characters` state (reflects dragging)
      const liveTarget = characters.find(c => c.id === charId)
      if (!fromEntry || !liveTarget) { ctx.restore(); return }

      // Skip path if previous state was offstage
      if (fromEntry.visible === false) { ctx.restore(); return }

      const fromPos = fromEntry
      const toPos = { kfIndex: curIdx, x: liveTarget.x, y: liveTarget.y, color: liveTarget.color || '#ffd93d', visible: liveTarget.visible !== false }

      // Draw the editing connector regardless of playback visibility rules so users can preview
      // their move while dragging.
      ctx.strokeStyle = '#f1c40f'
      ctx.globalAlpha = 0.75
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(fromPos.x, fromPos.y)
      ctx.lineTo(toPos.x, toPos.y)
      ctx.stroke()

      ctx.setLineDash([])
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.arc(toPos.x, toPos.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = toPos.color
      ctx.fill()

      ctx.restore()
    })
  }

  function saveToLocalStorage() {
    let committedKfs = keyframes
    if (keyframeMode) {
      // Commit current characters into the active keyframe before saving
      committedKfs = keyframes.map((kf, i) =>
        i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf
      )
      setKeyframes(committedKfs)
    }

    const state = {
      characters: JSON.parse(JSON.stringify(characters)),
      guides,
      canvasSize,
      counter,
      defaultPersonSize,
      defaultPersonColor,
      defaultShoulderColor,
      // keyframes kept flat for compatibility, but include scene metadata
      keyframes: committedKfs,
      sceneBoundaries: sceneBoundaries || [0],
      sceneNames: sceneNames || [],
      sceneIndex,
      keyframeMode,
      activeKeyframeIndex,
      keyframeSpeed
    }
    localStorage.setItem('stageLayout', JSON.stringify(state))
    showToast('Layout saved')
  }

  function loadFromLocalStorage() {
    const saved = localStorage.getItem('stageLayout')
    if (saved) {
      try {
        const state = JSON.parse(saved)
        setGuides(state.guides || [])
        setCanvasSize(state.canvasSize || { width: 1600, height: 900 })
        setCounter(state.counter || 0)
        setDefaultPersonSize(state.defaultPersonSize || 1)
        setDefaultPersonColor(state.defaultPersonColor || '#ffd93d')
        setDefaultShoulderColor(state.defaultShoulderColor || '#ff6b6b')
        // Load keyframes with backward compatibility for a few formats:
        // - legacy: state.keyframes (flat)
        // - nested scenes: state.scenes (array of arrays or objects with keyframes)
        let loadedKfs: Keyframe[] = []
        if (state.scenes && Array.isArray(state.scenes)) {
          if (state.scenes.length > 0 && Array.isArray(state.scenes[0])) {
            loadedKfs = state.scenes.flat() as Keyframe[]
          } else {
            // scenes may be objects with a `keyframes` array
            loadedKfs = state.scenes.flatMap((s: any) => s.keyframes ?? [])
          }
        } else if (state.keyframes && Array.isArray(state.keyframes)) {
          loadedKfs = state.keyframes
        }

        if (loadedKfs && loadedKfs.length > 0) {
          setKeyframes(loadedKfs)

          // Restore active index safely
          let idx = state.activeKeyframeIndex ?? state.sceneIndex ?? 0
          if (idx < 0) idx = 0
          if (idx >= loadedKfs.length) idx = loadedKfs.length - 1
          setActiveKeyframeIndex(idx)

          // Re-calculate nextKfId safely
          const maxId = Math.max(0, ...loadedKfs.map((kf: Keyframe) => kf.id || 0))
          nextKfId.current = maxId + 1

          // Restore scene boundaries and names if present, else derive defaults
          if (state.sceneBoundaries && Array.isArray(state.sceneBoundaries) && state.sceneBoundaries.length > 0) {
            setSceneBoundaries(state.sceneBoundaries)
          } else if (state.scenes && Array.isArray(state.scenes) && state.scenes.length > 0) {
            // derive boundaries from scenes lengths
            const b: number[] = []
            let acc = 0
            for (const s of state.scenes) {
              b.push(acc)
              const len = Array.isArray(s) ? s.length : (s.keyframes ? s.keyframes.length : 0)
              acc += len
            }
            setSceneBoundaries(b)
          } else {
            setSceneBoundaries([0])
          }

          setSceneNames(state.sceneNames && Array.isArray(state.sceneNames) ? state.sceneNames : ['Scene 1'])
          setSceneIndex(typeof state.sceneIndex === 'number' ? state.sceneIndex : 0)

          // If saved in keyframe mode, restore characters from the active keyframe
          if (state.keyframeMode) {
            setKeyframeMode(true)
            setCharacters(JSON.parse(JSON.stringify(loadedKfs[Math.min(idx, loadedKfs.length - 1)].characters || [])))
            saveToHistory(JSON.parse(JSON.stringify(loadedKfs[Math.min(idx, loadedKfs.length - 1)].characters || [])), loadedKfs, idx)
          } else {
            setKeyframeMode(false)
            setCharacters(state.characters || [])
          }
        }

        setSelectedCharId(null)
        setAwaitingDirectionFor(null)
        showToast('Layout loaded')
      } catch (err) {
        showToast('Failed to load saved layout', 'error')
      }
    } else {
      showToast('No saved layout found', 'info')
    }
  }

  function exportAsJSON() {
    let committedKfs = keyframes
    if (keyframeMode) {
      committedKfs = keyframes.map((kf, i) =>
        i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf
      )
    }
    const state = {
      characters,
      guides,
      canvasSize,
      counter,
      defaultPersonSize,
      defaultPersonColor,
      defaultShoulderColor,
      keyframes: committedKfs,
      sceneBoundaries: sceneBoundaries || [0],
      sceneNames: sceneNames || [],
      sceneIndex,
      keyframeMode,
      keyframeSpeed
    }
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'stage-layout.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importFromJSON() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          try {
            const state = JSON.parse(ev.target?.result as string)
            setCharacters(state.characters || [])
            setGuides(state.guides || [])
            setCanvasSize(state.canvasSize || { width: 1600, height: 900 })
            setCounter(state.counter || 0)
            setDefaultPersonSize(state.defaultPersonSize || 1)
            setDefaultPersonColor(state.defaultPersonColor || '#ffd93d')
            setDefaultShoulderColor(state.defaultShoulderColor || '#ff6b6b')

            // Reuse the same compatibility logic as loadFromLocalStorage
            let loadedKfs: Keyframe[] = []
            if (state.scenes && Array.isArray(state.scenes)) {
              if (state.scenes.length > 0 && Array.isArray(state.scenes[0])) {
                loadedKfs = state.scenes.flat() as Keyframe[]
              } else {
                loadedKfs = state.scenes.flatMap((s: any) => s.keyframes ?? [])
              }
            } else if (state.keyframes && Array.isArray(state.keyframes)) {
              loadedKfs = state.keyframes
            }

            if (loadedKfs && loadedKfs.length > 0) {
              setKeyframes(loadedKfs)
              const idx = state.activeKeyframeIndex ?? 0
              setActiveKeyframeIndex(Math.max(0, Math.min(loadedKfs.length - 1, idx)))
              const maxId = Math.max(0, ...loadedKfs.map((kf: any) => kf.id || 0))
              nextKfId.current = maxId + 1
              if (state.keyframeMode) {
                setKeyframeMode(true)
                setCharacters(JSON.parse(JSON.stringify(loadedKfs[Math.min(idx, loadedKfs.length - 1)].characters || [])))
              } else {
                setKeyframeMode(false)
                setCharacters(state.characters || [])
              }
            } else {
              setKeyframes([])
              setKeyframeMode(false)
              setCharacters(state.characters || [])
              nextKfId.current = 1
            }
            setSelectedCharId(null)
            setAwaitingDirectionFor(null)
            showToast('Layout imported')
          } catch (err) {
            showToast('Failed to import layout', 'error')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  function exportAsImage() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'stage-layout.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    }, 'image/png')
  }

  // ── Toolbar action handlers ──
  function handleDeleteSelected() {
    const updated = characters.filter((c) => c.id !== selectedCharId)
    setCharacters(updated)
    saveToHistory(updated)
    setSelectedCharId(null)
    setAwaitingDirectionFor(null)
  }

  function handleDuplicateSelected() {
    const char = characters.find((c) => c.id === selectedCharId)
    if (char) {
      const id = String.fromCharCode(65 + (counter % 26))
      setCounter((c) => c + 1)
      const duplicate = { ...char, id, name: id, x: char.x + 30, y: char.y + 30 }
      const updated = [...characters, duplicate]
      setCharacters(updated)
      saveToHistory(updated)
      setSelectedCharId(duplicate.id)
    }
  }


  function handleNameChange(newName: string) {
    if (!selectedCharId) return
    const updated = characters.map((c) => (c.id === selectedCharId ? { ...c, name: newName } : c))
    setCharacters(updated)

    // Always propagate rename into keyframe snapshots if any exist so playback
    // and future keyframe edits reflect the new name, even when renaming outside
    // of keyframe mode.
    if (keyframes.length > 0) {
      const updatedKfs = keyframes.map(kf => ({ ...kf, characters: kf.characters.map(c => c.id === selectedCharId ? { ...c, name: newName } : c) }))
      setKeyframes(updatedKfs)
      if (kfsRef.current) {
        kfsRef.current = kfsRef.current.map(kf => ({ ...kf, characters: kf.characters.map(c => c.id === selectedCharId ? { ...c, name: newName } : c) }))
      }
      saveToHistory(updated, updatedKfs, activeKeyframeIndex)
    } else {
      if (kfsRef.current) {
        kfsRef.current = kfsRef.current.map(kf => ({ ...kf, characters: kf.characters.map(c => c.id === selectedCharId ? { ...c, name: newName } : c) }))
      }
      saveToHistory(updated)
    }
  }

  function handleSizeChange(v: number) {
    if (selectedCharId) {
      const updated = characters.map((c) => (c.id === selectedCharId ? { ...c, size: v } : c))
      setCharacters(updated)
      saveToHistory(updated)
    } else {
      setDefaultPersonSize(v)
    }
  }

  function handleColorChange(head: string, shoulder: string) {
    if (selectedCharId) {
      const updated = characters.map((c) => (c.id === selectedCharId ? { ...c, color: head, shoulderColor: shoulder } : c))
      setCharacters(updated)
      saveToHistory(updated)
    } else {
      setDefaultPersonColor(head)
      setDefaultShoulderColor(shoulder)
    }
  }

  function handleToggleReverse() {
    const h = canvasSize.height

    // Mirror helper: flips Y and reverses the facing angle
    function mirrorChars(chars: Character[]): Character[] {
      return chars.map(c => ({
        ...c,
        y: h - c.y,
        angle: c.angle !== undefined ? -c.angle : undefined
      }))
    }

    // Flip current characters
    const flipped = mirrorChars(characters)
    setCharacters(flipped)
    if (!keyframeMode && keyframes.length === 0) {
      saveToHistory(flipped)
    }

    // Flip all keyframe snapshots (regardless of whether keyframe mode is active)
    if (keyframes.length > 0) {
      const updatedKfs = keyframes.map((kf, i) =>
        i === activeKeyframeIndex
          ? { ...kf, characters: JSON.parse(JSON.stringify(flipped)) }
          : { ...kf, characters: mirrorChars(kf.characters) }
      )
      setKeyframes(updatedKfs)
      saveToHistory(flipped, updatedKfs, activeKeyframeIndex)
    }

    setStageReversed(r => !r)
  }

  // Update visibility for a character in the current keyframe only
  function handleUpdateCharVisible(charId: string, visible: boolean) {
    if (!keyframeMode) return;
    // If hiding, check if character moved in this keyframe.
    // If it moved, we auto-create a new keyframe for the hide action.
    if (visible === false) {
      let charMovedInThisKf = false
      if (activeKeyframeIndex > 0) {
        const prevKf = keyframes[activeKeyframeIndex - 1]
        const currentKf = keyframes[activeKeyframeIndex]
        if (prevKf && currentKf) {
          const prevChar = prevKf.characters.find(c => c.id === charId)
          const currChar = characters.find(c => c.id === charId) // Use live characters state
          if (prevChar && currChar) {
            charMovedInThisKf = prevChar.x !== currChar.x || prevChar.y !== currChar.y || (prevChar.angle ?? 0) !== (currChar.angle ?? 0)
          }
        }
      }

      if (charMovedInThisKf) {
        // Smart Hide: Create new keyframe and hide there
        const kf: Keyframe = {
          id: nextKfId.current++,
          label: '',
          characters: characters.map(c => ({
            ...c,
            visible: c.id === charId ? false : (c.visible !== false)
          }))
        }
        const newIndex = activeKeyframeIndex + 1
        const updated = renumberKeyframes([...keyframes.slice(0, newIndex), kf, ...keyframes.slice(newIndex)])
        setKeyframes(updated)
        setActiveKeyframeIndex(newIndex)
        setCharacters(JSON.parse(JSON.stringify(kf.characters)))
        saveToHistory(kf.characters, updated, newIndex)

        const charName = characters.find(c => c.id === charId)?.name || charId
        showToast(`Created new keyframe to hide ${charName} because they moved here.`, 'warning')
        if (selectedCharId === charId) setSelectedCharId(null)
        return
      }

      // Normal hide propagation logic
      const proposed = keyframes.map((kf, i) => i >= activeKeyframeIndex
        ? { ...kf, characters: kf.characters.map(c => c.id === charId ? { ...c, visible: false } : c) }
        : kf
      )
      setKeyframes(proposed)
      setCharacters(JSON.parse(JSON.stringify(proposed[activeKeyframeIndex].characters)))
      if (selectedCharId === charId) setSelectedCharId(null)
      return
    }

    // If showing, only set visible in the active keyframe
    const proposed = keyframes.map((kf, i) => i === activeKeyframeIndex ? { ...kf, characters: kf.characters.map(c => c.id === charId ? { ...c, visible: true } : c) } : kf)
    const proposedActive = JSON.parse(JSON.stringify(proposed[activeKeyframeIndex].characters)) as Character[]
    setKeyframes(proposed)
    setCharacters(JSON.parse(JSON.stringify(proposed[activeKeyframeIndex].characters)))
  }

  // Offstage panel removed — a simple right-side label is rendered instead.

  return (
    <div className="app">
      {/* Collapsible Sidebar Dock (Overlay) */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content Area (Full width, sidebar sits on top) */}
      <div className="flex-1 flex flex-col min-w-0 relative pt-8 pl-12 justify-between items-center">
        <div style={{ width: '100%', maxWidth: canvasSize.width + 'px', margin: '0 auto' }}>
          <Toolbar
          addMode={addMode}
          setAddMode={setAddMode}
          selectedCharId={selectedCharId}
          characters={characters}
          awaitingDirectionFor={awaitingDirectionFor}
          onDeleteSelected={handleDeleteSelected}
          onDuplicateSelected={handleDuplicateSelected}

          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={undo}
          onRedo={redo}
          onNameChange={handleNameChange}
          user={user}
          onLogout={onLogout}
          configMenuOpen={configMenuOpen}
          setConfigMenuOpen={setConfigMenuOpen}
          canvasSize={canvasSize}
          onCanvasSizeChange={setCanvasSize}
          defaultPersonSize={defaultPersonSize}
          defaultPersonColor={defaultPersonColor}
          defaultShoulderColor={defaultShoulderColor}
          onSizeChange={handleSizeChange}
          onColorChange={handleColorChange}
          stageReversed={stageReversed}
          onToggleReverse={handleToggleReverse}
          fileMenuOpen={fileMenuOpen}
          setFileMenuOpen={setFileMenuOpen}
          onSave={saveToLocalStorage}
          onLoad={loadFromLocalStorage}
          onExportJSON={exportAsJSON}
          onImportJSON={importFromJSON}
          onExportPNG={exportAsImage}
          keyframeMode={keyframeMode}
          onToggleKeyframeMode={toggleKeyframeMode}
          keyframes={keyframes}
          activeKeyframeIndex={activeKeyframeIndex}
          sceneIndex={sceneIndex}
          sceneSize={sceneSize}
          sceneStart={sceneBoundaries[sceneIndex] ?? 0}
          sceneLength={(sceneBoundaries[sceneIndex + 1] ?? keyframes.length) - (sceneBoundaries[sceneIndex] ?? 0)}
          onPrevScene={prevScene}
          onNextScene={nextScene}
          sceneName={sceneNames[sceneIndex]}
          onRenameScene={(name) => renameScene(sceneIndex, name)}
          onCreateScene={createNewScene}
          onDeleteScene={() => deleteScene()}
          isPlaying={isPlaying}
          onSelectKeyframe={selectKeyframe}
          onAddKeyframe={addKeyframe}
          onDeleteKeyframe={deleteKeyframe}
          onRenameKeyframe={renameKeyframe}
          onPlay={startPlayback}
          onStop={stopPlayback}
          onPrev={goToPrevKeyframe}
          onNext={goToNextKeyframe}
          onUpdateCharVisible={handleUpdateCharVisible}
          keyframeSpeed={keyframeSpeed}
          onKeyframeSpeedChange={setKeyframeSpeed}
          fadeSpeed={fadeSpeed}
          onFadeSpeedChange={setFadeSpeed}
          />
        </div>
        <div className="inline-block relative" style={{ width: '100%', maxWidth: canvasSize.width + 'px', marginBottom: 24 }}>
          <StageCanvas
            canvasRef={canvasRef}
            canvasSize={canvasSize}
            onClick={handleCanvasClick}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
          />
          <div className="absolute left-full ml-2 z-40" style={{ top: 40 }}>
            <div className="text-sm text-muted-foreground">Offstage</div>
            <div className="mt-2 flex flex-col gap-2 max-w-xs">
              {(keyframes[activeKeyframeIndex]?.characters ?? []).filter(c => c.visible === false).map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData('text/plain', c.id)
                    ev.dataTransfer.effectAllowed = 'move'
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1 bg-transparent cursor-grab"
                  style={{ userSelect: 'none' }}
                >
                  <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
                    {(() => {
                      const s = c.size ?? defaultPersonSize
                      const shoulderRx = 9 * s
                      const shoulderRy = 5 * s
                      const headRx = 6 * s
                      const headRy = 5 * s
                      return (
                        <g>
                          <ellipse cx="18" cy="24" rx={shoulderRx} ry={shoulderRy} fill={c.shoulderColor || '#ff6b6b'} />
                          <ellipse cx="18" cy="18" rx={headRx} ry={headRy} fill={c.color || '#ffd93d'} stroke="#ccc" strokeWidth="1" />
                        </g>
                      )
                    })()}
                  </svg>
                  <div className="text-sm text-foreground">{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <ToastContainer toast={toast} />
      </div>
    </div>
  )
}
