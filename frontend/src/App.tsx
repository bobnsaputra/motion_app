import React, { useRef, useEffect, useState } from 'react'
import Login from './components/Login'

type Character = {
  id: string
  name: string
  x: number
  y: number
  angle?: number // radians, 0 = right
  eyeOffset?: number // radians relative to `angle` for pupil direction
  size?: number // scale multiplier for head/shoulder/icon
  color?: string // hex color for head
  shoulderColor?: string // hex color for shoulders
}

type Guide = {
  id: string
  orientation: 'v' | 'h'
  pos: number // x for v, y for h
  start: number // start coordinate (perpendicular)
  end: number // end coordinate (perpendicular)
}

type User = {
  id: number
  username: string
  email: string
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  // Check for existing authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (err) {
        console.error('Failed to parse saved user')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setIsAuthChecking(false)
  }, [])

  // Show login page if not authenticated
  if (isAuthChecking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a0f',
        color: '#fff'
      }}>
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />
  }

  // Main stage blocking app below
  return <StageBlockingApp user={user} onLogout={() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }} />
}

function StageBlockingApp({ user, onLogout }: { user: User, onLogout: () => void }) {
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

  const dragRef = useRef<{
    type: 'move' | 'handle' | 'char-move' | 'char-rotate' | null
    guideId?: string
    handle?: 'start' | 'end'
    offset?: number
    // for char dragging
    charId?: string
    charOffsetX?: number
    charOffsetY?: number
    // track if mouse moved during drag
    hasMoved?: boolean
  }>({ type: null })
  const skipNextClickRef = useRef(false)

  // initialize guides on mount or when canvas size changes
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
      // if guides already exist, preserve custom positions where reasonable
      if (prev.length === 0) return newGuides
      return newGuides
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.width, canvasSize.height])

  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters, guides, canvasSize, selectedCharId, awaitingDirectionFor])

  function handleCanvasClick(e: React.MouseEvent) {
    // if the previous mousedown just activated direction-mode, skip this click
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false
      return
    }
    // if we're awaiting a direction click for a character, handle that first
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
        // if clicked roughly opposite, rotate body to face that direction (snapped) and reset eye offset
        if (Math.abs(Math.abs(rel) - Math.PI) < Math.PI / 4) {
          const snapped = snapToRightAngles(angleToClick)
          const updated = characters.map((c) => (c.id === target.id ? { ...c, angle: snapped, eyeOffset: 0 } : c))
          setCharacters(updated)
          saveToHistory(updated)
        } else {
          // otherwise set only the eye offset (the eyes/gaze line turns), do not rotate body
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
    // default facing downwards (stage at top in eagle view)
    const updated = [...characters, { id, name: id, x, y, angle: Math.PI / 2, eyeOffset: 0, size: defaultPersonSize, color: defaultPersonColor, shoulderColor: defaultShoulderColor }]
    setCharacters(updated)
    saveToHistory(updated)
  }

  // mouse handling for guides and character dragging
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current.type) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      // handle character dragging
      if (dragRef.current.type === 'char-move') {
        dragRef.current.hasMoved = true

        // Get current character being dragged
        const currentChar = characters.find(c => c.id === dragRef.current.charId)
        if (!currentChar) return

        const snapThreshold = 8
        const radius = (currentChar.size ?? defaultPersonSize) * 20

        let snappedX = mx
        let snappedY = my
        const guides: { x?: number; y?: number }[] = []

        // Check alignment with canvas center
        if (Math.abs(mx - canvasSize.width / 2) < snapThreshold) {
          snappedX = canvasSize.width / 2
          guides.push({ x: canvasSize.width / 2 })
        }
        if (Math.abs(my - canvasSize.height / 2) < snapThreshold) {
          snappedY = canvasSize.height / 2
          guides.push({ y: canvasSize.height / 2 })
        }

        // Check alignment with other characters
        characters.forEach(other => {
          if (other.id === dragRef.current.charId) return

          const otherRadius = (other.size ?? defaultPersonSize) * 20

          // Center to center
          if (Math.abs(mx - other.x) < snapThreshold) {
            snappedX = other.x
            guides.push({ x: other.x })
          }
          if (Math.abs(my - other.y) < snapThreshold) {
            snappedY = other.y
            guides.push({ y: other.y })
          }

          // Edge to edge (left/right)
          if (Math.abs((mx - radius) - (other.x - otherRadius)) < snapThreshold) {
            snappedX = other.x - otherRadius + radius
            guides.push({ x: other.x - otherRadius })
          }
          if (Math.abs((mx + radius) - (other.x + otherRadius)) < snapThreshold) {
            snappedX = other.x + otherRadius - radius
            guides.push({ x: other.x + otherRadius })
          }

          // Edge to edge (top/bottom)
          if (Math.abs((my - radius) - (other.y - otherRadius)) < snapThreshold) {
            snappedY = other.y - otherRadius + radius
            guides.push({ y: other.y - otherRadius })
          }
          if (Math.abs((my + radius) - (other.y + otherRadius)) < snapThreshold) {
            snappedY = other.y + otherRadius - radius
            guides.push({ y: other.y + otherRadius })
          }

          // Center to edge
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

          // Edge to center
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
      // Clear alignment guides immediately
      if (dragRef.current.type === 'char-move') {
        setAlignmentGuides([])
      }

      // if we were about to drag a character but didn't move, it was a click → enter direction mode
      if (dragRef.current.type === 'char-move' && !dragRef.current.hasMoved) {
        const charId = dragRef.current.charId
        if (charId) {
          setAwaitingDirectionFor(charId)
          skipNextClickRef.current = true
        }
      }
      // save to history if we were dragging a character and actually moved it
      if (dragRef.current.type === 'char-move' && dragRef.current.hasMoved) {
        saveToHistory(characters)
        // Clear selection after dragging (not clicking)
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

  // allow pressing Escape to cancel add mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAddMode(false)
        setAwaitingDirectionFor(null)
        setFileMenuOpen(false)
        setConfigMenuOpen(false)
      }
      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Shift+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [historyIndex, history])

  function pointerToCanvas(e: React.MouseEvent | MouseEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e instanceof MouseEvent ? (e.clientX - rect.left) : (e.clientX - rect.left), y: e instanceof MouseEvent ? (e.clientY - rect.top) : (e.clientY - rect.top) }
  }

  function snapToRightAngles(a: number) {
    // snap to nearest 90° (pi/2) increment
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

  function onCanvasMouseDown(e: React.MouseEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // close file menu if open
    setFileMenuOpen(false)
    setConfigMenuOpen(false)

    // if we're in add mode, don't select — adding handled by click handler
    if (addMode) return

    // check if clicking on a character (head or shoulder)
    for (const char of characters) {
      const size = char.size ?? 1
      const angle = char.angle ?? 0

      // check head
      const d = Math.hypot(mx - char.x, my - char.y)
      if (d <= 12 * size) {
        setSelectedCharId(char.id)
        dragRef.current = { type: 'char-move', charId: char.id, hasMoved: false }
        return
      }

      // check shoulders
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

    // clicked empty area -> deselect
    setSelectedCharId(null)

    // check handles first
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
        // line proximity
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
    // If we're in direction-setting mode for a character, rotate only the gaze line (eyeOffset) to follow the cursor
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
          // if cursor is roughly opposite the current body facing, preview a body flip immediately
          const opposite = Math.abs(Math.abs(rel) - Math.PI) < Math.PI / 4
          if (opposite) {
            // preview flip: snap preview angle to right angles
            const snappedPreview = snapToRightAngles(angleToCursor)
            return { ...c, angle: snappedPreview, eyeOffset: 0 }
          }
          return { ...c, eyeOffset: rel }
        })
      )
      return
    }

    // otherwise keep previous behavior
    if (dragRef.current.type) return
    if (addMode) return
  }

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
        // handles
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
    // ensure canvas size matches state
    if (canvas.width !== canvasSize.width) canvas.width = canvasSize.width
    if (canvas.height !== canvasSize.height) canvas.height = canvasSize.height

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // draw STAGE label at top
    ctx.save()
    ctx.font = '28px sans-serif'
    ctx.letterSpacing = '10px'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#000'
    ctx.fillText('S T A G E', canvas.width / 2, 40)
    ctx.restore()

    // draw guides first
    drawGuides(ctx)

    // draw alignment guides
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
      // shoulders: compute and draw (may be drawn before or after head depending on gaze)
      const shoulderDist = 8 * size
      const shoulderX = char.x - Math.cos(angle) * shoulderDist
      const shoulderY = char.y - Math.sin(angle) * shoulderDist

      // decide if shoulders should be drawn under or over head based on body angle
      const eyeOffsetAngle = (char.eyeOffset ?? 0) + angle
      // shoulders are always behind when facing up or down
      const shouldersUnder = Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle))

      // draw shoulders under head if needed
      if (shouldersUnder) {
        ctx.save()
        ctx.translate(shoulderX, shoulderY)
        ctx.beginPath()
        ctx.ellipse(0, 0, 18 * size, 10 * size, 0, 0, Math.PI * 2)
        ctx.fillStyle = char.shoulderColor || '#c0392b'
        ctx.fill()
        ctx.restore()
      }

      // head (not rotated) — keep centered and scaled by `size`
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

      // draw a straight directional line from the front edge of the head
      ctx.save()
      ctx.translate(char.x, char.y)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      // start the line just outside the head ellipse so it appears in front
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

      // label inside head
      ctx.fillStyle = '#000'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(char.name, char.x, char.y)

      // selection outline
      if (selectedCharId === char.id && !(dragRef.current.type === 'char-move' && dragRef.current.hasMoved)) {
        ctx.beginPath()
        ctx.arc(char.x, char.y, 16 * size, 0, Math.PI * 2)
        ctx.strokeStyle = '#2c3e50'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // draw shoulders over head if needed
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

  function saveToLocalStorage() {
    const state = { characters, guides, canvasSize, counter, defaultPersonSize, defaultPersonColor, defaultShoulderColor }
    localStorage.setItem('stageLayout', JSON.stringify(state))
    alert('Layout saved!')
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
      alert('Layout loaded!')
    } else {
      alert('No saved layout found')
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
            alert('Layout imported!')
          } catch (err) {
            alert('Failed to import layout')
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

  return (
    <div className="app">
      <header className="toolbar" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, justifyContent: 'flex-end' }}>
          <button className={addMode ? 'active' : ''} onClick={() => setAddMode((s) => !s)}>
            Add Char
          </button>
          <div style={{ fontSize: 12, color: '#666', visibility: addMode ? 'visible' : 'hidden', height: '16px' }}>
            Press Esc to cancel
          </div>
        </div>
        {selectedCharId && (
          <button
            onClick={() => {
              const updated = characters.filter((c) => c.id !== selectedCharId)
              setCharacters(updated)
              saveToHistory(updated)
              setSelectedCharId(null)
              setAwaitingDirectionFor(null)
            }}
          >
            Delete
          </button>
        )}
        {selectedCharId && (
          <button
            onClick={() => {
              const char = characters.find((c) => c.id === selectedCharId)
              if (char) {
                const id = String.fromCharCode(65 + (counter % 26))
                setCounter((c) => c + 1)
                const duplicate = {
                  ...char,
                  id,
                  name: id,
                  x: char.x + 30,
                  y: char.y + 30
                }
                const updated = [...characters, duplicate]
                setCharacters(updated)
                saveToHistory(updated)
                setSelectedCharId(duplicate.id)
              }
            }}
          >
            Duplicate
          </button>
        )}
        <button onClick={() => {
          setCharacters([])
          saveToHistory([])
          setSelectedCharId(null)
          setAwaitingDirectionFor(null)
          setCounter(0)
        }}>
          Clear All
        </button>
        <button disabled={historyIndex === 0} onClick={undo} title="Undo (Ctrl+Z)">
          ↶
        </button>
        <button disabled={historyIndex >= history.length - 1} onClick={redo} title="Redo (Ctrl+Y)">
          ↷
        </button>
        {selectedCharId && (
          <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            Name:
            <input
              type="text"
              maxLength={3}
              value={characters.find((c) => c.id === selectedCharId)?.name ?? ''}
              onChange={(e) => {
                const newName = e.target.value
                const updated = characters.map((c) => (c.id === selectedCharId ? { ...c, name: newName } : c))
                setCharacters(updated)
                saveToHistory(updated)
              }}
              style={{ width: 60, marginLeft: 6 }}
            />
          </label>
        )}
        <div style={{ fontSize: 14 }}>Click a character to select.</div>
        {awaitingDirectionFor ? (
          <div style={{ fontSize: 14 }}>Click on the stage to set gaze direction for {characters.find((c) => c.id === awaitingDirectionFor)?.name ?? awaitingDirectionFor}.</div>
        ) : selectedCharId ? (
          <div style={{ fontSize: 14 }}>Character {characters.find((c) => c.id === selectedCharId)?.name ?? selectedCharId} selected — click head to set direction.</div>
        ) : null}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setConfigMenuOpen(!configMenuOpen)}
              style={{ fontSize: 20, padding: '4px 12px' }}
              title="Configuration"
            >
              ⚙️
            </button>
            {configMenuOpen && (
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
                      setCanvasSize((s) => ({ ...s, width: v }))
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
                      setCanvasSize((s) => ({ ...s, height: v }))
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
                    value={
                      selectedCharId ? (characters.find((c) => c.id === selectedCharId)?.size ?? defaultPersonSize) : defaultPersonSize
                    }
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(3, Number(e.target.value) || 1))
                      if (selectedCharId) {
                        const updated = characters.map((c) => (c.id === selectedCharId ? { ...c, size: v } : c))
                        setCharacters(updated)
                        saveToHistory(updated)
                      } else {
                        setDefaultPersonSize(v)
                      }
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </label>
                <label style={{ fontSize: 14, display: 'block', marginTop: 8 }}>
                  Person color:
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {[
                      { head: '#f1c40f', shoulder: '#c0392b' }, // Yellow + Red (warm combo)
                      { head: '#3498db', shoulder: '#e67e22' }, // Blue + Orange (complementary)
                      { head: '#2ecc71', shoulder: '#e91e63' }, // Green + Pink (complementary)
                      { head: '#9b59b6', shoulder: '#f9e79f' }, // Purple + Light yellow (complementary)
                      { head: '#1abc9c', shoulder: '#d35400' }, // Teal + Dark orange (contrast)
                      { head: '#e74c3c', shoulder: '#16a085' }, // Red + Teal (complementary)
                      { head: '#2c3e50', shoulder: '#ecf0f1' }, // Navy + Cream (classic)
                      { head: '#95a5a6', shoulder: '#2c3e50' }  // Gray + Dark blue (neutral)
                    ].map((colorPair) => {
                      const currentColor = selectedCharId ? (characters.find((c) => c.id === selectedCharId)?.color ?? defaultPersonColor) : defaultPersonColor
                      return (
                        <svg
                          key={colorPair.head}
                          width="36"
                          height="36"
                          viewBox="0 0 36 36"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (selectedCharId) {
                              const updated = characters.map((c) => (c.id === selectedCharId ? { ...c, color: colorPair.head, shoulderColor: colorPair.shoulder } : c))
                              setCharacters(updated)
                              saveToHistory(updated)
                            } else {
                              setDefaultPersonColor(colorPair.head)
                              setDefaultShoulderColor(colorPair.shoulder)
                            }
                          }}
                          style={{
                            cursor: 'pointer',
                            border: currentColor === colorPair.head ? '3px solid #000' : '1px solid #ccc',
                            borderRadius: 4,
                            backgroundColor: '#fff'
                          }}
                        >
                          {/* Shoulders */}
                          <ellipse cx="18" cy="24" rx="9" ry="5" fill={colorPair.shoulder} />
                          {/* Head */}
                          <ellipse cx="18" cy="18" rx="6" ry="5" fill={colorPair.head} stroke="#b08a05" strokeWidth="1" />
                          {/* Direction line */}
                          <line x1="18" y1="13" x2="18" y2="7" stroke="#000" strokeWidth="1" />
                        </svg>
                      )
                    })}
                  </div>
                  {/* Custom color pickers */}
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, fontSize: 12 }}>
                    <label style={{ flex: 1 }}>
                      Head:
                      <input
                        type="color"
                        value={
                          selectedCharId ? (characters.find((c) => c.id === selectedCharId)?.color ?? defaultPersonColor) : defaultPersonColor
                        }
                        onChange={(e) => {
                          const newColor = e.target.value
                          if (selectedCharId) {
                            const updated = characters.map((c) => (c.id === selectedCharId ? { ...c, color: newColor } : c))
                            setCharacters(updated)
                            saveToHistory(updated)
                          } else {
                            setDefaultPersonColor(newColor)
                          }
                        }}
                        style={{ width: '100%', marginTop: 4, height: 28, cursor: 'pointer' }}
                      />
                    </label>
                    <label style={{ flex: 1 }}>
                      Shoulder:
                      <input
                        type="color"
                        value={
                          selectedCharId ? (characters.find((c) => c.id === selectedCharId)?.shoulderColor ?? defaultShoulderColor) : defaultShoulderColor
                        }
                        onChange={(e) => {
                          const newColor = e.target.value
                          if (selectedCharId) {
                            const updated = characters.map((c) => (c.id === selectedCharId ? { ...c, shoulderColor: newColor } : c))
                            setCharacters(updated)
                            saveToHistory(updated)
                          } else {
                            setDefaultShoulderColor(newColor)
                          }
                        }}
                        style={{ width: '100%', marginTop: 4, height: 28, cursor: 'pointer' }}
                      />
                    </label>
                  </div>
                </label>
              </div>
            )}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#666' }}>
              Welcome, <strong>{user.username}</strong>
            </span>
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
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setFileMenuOpen(!fileMenuOpen)}
              style={{ fontSize: 20, padding: '4px 12px' }}
              title="File operations"
            >
              💾
            </button>
            {fileMenuOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: 4,
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 150,
                zIndex: 1000
              }}>
                <button onClick={() => { saveToLocalStorage(); setFileMenuOpen(false) }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>Save</button>
                <button onClick={() => { loadFromLocalStorage(); setFileMenuOpen(false) }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>Load</button>
                <button onClick={() => { exportAsJSON(); setFileMenuOpen(false) }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>Export JSON</button>
                <button onClick={() => { importFromJSON(); setFileMenuOpen(false) }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>Import JSON</button>
                <button onClick={() => { exportAsImage(); setFileMenuOpen(false) }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>Export PNG</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main style={{ marginTop: 24 }}>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="stage"
          onClick={handleCanvasClick}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
        />
      </main>
    </div>
  )
}
