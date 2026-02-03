import React, { useRef, useEffect, useState } from 'react'

type Character = {
  id: string
  x: number
  y: number
  angle?: number // radians, 0 = right
}

type Guide = {
  id: string
  orientation: 'v' | 'h'
  pos: number // x for v, y for h
  start: number // start coordinate (perpendicular)
  end: number // end coordinate (perpendicular)
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [addMode, setAddMode] = useState(false)
  const [counter, setCounter] = useState(0)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)

  const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 900 })
  const [guides, setGuides] = useState<Guide[]>([])

  const dragRef = useRef<{
    type: 'move' | 'handle' | 'char-move' | 'char-rotate' | null
    guideId?: string
    handle?: 'start' | 'end'
    offset?: number
    // for char dragging
    charId?: string
    charOffsetX?: number
    charOffsetY?: number
  }>({ type: null })

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
  }, [characters, guides, canvasSize])

  function handleCanvasClick(e: React.MouseEvent) {
    if (!addMode) return
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left)
    const y = Math.round(e.clientY - rect.top)
    const id = String.fromCharCode(65 + (counter % 26))
    setCounter((c) => c + 1)
    // default facing angle unchanged (user can set facing after selecting)
    setCharacters((prev) => [...prev, { id, x, y, angle: 0 }])
  }

  // mouse handling for guides
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current.type) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

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
      dragRef.current = { type: null }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // allow pressing Escape to cancel add mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAddMode(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function pointerToCanvas(e: React.MouseEvent | MouseEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e instanceof MouseEvent ? (e.clientX - rect.left) : (e.clientX - rect.left), y: e instanceof MouseEvent ? (e.clientY - rect.top) : (e.clientY - rect.top) }
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // if we're in add mode, don't select — adding handled by click handler
    if (addMode) return

    // check if clicking on a character -> select (only when not in add mode)
    for (const char of characters) {
      const d = Math.hypot(mx - char.x, my - char.y)
      if (d <= 20) {
        setSelectedCharId(char.id)
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
    // Hover-facing removed; keep handler minimal so other interactions still work.
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

    // draw guides first
    drawGuides(ctx)

    characters.forEach((char) => {
      const angle = char.angle ?? 0
      // shoulders: draw slightly offset bottom-right to simulate view-from-above-right
      ctx.save()
      // offset shoulders a bit toward bottom-right of the head to indicate camera angle
      const shoulderOffsetX = 6
      const shoulderOffsetY = 6
      ctx.translate(char.x + shoulderOffsetX, char.y + shoulderOffsetY)
      // flatten shoulders ellipse to look like a top-down/angled view
      ctx.beginPath()
      ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#c0392b'
      ctx.fill()
      ctx.restore()

      // head (slightly flattened ellipse to suggest perspective) — keep centered
      ctx.save()
      ctx.translate(char.x, char.y)
      ctx.beginPath()
      ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#f1c40f'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#b08a05'
      ctx.stroke()
      ctx.restore()

      // small facing indicator on head (shows where the person faces)
      ctx.save()
      ctx.translate(char.x, char.y)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(10, 0)
      ctx.lineTo(16, -4)
      ctx.lineTo(16, 4)
      ctx.closePath()
      ctx.fillStyle = '#7f8c8d'
      ctx.fill()
      ctx.restore()

      // label
      ctx.fillStyle = '#000'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(char.id, char.x, char.y + 16)

      // selection outline
      if (selectedCharId === char.id) {
        ctx.beginPath()
        ctx.arc(char.x, char.y, 16, 0, Math.PI * 2)
        ctx.strokeStyle = '#2c3e50'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
  }

  return (
    <div className="app">
      <header className="toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className={addMode ? 'active' : ''} onClick={() => setAddMode((s) => !s)}>
          Add Char
        </button>
        <div style={{ fontSize: 14 }}>Click a character to select.</div>
        <label style={{ fontSize: 14 }}>
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
            style={{ width: 80, marginLeft: 6 }}
          />
        </label>
        <label style={{ fontSize: 14 }}>
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
            style={{ width: 80, marginLeft: 6 }}
          />
        </label>
      </header>
      <main>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="stage"
          onClick={handleCanvasClick}
          onMouseDown={onCanvasMouseDown}
        />
      </main>
    </div>
  )
}
