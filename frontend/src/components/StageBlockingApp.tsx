import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Character, Guide, User } from '../types'
import Toolbar from './Toolbar'
import StageCanvas from './StageCanvas'
import ToastContainer, { ToastType } from './Toast'

interface StageBlockingAppProps {
  user: User
  onLogout: () => void
}

export default function StageBlockingApp({ user, onLogout }: StageBlockingAppProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [addMode, setAddMode] = useState(false)
  const [counter, setCounter] = useState(0)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [awaitingDirectionFor, setAwaitingDirectionFor] = useState<string | null>(null)

  const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 900 })
  const [guides, setGuides] = useState<Guide[]>([])
  const [defaultPersonSize, setDefaultPersonSize] = useState(2)
  const [defaultPersonColor, setDefaultPersonColor] = useState('#f1c40f')
  const [defaultShoulderColor, setDefaultShoulderColor] = useState('#c0392b')
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [configMenuOpen, setConfigMenuOpen] = useState(false)
  const [alignmentGuides, setAlignmentGuides] = useState<{ x?: number; y?: number }[]>([])

  const [history, setHistory] = useState<Character[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [toast, setToast] = useState<{ message: string; type: ToastType; key: number } | null>(null)
  const toastKey = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, key: ++toastKey.current })
  }, [])

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
  }, [characters, guides, canvasSize, selectedCharId, awaitingDirectionFor])

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
        if (charId) {
          setAwaitingDirectionFor(charId)
          skipNextClickRef.current = true
        }
      }
      if (dragRef.current.type === 'char-move' && dragRef.current.hasMoved) {
        saveToHistory(characters)
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
  }, [characters])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAddMode(false)
        setAwaitingDirectionFor(null)
        setFileMenuOpen(false)
        setConfigMenuOpen(false)
      }
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
  }, [historyIndex, history])

  // ── Utility functions ──
  function snapToRightAngles(a: number) {
    const step = Math.PI / 2
    return Math.round(a / step) * step
  }

  function saveToHistory(newCharacters: Character[]) {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(newCharacters)))
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  function undo() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setCharacters(JSON.parse(JSON.stringify(history[newIndex])))
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setCharacters(JSON.parse(JSON.stringify(history[newIndex])))
    }
  }

  // ── Canvas event handlers ──
  function handleCanvasClick(e: React.MouseEvent) {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false
      return
    }
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

    for (const char of characters) {
      const size = char.size ?? 1
      const angle = char.angle ?? 0

      const d = Math.hypot(mx - char.x, my - char.y)
      if (d <= 12 * size) {
        setSelectedCharId(char.id)
        dragRef.current = { type: 'char-move', charId: char.id, hasMoved: false }
        return
      }

      const shoulderDist = 8 * size
      const shoulderX = char.x - Math.cos(angle) * shoulderDist
      const shoulderY = char.y - Math.sin(angle) * shoulderDist
      const shoulderD = Math.hypot(mx - shoulderX, my - shoulderY)
      if (shoulderD <= 18 * size) {
        setSelectedCharId(char.id)
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
    ctx.font = '28px sans-serif'
    ctx.letterSpacing = '10px'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#000'
    ctx.fillText('S T A G E', canvas.width / 2, 40)
    ctx.restore()

    drawGuides(ctx)

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
        ctx.fillStyle = char.shoulderColor || '#c0392b'
        ctx.fill()
        ctx.restore()
      }

      ctx.save()
      ctx.translate(char.x, char.y)
      ctx.beginPath()
      ctx.ellipse(0, 0, 12 * size, 10 * size, 0, 0, Math.PI * 2)
      ctx.fillStyle = char.color || '#f1c40f'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#b08a05'
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
      const lineLen = 12 * size
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
        ctx.fillStyle = char.shoulderColor || '#c0392b'
        ctx.fill()
        ctx.restore()
      }
    })
  }

  // ── File operations ──
  function saveToLocalStorage() {
    const state = { characters, guides, canvasSize, counter, defaultPersonSize, defaultPersonColor, defaultShoulderColor }
    localStorage.setItem('stageLayout', JSON.stringify(state))
    showToast('Layout saved')
  }

  function loadFromLocalStorage() {
    const saved = localStorage.getItem('stageLayout')
    if (saved) {
      const state = JSON.parse(saved)
      setCharacters(state.characters || [])
      setGuides(state.guides || [])
      setCanvasSize(state.canvasSize || { width: 1600, height: 900 })
      setCounter(state.counter || 0)
      setDefaultPersonSize(state.defaultPersonSize || 1)
      setDefaultPersonColor(state.defaultPersonColor || '#f1c40f')
      setDefaultShoulderColor(state.defaultShoulderColor || '#c0392b')
      setSelectedCharId(null)
      setAwaitingDirectionFor(null)
      showToast('Layout loaded')
    } else {
      showToast('No saved layout found', 'error')
    }
  }

  function exportAsJSON() {
    const state = { characters, guides, canvasSize, counter, defaultPersonSize, defaultPersonColor, defaultShoulderColor }
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
            setDefaultPersonColor(state.defaultPersonColor || '#f1c40f')
            setDefaultShoulderColor(state.defaultShoulderColor || '#c0392b')
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

  function handleClearAll() {
    setCharacters([])
    saveToHistory([])
    setSelectedCharId(null)
    setAwaitingDirectionFor(null)
    setCounter(0)
  }

  function handleNameChange(newName: string) {
    const updated = characters.map((c) => (c.id === selectedCharId ? { ...c, name: newName } : c))
    setCharacters(updated)
    saveToHistory(updated)
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

  return (
    <div className="app">
      <Toolbar
        addMode={addMode}
        setAddMode={setAddMode}
        selectedCharId={selectedCharId}
        characters={characters}
        awaitingDirectionFor={awaitingDirectionFor}
        onDeleteSelected={handleDeleteSelected}
        onDuplicateSelected={handleDuplicateSelected}
        onClearAll={handleClearAll}
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
        fileMenuOpen={fileMenuOpen}
        setFileMenuOpen={setFileMenuOpen}
        onSave={saveToLocalStorage}
        onLoad={loadFromLocalStorage}
        onExportJSON={exportAsJSON}
        onImportJSON={importFromJSON}
        onExportPNG={exportAsImage}
      />
      <StageCanvas
        canvasRef={canvasRef}
        canvasSize={canvasSize}
        onClick={handleCanvasClick}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
      />
      <ToastContainer toast={toast} />
    </div>
  )
}
