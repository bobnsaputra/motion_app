import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Character, Guide, User, Keyframe, TextAnnotation, StageProp } from '../types'
import Toolbar from './Toolbar'
import Sidebar from './Sidebar'
import StageCanvas from './StageCanvas'
import ToastContainer, { ToastType } from './Toast'
import ProjectListModal from './ProjectListModal'
import ShareProjectModal from './ShareProjectModal'
import UpgradeModal from './UpgradeModal'
import { createProject, updateProject, loadProject } from '../lib/projects'
import { getMyPermission } from '../lib/sharing'
import { getSubscriptionInfo, recordUsage, type SubscriptionInfo } from '../lib/subscription'

interface StageBlockingAppProps {
  user: User
  onLogout: () => void
}

const PASTEL_PAIRS = [
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
  const [personSize, setPersonSize] = useState({ headW: 40, headH: 34, shoulderW: 72, shoulderH: 40 })
  const [defaultPersonColor, setDefaultPersonColor] = useState(PASTEL_PAIRS[0].head)
  const [defaultShoulderColor, setDefaultShoulderColor] = useState(PASTEL_PAIRS[0].shoulder)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [configMenuOpen, setConfigMenuOpen] = useState(false)
  const [lockStageSize, setLockStageSize] = useState(true)
  const [lockKeyframeTiming, setLockKeyframeTiming] = useState(false)
  const [stageReversed, setStageReversed] = useState(false)
  const [labelFontSize, setLabelFontSize] = useState(14)
  const [noteFontSize, setNoteFontSize] = useState(14)
  const [showWings, setShowWings] = useState(false)
  const [wingSize, setWingSize] = useState({ width: Math.round(canvasSize.width / 8), height: canvasSize.height })
  const [lockWingSize, setLockWingSize] = useState(true)
  const wingOffset = showWings ? Math.min(wingSize.width, 500) : 0
  const totalCanvasWidth = canvasSize.width + 2 * wingOffset
  const [stageOffset, setStageOffset] = useState({ top: 0, right: 7, bottom: 0, left: 0 })
  const [lockStageOffset, setLockStageOffset] = useState(true)
  const [preventOverlap, setPreventOverlap] = useState(false)
  const preventOverlapRef = useRef(preventOverlap)
  useEffect(() => { preventOverlapRef.current = preventOverlap }, [preventOverlap])
  const [alignmentGuides, setAlignmentGuides] = useState<{ x?: number; y?: number }[]>([])
  const [keyframeSpeed, setKeyframeSpeed] = useState(1200)
  const [fadeSpeed, setFadeSpeed] = useState(1200)

  type HistoryEntry = {
    characters: Character[]
    keyframes?: Keyframe[]
    activeKeyframeIndex?: number
    sceneBoundaries?: number[]
    sceneNames?: string[]
  }
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
  const [projectTitle, setProjectTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('stageProjectTitle') || 'Untitled'
    } catch (e) {
      return 'Untitled'
    }
  })
  const [sceneNotes, setSceneNotes] = useState<Record<number, string>>({})
  const [keyframeNotes, setKeyframeNotes] = useState<Record<string, string>>({})
  const [sceneBoundaries, setSceneBoundaries] = useState<number[]>([0]) // start indices for each scene
  const [isPlaying, setIsPlaying] = useState(false)
  const [animationProgress, setAnimationProgress] = useState<number | null>(null) // 0-1 during playback (movement easing)
  const [fadeProgress, setFadeProgress] = useState<number | null>(null) // 0-1 faster fade for hide/show
  const animFrameRef = useRef<number | null>(null)
  const nextKfId = useRef(1)
  const [offstageOpen, setOffstageOpen] = useState(false)
  const kfsRef = useRef<Keyframe[] | null>(null)
  const animPairRef = useRef(0)

  // ── Note / annotation mode ──
  const [noteMode, setNoteMode] = useState(false)
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const annotationNextId = useRef(1)
  const annotationDragRef = useRef<{
    id: string
    offsetX: number
    offsetY: number
    mode: 'move' | 'resize'
    corner?: 'tl' | 'tr' | 'bl' | 'br'
    startMouseX?: number  // mouse X at drag start
    startMouseY?: number  // mouse Y at drag start
    startX?: number       // annotation x at drag start
    startY?: number       // annotation y at drag start
    startWidth?: number   // annotation width at drag start
    startHeight?: number  // annotation height at drag start
  } | null>(null)

  // ── Props mode ──
  const [propsMode, setPropsMode] = useState(false)
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null)
  const [stageProps, setStageProps] = useState<StageProp[]>([])
  const propNextId = useRef(1)
  const propDragRef = useRef<{
    id: string
    offsetX: number
    offsetY: number
    mode: 'move' | 'resize' | 'rotate'
    corner?: 'tl' | 'tr' | 'bl' | 'br'
    startMouseX?: number
    startMouseY?: number
    startX?: number
    startY?: number
    startWidth?: number
    startHeight?: number
    startAngle?: number    // mouse angle at drag start (radians)
    startRotation?: number // prop rotation at drag start (degrees)
  } | null>(null)

  const PROP_SHAPES: StageProp['shape'][] = ['rect', 'circle', 'triangle']
  const [propShapeIndex, setPropShapeIndex] = useState(0)

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
  const [hoveringVisBtn, setHoveringVisBtn] = useState(false)

  // ── Cloud project state ──
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [isProjectOwner, setIsProjectOwner] = useState(true)
  const [sharePermission, setSharePermission] = useState<'view' | 'edit' | null>(null)
  const canEdit = isProjectOwner || sharePermission === 'edit'
  const [projectListOpen, setProjectListOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [cloudSaving, setCloudSaving] = useState(false)

  // ── Subscription state ──
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<'limit' | 'trial_expired' | 'general' | 'feature' | 'usage_expired'>('general')
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [usageSecondsRemaining, setUsageSecondsRemaining] = useState<number>(86400)
  const [usageExpired, setUsageExpired] = useState(false)

  /** Fetch/refresh subscription info from server */
  const refreshSubscription = useCallback(async () => {
    try {
      const info = await getSubscriptionInfo()
      setSubscriptionInfo(info)
      if (info.usage_limit && info.usage_seconds_used !== undefined) {
        setUsageSecondsRemaining(Math.max(0, info.usage_limit - info.usage_seconds_used))
      }
      if (info.usage_expired && info.status !== 'pro' && !info.has_voucher) {
        setUsageExpired(true)
        setUpgradeReason('usage_expired')
        setTimeout(() => setUpgradeModalOpen(true), 100)
      }
      return info
    } catch (e) {
      console.warn('Failed to fetch subscription info:', e)
      return null
    }
  }, [])

  // Fetch subscription info on mount and handle checkout success redirect
  useEffect(() => { 
    refreshSubscription() 
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => {
        showToast('🎉 Payment Successful! You are now a Pro member.', 'success')
      }, 500)
    }
  }, [refreshSubscription, showToast])

  // ── Usage heartbeat ──
  // Sends a heartbeat every 60s ONLY when the browser tab is visible and user is free
  useEffect(() => {
    // Pro users and voucher holders are exempt
    if (subscriptionInfo?.status === 'pro' || subscriptionInfo?.has_voucher) return
    if (usageExpired) return

    let intervalId: ReturnType<typeof setInterval> | null = null

    const tick = async () => {
      // Only tick when the tab is visible
      if (document.visibilityState !== 'visible') return
      try {
        const result = await recordUsage(60)
        const remaining = Math.max(0, result.usage_limit - result.usage_seconds_used)
        setUsageSecondsRemaining(remaining)
        if (result.usage_expired) {
          setUsageExpired(true)
          setUpgradeReason('usage_expired')
          setUpgradeModalOpen(true)
        }
      } catch (e) {
        // silently ignore heartbeat errors
      }
    }

    // Also decrement the local counter every second for smooth UI updates
    const localTickId = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setUsageSecondsRemaining(prev => Math.max(0, prev - 1))
    }, 1000)

    // Server heartbeat every 60 seconds
    intervalId = setInterval(tick, 60000)

    // Send an initial heartbeat after 5s to get accurate server state
    const initialTimeout = setTimeout(tick, 5000)

    return () => {
      if (intervalId) clearInterval(intervalId)
      clearInterval(localTickId)
      clearTimeout(initialTimeout)
    }
  }, [subscriptionInfo?.status, subscriptionInfo?.has_voucher, usageExpired])

  // Refs to always get latest versions of file operations (avoids stale closures in keyboard handler)
  const fileOpsRef = useRef({ saveToLocalStorage: () => {}, loadFromLocalStorage: () => {}, exportAsJSON: () => {}, importFromJSON: () => {} })

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
  }, [characters, guides, canvasSize, selectedCharId, awaitingDirectionFor, keyframeMode, activeKeyframeIndex, keyframes, animationProgress, stageReversed, labelFontSize, noteMode, selectedAnnotationId, editingAnnotationId, showWings, wingSize, personSize, preventOverlap, propsMode, selectedPropId, stageProps, hoveringVisBtn])

  // Turn off note mode when exiting keyframe mode
  useEffect(() => {
    if (!keyframeMode) {
      // commitEditingAnnotation has already been called by the mode toggle that set keyframeMode=false
      setNoteMode(false)
      setSelectedAnnotationId(null)
      setEditingAnnotationId(null)
      // Don't clear propsMode here — mutual exclusivity is handled by mode toggle functions
    }
  }, [keyframeMode])

  // Re-initialize annotationNextId whenever keyframes change (covers mount, load, import)
  useEffect(() => {
    let maxId = 0
    for (const kf of keyframes) {
      for (const ann of kf.annotations ?? []) {
        const num = parseInt(ann.id.replace('ann_', ''), 10)
        if (!isNaN(num) && num > maxId) maxId = num
      }
    }
    if (maxId + 1 > annotationNextId.current) {
      annotationNextId.current = maxId + 1
    }
  }, [keyframes])

  // Re-init propNextId whenever stageProps change
  useEffect(() => {
    let maxPropId = 0
    for (const p of stageProps) {
      const num = parseInt(p.id.replace('prop_', ''), 10)
      if (!isNaN(num) && num > maxPropId) maxPropId = num
    }
    if (maxPropId + 1 > propNextId.current) {
      propNextId.current = maxPropId + 1
    }
  }, [stageProps])

  // ── Mouse move / up for dragging ──
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      // ── Prop dragging / resizing ──
      if (propDragRef.current) {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left - wingOffset
        const my = e.clientY - rect.top
        const drag = propDragRef.current
        if (drag.mode === 'rotate' && drag.startAngle != null && drag.startRotation != null) {
          setStageProps(prev => prev.map(p => {
            if (p.id !== drag.id) return p
            const cx = p.x + p.width / 2
            const cy = p.y + p.height / 2
            const currentAngle = Math.atan2(my - cy, mx - cx)
            let deltaAngle = (currentAngle - drag.startAngle!) * 180 / Math.PI
            let newRot = drag.startRotation! + deltaAngle
            // Snap to 0/90/180/270 within 3 degrees
            const snaps = [0, 90, 180, 270, 360, -90, -180, -270]
            for (const s of snaps) {
              if (Math.abs(newRot - s) < 3) { newRot = s; break }
            }
            newRot = ((newRot % 360) + 360) % 360
            return { ...p, rotation: newRot }
          }))
        } else if (drag.mode === 'resize' && drag.corner && drag.startMouseX != null && drag.startMouseY != null && drag.startX != null && drag.startY != null && drag.startWidth != null && drag.startHeight != null) {
          const dx = mx - drag.startMouseX
          const dy = my - drag.startMouseY
          const c = drag.corner
          setStageProps(prev => prev.map(p => {
            if (p.id !== drag.id) return p
            const updates: Partial<StageProp> = {}
            if (c === 'br' || c === 'tr') {
              updates.width = Math.max(10, drag.startWidth! + dx)
            } else {
              const newWidth = Math.max(10, drag.startWidth! - dx)
              updates.x = drag.startX! + drag.startWidth! - newWidth
              updates.width = newWidth
            }
            if (c === 'br' || c === 'bl') {
              updates.height = Math.max(10, drag.startHeight! + dy)
            } else {
              const newHeight = Math.max(10, drag.startHeight! - dy)
              updates.y = drag.startY! + drag.startHeight! - newHeight
              updates.height = newHeight
            }
            return { ...p, ...updates }
          }))
        } else {
          setStageProps(prev => prev.map(p =>
            p.id === drag.id ? { ...p, x: mx - drag.offsetX, y: my - drag.offsetY } : p
          ))
        }
        return
      }
      // ── Annotation dragging / resizing ──
      if (annotationDragRef.current) {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left - wingOffset
        const my = e.clientY - rect.top
        const drag = annotationDragRef.current
        if (drag.mode === 'resize' && drag.corner && drag.startMouseX != null && drag.startMouseY != null && drag.startX != null && drag.startY != null && drag.startWidth != null && drag.startHeight != null) {
          const dx = mx - drag.startMouseX
          const dy = my - drag.startMouseY
          const c = drag.corner
          const updates: Partial<TextAnnotation> = {}
          // Horizontal: right-side corners expand width, left-side move x
          if (c === 'br' || c === 'tr') {
            updates.width = Math.max(60, drag.startWidth + dx)
          } else {
            const newWidth = Math.max(60, drag.startWidth - dx)
            updates.x = drag.startX + drag.startWidth - newWidth
            updates.width = newWidth
          }
          // Vertical: bottom corners expand height, top corners move y
          if (c === 'br' || c === 'bl') {
            updates.height = Math.max(20, drag.startHeight + dy)
          } else {
            const newHeight = Math.max(20, drag.startHeight - dy)
            updates.y = drag.startY + drag.startHeight - newHeight
            updates.height = newHeight
          }
          updateAnnotation(drag.id, updates)
        } else {
          // Move
          updateAnnotation(drag.id, { x: mx - drag.offsetX, y: my - drag.offsetY })
        }
        return
      }

      if (!dragRef.current.type) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left - wingOffset
      const my = e.clientY - rect.top

      if (dragRef.current.type === 'char-move') {
        dragRef.current.hasMoved = true

        const currentChar = characters.find(c => c.id === dragRef.current.charId)
        if (!currentChar) return

        const snapThreshold = 8
        const radius = Math.max(personSize.headW, personSize.headH) / 2 + 4

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
          const otherRadius = Math.max(personSize.headW, personSize.headH) / 2 + 4

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
              const pos = Math.max(0, Math.min(canvasSize.width, mx - (dragRef.current.offset || 0)))
              return { ...g, pos }
            } else {
              const pos = Math.max(0, Math.min(canvasSize.height, my - (dragRef.current.offset || 0)))
              return { ...g, pos }
            }
          } else if (dragRef.current.type === 'handle') {
            const handle = dragRef.current.handle!
            if (g.orientation === 'v') {
              const val = Math.max(0, Math.min(canvasSize.height, handle === 'start' ? my : my))
              if (handle === 'start') return { ...g, start: Math.min(val, g.end) }
              return { ...g, end: Math.max(val, g.start) }
            } else {
              const val = Math.max(0, Math.min(canvasSize.width, handle === 'start' ? mx : mx))
              if (handle === 'start') return { ...g, start: Math.min(val, g.end) }
              return { ...g, end: Math.max(val, g.start) }
            }
          }
          return g
        })
      )
    }

    function onMouseUp() {
      // ── Prop drag release ──
      if (propDragRef.current) {
        propDragRef.current = null
        return
      }
      // ── Annotation drag release ──
      if (annotationDragRef.current) {
        annotationDragRef.current = null
        return
      }

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
        // When preventOverlap is on, push the dropped character away from collisions
        if (preventOverlapRef.current && dragRef.current.charId) {
          const charId = dragRef.current.charId
          const char = characters.find(c => c.id === charId)
          if (char) {
            const resolved = resolveCollisions(char.x, char.y, charId, characters)
            if (resolved.x !== char.x || resolved.y !== char.y) {
              const fixedChars = characters.map(c => c.id === charId ? { ...c, x: resolved.x, y: resolved.y } : c)
              setCharacters(fixedChars)
              if (keyframeMode) {
                const proposedChars = JSON.parse(JSON.stringify(fixedChars)) as Character[]
                const committed = keyframes.map((kf, i) => i === activeKeyframeIndex ? { ...kf, characters: proposedChars } : kf)
                setKeyframes(committed)
                saveToHistory(fixedChars, committed, activeKeyframeIndex)
              } else {
                saveToHistory(fixedChars)
              }
              setSelectedCharId(null)
              dragRef.current = { type: null }
              return
            }
          }
        }
        if (keyframeMode) {
          const proposedChars = JSON.parse(JSON.stringify(characters)) as Character[]
          const committed = keyframes.map((kf, i) => i === activeKeyframeIndex ? { ...kf, characters: proposedChars } : kf)
          setKeyframes(committed)
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
  }, [characters, keyframeMode, wingOffset])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // If editing an annotation, commit text and close editor first
        if (editingAnnotationId) {
          commitEditingAnnotation()
          return
        }
        if (noteMode) {
          setNoteMode(false)
          setSelectedAnnotationId(null)
          return
        }
        if (propsMode) {
          setPropsMode(false)
          setSelectedPropId(null)
          return
        }
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

      // View-only: only allow navigation shortcuts (arrows, space, K, Escape)
      const isViewOnly = !canEdit && !!currentProjectId
      const allowedInViewOnly = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'k', 'K', 'q', 'Q', 'w', 'W', 'e', 'E', 'Escape']
      if (isViewOnly && !allowedInViewOnly.includes(e.key)) return

      // Toggle note mode with 'n'
      if ((e.key === 'n' || e.key === 'N') && keyframeMode) {
        if (noteMode) {
          commitEditingAnnotation()
          setSelectedAnnotationId(null)
        }
        setNoteMode(prev => !prev)
        return
      }
      // Delete selected annotation
      if ((e.key === 'Delete' || e.key === 'Backspace') && noteMode && selectedAnnotationId && !editingAnnotationId) {
        deleteAnnotation(selectedAnnotationId)
        return
      }
      // Delete selected prop
      if ((e.key === 'Delete' || e.key === 'Backspace') && propsMode && selectedPropId) {
        deleteStageProp(selectedPropId)
        return
      }

      if (e.key === 'a' || e.key === 'A') {
        if (!keyframeMode) {
          // Entering add char mode cancels props mode and edit char
          setPropsMode(false)
          setSelectedPropId(null)
          setSelectedCharId(null)
          setAddMode(prev => !prev)
        }
      }
      if ((e.key === 'd' || e.key === 'D') && !keyframeMode) {
        if (selectedCharId) handleDeleteSelected()
      }
      if ((e.key === 'p' || e.key === 'P') && !keyframeMode) {
        if (selectedCharId) {
          handleDuplicateSelected()
        } else {
          // Toggle props mode (exit add char mode if active)
          setAddMode(false)
          setAwaitingDirectionFor(null)
          setPropsMode(prev => !prev)
          setSelectedPropId(null)
        }
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
        fileOpsRef.current.saveToLocalStorage()
      }
      if ((e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        fileOpsRef.current.loadFromLocalStorage()
      }
      if ((e.key === 'm' || e.key === 'M')) {
        e.preventDefault()
        fileOpsRef.current.importFromJSON()
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && keyframeMode) {
        e.preventDefault()
        if (e.key === 'ArrowLeft') goToPrevKeyframe()
        else goToNextKeyframe()
      }
      if ((e.key === 'x' || e.key === 'X')) {
        e.preventDefault()
        fileOpsRef.current.exportAsJSON()
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
      if ((e.key === 'q' || e.key === 'Q') && keyframeMode) {
        e.preventDefault()
        if (isPlaying) { stopPlayback() } else { startPlaybackSingle() }
      }
      if ((e.key === 'w' || e.key === 'W') && keyframeMode) {
        e.preventDefault()
        if (isPlaying) { stopPlayback() } else { startPlayback() }
      }
      if ((e.key === 'e' || e.key === 'E') && keyframeMode) {
        e.preventDefault()
        if (isPlaying) { stopPlayback() } else { startPlaybackAll() }
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
  }, [historyIndex, history, keyframeMode, isPlaying, selectedCharId, characters, propsMode, selectedPropId, canEdit, currentProjectId])

  // ── Utility functions ──
  function snapToRightAngles(a: number) {
    const step = Math.PI / 2
    return Math.round(a / step) * step
  }

  /** Push (x, y) away from all others so no two characters overlap.
   *  Uses shoulder ellipse as the collision boundary (the larger shape). */
  function resolveCollisions(
    x: number,
    y: number,
    selfId: string | null,
    chars: Character[],
  ): { x: number; y: number } {
    const rx = personSize.shoulderW / 2 + 2   // half-width + small gap
    const ry = personSize.shoulderH / 2 + personSize.headH / 2 + 2 // half-height including head + gap
    let cx = x
    let cy = y

    // Iterative push — up to 10 rounds to settle
    for (let iter = 0; iter < 10; iter++) {
      let pushed = false
      for (const other of chars) {
        if (other.id === selfId) continue
        if (other.visible === false) continue
        const dx = cx - other.x
        const dy = cy - other.y
        // Normalise to ellipse space: overlap when (dx/minDistX)^2 + (dy/minDistY)^2 < 1
        const minDistX = rx * 2
        const minDistY = ry * 2
        const normX = dx / minDistX
        const normY = dy / minDistY
        const dist2 = normX * normX + normY * normY
        if (dist2 < 1 && dist2 > 0) {
          // Push out along the normalised direction
          const dist = Math.sqrt(dist2)
          const scale = (1 - dist) / dist
          cx += dx * scale * 0.55
          cy += dy * scale * 0.55
          pushed = true
        } else if (dist2 === 0) {
          // Exactly same position — nudge right
          cx += minDistX
          pushed = true
        }
      }
      if (!pushed) break
    }
    return { x: Math.round(cx), y: Math.round(cy) }
  }

  // Word-wrap helper for annotation text (used by both draw and hit-testing)
  function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
    const canvas = canvasRef.current
    if (!canvas) return [text]
    const ctx = canvas.getContext('2d')!
    ctx.save()
    ctx.font = `${fontSize}px "Inter", sans-serif`
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''
    for (const word of words) {
      const parts = word.split('\n')
      for (let pi = 0; pi < parts.length; pi++) {
        if (pi > 0) { lines.push(currentLine); currentLine = '' }
        const testLine = currentLine ? currentLine + ' ' + parts[pi] : parts[pi]
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = parts[pi]
        } else {
          currentLine = testLine
        }
      }
    }
    if (currentLine) lines.push(currentLine)
    ctx.restore()
    return lines
  }

  // Compute the visual height of an annotation box (text-based or user-set minimum)
  function getAnnotationHeight(ann: TextAnnotation): number {
    const lineHeight = ann.fontSize * 1.3
    const lines = wrapText(ann.text, ann.fontSize, ann.width)
    const textH = Math.max(lineHeight, lines.length * lineHeight)
    return ann.height ? Math.max(ann.height, textH) : textH
  }

  // Hit-test annotation zones: returns { ann, zone } or null
  function hitTestAnnotation(mx: number, my: number, annotations: TextAnnotation[]): { ann: TextAnnotation; zone: 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | 'border' | 'inside' } | null {
    const CORNER = 10 // corner handle hit area (half-size)
    const BORDER = 6  // border hit thickness
    for (const ann of annotations) {
      const totalH = getAnnotationHeight(ann)
      const bx = ann.x - 2, by = ann.y - 2, bw = ann.width + 4, bh = totalH + 4
      // Corner checks (small squares at each corner)
      if (Math.abs(mx - bx) <= CORNER && Math.abs(my - by) <= CORNER) return { ann, zone: 'corner-tl' }
      if (Math.abs(mx - (bx + bw)) <= CORNER && Math.abs(my - by) <= CORNER) return { ann, zone: 'corner-tr' }
      if (Math.abs(mx - bx) <= CORNER && Math.abs(my - (by + bh)) <= CORNER) return { ann, zone: 'corner-bl' }
      if (Math.abs(mx - (bx + bw)) <= CORNER && Math.abs(my - (by + bh)) <= CORNER) return { ann, zone: 'corner-br' }
      // Check if inside the extended box area
      if (mx >= bx - BORDER && mx <= bx + bw + BORDER && my >= by - BORDER && my <= by + bh + BORDER) {
        // Border check: within BORDER px of any edge
        const nearLeft = mx < bx + BORDER
        const nearRight = mx > bx + bw - BORDER
        const nearTop = my < by + BORDER
        const nearBottom = my > by + bh - BORDER
        if (nearLeft || nearRight || nearTop || nearBottom) return { ann, zone: 'border' }
        // Inside
        return { ann, zone: 'inside' }
      }
    }
    return null
  }

  // Update an annotation in the current keyframe
  function updateAnnotation(annId: string, updates: Partial<TextAnnotation>) {
    setKeyframes(prev => prev.map((kf, i) =>
      i === activeKeyframeIndex ? {
        ...kf,
        annotations: (kf.annotations ?? []).map(a => a.id === annId ? { ...a, ...updates } : a)
      } : kf
    ))
  }

  // Delete an annotation from the current keyframe
  function deleteAnnotation(annId: string) {
    setKeyframes(prev => prev.map((kf, i) =>
      i === activeKeyframeIndex ? {
        ...kf,
        annotations: (kf.annotations ?? []).filter(a => a.id !== annId)
      } : kf
    ))
    if (selectedAnnotationId === annId) setSelectedAnnotationId(null)
    if (editingAnnotationId === annId) setEditingAnnotationId(null)
  }

  // Commit or delete the currently-editing annotation (reads from DOM textarea)
  // Call this before any mode transition to avoid losing text.
  function commitEditingAnnotation() {
    if (!editingAnnotationId) return
    // Try to read the latest text from the actual DOM element
    const textarea = document.querySelector('textarea.z-50') as HTMLTextAreaElement | null
    const currentText = textarea ? textarea.value : null
    if (currentText !== null) {
      if (!currentText.trim()) {
        // Empty → remove the annotation
        deleteAnnotation(editingAnnotationId)
      } else {
        updateAnnotation(editingAnnotationId, { text: currentText })
      }
    }
    setEditingAnnotationId(null)
    skipNextClickRef.current = true
  }

  // ── Prop helpers ──
  function getStageProps(): StageProp[] {
    return stageProps
  }

  function updateStageProp(propId: string, updates: Partial<StageProp>) {
    setStageProps(prev => prev.map(p => p.id === propId ? { ...p, ...updates } : p))
  }

  function deleteStageProp(propId: string) {
    setStageProps(prev => prev.filter(p => p.id !== propId))
    if (selectedPropId === propId) setSelectedPropId(null)
  }

  function addStageProp(x: number, y: number) {
    const shape = PROP_SHAPES[propShapeIndex % PROP_SHAPES.length]
    const id = `prop_${propNextId.current++}`
    const newProp: StageProp = {
      id,
      name: `Prop ${propNextId.current - 1}`,
      shape,
      x,
      y,
      width: 60,
      height: 60,
      rotation: 0,
      color: '#ffffff',
      opacity: 1,
      visible: true,
    }
    setStageProps(prev => [...prev, newProp])
    setSelectedPropId(null)
  }

  function hitTestProp(mx: number, my: number, props: StageProp[]): StageProp | null {
    // Check in reverse order (topmost first)
    for (let i = props.length - 1; i >= 0; i--) {
      const p = props[i]
      if (p.visible === false) continue
      if (mx >= p.x && mx <= p.x + p.width && my >= p.y && my <= p.y + p.height) {
        return p
      }
    }
    return null
  }

  function saveToHistory(
    newCharacters: Character[],
    optKeyframes?: Keyframe[],
    optActiveIndex?: number,
    optSceneBoundaries?: number[],
    optSceneNames?: string[]
  ) {
    const newHistory = history.slice(0, historyIndex + 1)
    const entry: HistoryEntry = {
      characters: JSON.parse(JSON.stringify(newCharacters))
    }

    // Use provided scene metadata when available (caller computed it),
    // otherwise fall back to current state values.
    entry.sceneBoundaries = optSceneBoundaries ? JSON.parse(JSON.stringify(optSceneBoundaries)) : JSON.parse(JSON.stringify(sceneBoundaries))
    entry.sceneNames = optSceneNames ? JSON.parse(JSON.stringify(optSceneNames)) : JSON.parse(JSON.stringify(sceneNames))

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

  // Infer scene boundaries from keyframe labels when possible.
  function inferSceneBoundariesFromKeyframes(kfs: Keyframe[]): number[] {
    const boundaries = [0]
    for (let i = 1; i < kfs.length; i++) {
      const prev = kfs[i - 1].label
      const cur = kfs[i].label
      const prevNum = parseInt(String(prev), 10)
      const curNum = parseInt(String(cur), 10)
      // If label resets to 1 (or non-number to 1), treat as new scene start
      if (!isNaN(curNum) && curNum === 1 && !( !isNaN(prevNum) && prevNum === 1)) {
        boundaries.push(i)
      }
    }
    return boundaries
  }



  function undo() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const entry = history[newIndex]
      setHistoryIndex(newIndex)
      setCharacters(JSON.parse(JSON.stringify(entry.characters)))

      // Restore scene metadata
      setSceneBoundaries(entry.sceneBoundaries ?? [0])
      setSceneNames(entry.sceneNames ?? [])

      if (entry.keyframes) {
        const kfs = JSON.parse(JSON.stringify(entry.keyframes))
        setKeyframes(kfs)
        setKeyframeMode(true)
        const idx = Math.min(entry.activeKeyframeIndex ?? 0, kfs.length - 1)
        setActiveKeyframeIndex(idx)

        // Set sceneIndex to the scene that contains the active keyframe
        let newScene = 0
        const bnds = entry.sceneBoundaries ?? [0]
        for (let j = 0; j < bnds.length; j++) {
          if ((bnds || [0])[j] <= idx) newScene = j
          else break
        }
        setSceneIndex(newScene)
      } else {
        setKeyframeMode(false)
      }
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const entry = history[newIndex]
      setHistoryIndex(newIndex)
      setCharacters(JSON.parse(JSON.stringify(entry.characters)))

      // Restore scene metadata
      setSceneBoundaries(entry.sceneBoundaries ?? [0])
      setSceneNames(entry.sceneNames ?? [])

      if (entry.keyframes) {
        const kfs = JSON.parse(JSON.stringify(entry.keyframes))
        setKeyframes(kfs)
        setKeyframeMode(true)
        const idx = Math.min(entry.activeKeyframeIndex ?? 0, kfs.length - 1)
        setActiveKeyframeIndex(idx)

        let newScene = 0
        const bnds = entry.sceneBoundaries ?? [0]
        for (let j = 0; j < bnds.length; j++) {
          if ((bnds || [0])[j] <= idx) newScene = j
          else break
        }
        setSceneIndex(newScene)
      } else {
        setKeyframeMode(false)
      }
    }
  }

  // ── Canvas event handlers ──
  function handleCanvasClick(e: React.MouseEvent) {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false
      return
    }

    // ── Note mode: click to place a new text annotation ──
    if (noteMode && keyframeMode) {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const x = Math.round(e.clientX - rect.left - wingOffset)
      const y = Math.round(e.clientY - rect.top)

      // Check if clicking on an existing annotation (only 'inside' zone opens editing)
      const annotations = keyframes[activeKeyframeIndex]?.annotations ?? []
      const hit = hitTestAnnotation(x, y, annotations)
      if (hit) {
        setSelectedAnnotationId(hit.ann.id)
        if (hit.zone === 'inside') {
          setEditingAnnotationId(hit.ann.id)
        }
        return
      }

      // Create new annotation — block on keyframe 1, move to keyframe 2 instead
      const targetKfIndex = activeKeyframeIndex === 0 && keyframes.length > 1 ? 1 : activeKeyframeIndex
      if (activeKeyframeIndex === 0 && keyframes.length > 1) {
        showToast('Notes cannot be placed on Keyframe 1 — moved to Keyframe 2', 'info')
      }
      const id = `ann_${annotationNextId.current++}`
      const newAnn: TextAnnotation = { id, x, y, width: 200, text: '', fontSize: noteFontSize, color: '#000' }
      const updatedKfs = keyframes.map((kf, i) =>
        i === targetKfIndex ? { ...kf, annotations: [...(kf.annotations ?? []), newAnn] } : kf
      )
      setKeyframes(updatedKfs)
      if (activeKeyframeIndex === 0 && keyframes.length > 1) {
        // Switch to keyframe 2 so the user can edit the note there
        setActiveKeyframeIndex(1)
        setCharacters(JSON.parse(JSON.stringify(keyframes[1].characters)))
      }
      setSelectedAnnotationId(id)
      setEditingAnnotationId(id)
      return
    }

    // ── Props mode: click to place or select a prop (not in keyframe mode) ──
    if (propsMode && !keyframeMode) {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const x = Math.round(e.clientX - rect.left - wingOffset)
      const y = Math.round(e.clientY - rect.top)
      // Check lock button click on selected prop
      if (selectedPropId) {
        const selProp = getStageProps().find(p => p.id === selectedPropId)
        if (selProp) {
          const lockBtnX = selProp.x + selProp.width + 6
          const lockBtnY = selProp.y - 14
          const lockSize = 18
          if (x >= lockBtnX && x <= lockBtnX + lockSize && y >= lockBtnY && y <= lockBtnY + lockSize) {
            updateStageProp(selectedPropId, { locked: !selProp.locked })
            return
          }
        }
      }
      // In Edit Prop mode, allow clicking another prop to select it
      if (selectedPropId) {
        const props = getStageProps()
        const hitProp = hitTestProp(x, y, props)
        if (hitProp) {
          setSelectedPropId(hitProp.id)
          return
        }
        // Clicking empty area deselects and exits props mode
        setSelectedPropId(null)
        setPropsMode(false)
        return
      }
      // In Add Prop mode — place a new prop (ignore clicks on existing props)
      addStageProp(x - 30, y - 30)
      return
    }

    // In keyframe mode, only allow selecting/moving — no adding or gaze setting
    if (keyframeMode && (addMode || awaitingDirectionFor)) return

    // ── Allow clicking existing props (select / lock toggle) — not in keyframe mode or add char mode ──
    if (!propsMode && !keyframeMode && !addMode) {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const x = Math.round(e.clientX - rect.left - wingOffset)
      const y = Math.round(e.clientY - rect.top)
      // Check lock button click on selected prop
      if (selectedPropId) {
        const selProp = getStageProps().find(p => p.id === selectedPropId)
        if (selProp) {
          const lockBtnX = selProp.x + selProp.width + 6
          const lockBtnY = selProp.y - 14
          const lockSize = 18
          if (x >= lockBtnX && x <= lockBtnX + lockSize && y >= lockBtnY && y <= lockBtnY + lockSize) {
            updateStageProp(selectedPropId, { locked: !selProp.locked })
            return
          }
        }
      }
      const props = getStageProps()
      const hitProp = hitTestProp(x, y, props)
      if (hitProp) {
        setSelectedPropId(hitProp.id)
        setPropsMode(true)
        setSelectedCharId(null)
        setAwaitingDirectionFor(null)
        return
      }
      // Clicked empty space — deselect prop
      if (selectedPropId) {
        setSelectedPropId(null)
      }
    }

    if (awaitingDirectionFor) {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left - wingOffset
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
    const x = Math.round(e.clientX - rect.left - wingOffset)
    const y = Math.round(e.clientY - rect.top)
    const id = String.fromCharCode(65 + (counter % 26))
    const colorIndex = counter % PASTEL_PAIRS.length
    const pastel = PASTEL_PAIRS[colorIndex]
    setCounter((c) => c + 1)
    setDefaultPersonColor(pastel.head)
    setDefaultShoulderColor(pastel.shoulder)
    const pos = preventOverlap ? resolveCollisions(x, y, id, characters) : { x, y }
    const updated = [...characters, { id, name: id, x: pos.x, y: pos.y, angle: Math.PI / 2, eyeOffset: 0, color: pastel.head, shoulderColor: pastel.shoulder }]
    setCharacters(updated)
    saveToHistory(updated)
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left - wingOffset
    const my = e.clientY - rect.top

    setFileMenuOpen(false)
    setConfigMenuOpen(false)

    // Block editing for non-owners
    if (!canEdit && currentProjectId) {
      showToast('You are viewing a shared project — editing is not allowed', 'info')
      return
    }

    // ── Props mode: start drag (not in keyframe mode) ──
    if (propsMode && !keyframeMode) {
      const props = getStageProps()
      // Check lock button click on selected prop first
      if (selectedPropId) {
        const selProp = props.find(p => p.id === selectedPropId)
        if (selProp) {
          const lockBtnX = selProp.x + selProp.width + 6
          const lockBtnY = selProp.y - 14
          const lockSize = 18
          if (mx >= lockBtnX && mx <= lockBtnX + lockSize && my >= lockBtnY && my <= lockBtnY + lockSize) {
            updateStageProp(selectedPropId, { locked: !selProp.locked })
            skipNextClickRef.current = true
            return
          }
        }
      }
      // Check corner resize handles on selected prop
      if (selectedPropId) {
        const selProp = props.find(p => p.id === selectedPropId)
        if (selProp && !selProp.locked) {
          // Check rotation handle first (circle above top-center)
          const rotHandleX = selProp.x + selProp.width / 2
          const rotHandleY = selProp.y - 24
          const distToRot = Math.sqrt((mx - rotHandleX) ** 2 + (my - rotHandleY) ** 2)
          if (distToRot <= 8) {
            const cx = selProp.x + selProp.width / 2
            const cy = selProp.y + selProp.height / 2
            propDragRef.current = {
              id: selProp.id,
              offsetX: 0,
              offsetY: 0,
              mode: 'rotate',
              startAngle: Math.atan2(my - cy, mx - cx),
              startRotation: selProp.rotation ?? 0,
            }
            skipNextClickRef.current = true
            return
          }
          const hs = 6 // handle half-size
          const corners: { key: 'tl' | 'tr' | 'bl' | 'br'; cx: number; cy: number }[] = [
            { key: 'tl', cx: selProp.x, cy: selProp.y },
            { key: 'tr', cx: selProp.x + selProp.width, cy: selProp.y },
            { key: 'bl', cx: selProp.x, cy: selProp.y + selProp.height },
            { key: 'br', cx: selProp.x + selProp.width, cy: selProp.y + selProp.height },
          ]
          for (const corner of corners) {
            if (Math.abs(mx - corner.cx) <= hs + 2 && Math.abs(my - corner.cy) <= hs + 2) {
              propDragRef.current = {
                id: selProp.id,
                offsetX: 0,
                offsetY: 0,
                mode: 'resize',
                corner: corner.key,
                startMouseX: mx,
                startMouseY: my,
                startX: selProp.x,
                startY: selProp.y,
                startWidth: selProp.width,
                startHeight: selProp.height,
              }
              skipNextClickRef.current = true
              return
            }
          }
        }
      }
      const hitProp = hitTestProp(mx, my, props)
      // Only allow selecting/dragging props in Edit Prop mode (not Add Prop mode)
      if (hitProp && !hitProp.locked && selectedPropId) {
        setSelectedPropId(hitProp.id)
        propDragRef.current = { id: hitProp.id, offsetX: mx - hitProp.x, offsetY: my - hitProp.y, mode: 'move' }
        skipNextClickRef.current = true
        return
      }
      // Clicked empty space — check if clicking a character first
      for (const char of characters) {
        const d = Math.hypot(mx - char.x, my - char.y)
        const headRx = personSize.headW / 2
        const headRy = personSize.headH / 2
        const shoulderRx = personSize.shoulderW / 2
        const shoulderRy = personSize.shoulderH / 2
        const shoulderDist = headRy * 0.45
        const angle = char.angle ?? 0
        const shoulderX = char.x - Math.cos(angle) * shoulderDist
        const shoulderY = char.y - Math.sin(angle) * shoulderDist
        const shoulderD = Math.hypot(mx - shoulderX, my - shoulderY)
        if (d <= Math.max(headRx, headRy) || shoulderD <= Math.max(shoulderRx, shoulderRy)) {
          // Clicked a character — exit props mode and select it
          setSelectedCharId(char.id)
          setPropsMode(false)
          setSelectedPropId(null)
          setAddMode(false)
          dragRef.current = { type: 'char-move', charId: char.id, hasMoved: false }
          skipNextClickRef.current = true
          return
        }
      }
      // Deselect prop, exit props mode
      if (selectedPropId) {
        setSelectedPropId(null)
        setPropsMode(false)
        skipNextClickRef.current = true
      }
      return
    }

    // ── Allow dragging/resizing existing props outside props mode — not in keyframe or add char mode ──
    if (!propsMode && !keyframeMode && !addMode) {
      const allProps = getStageProps()
      // Check corner resize handles on selected prop first
      if (selectedPropId) {
        const selProp = allProps.find(p => p.id === selectedPropId)
        if (selProp && !selProp.locked) {
          // Check rotation handle
          const rotHandleX2 = selProp.x + selProp.width / 2
          const rotHandleY2 = selProp.y - 24
          const distToRot2 = Math.sqrt((mx - rotHandleX2) ** 2 + (my - rotHandleY2) ** 2)
          if (distToRot2 <= 8) {
            const cx2 = selProp.x + selProp.width / 2
            const cy2 = selProp.y + selProp.height / 2
            propDragRef.current = {
              id: selProp.id,
              offsetX: 0,
              offsetY: 0,
              mode: 'rotate',
              startAngle: Math.atan2(my - cy2, mx - cx2),
              startRotation: selProp.rotation ?? 0,
            }
            skipNextClickRef.current = true
            return
          }
          const hs = 6
          const corners: { key: 'tl' | 'tr' | 'bl' | 'br'; cx: number; cy: number }[] = [
            { key: 'tl', cx: selProp.x, cy: selProp.y },
            { key: 'tr', cx: selProp.x + selProp.width, cy: selProp.y },
            { key: 'bl', cx: selProp.x, cy: selProp.y + selProp.height },
            { key: 'br', cx: selProp.x + selProp.width, cy: selProp.y + selProp.height },
          ]
          for (const corner of corners) {
            if (Math.abs(mx - corner.cx) <= hs + 2 && Math.abs(my - corner.cy) <= hs + 2) {
              propDragRef.current = {
                id: selProp.id,
                offsetX: 0,
                offsetY: 0,
                mode: 'resize',
                corner: corner.key,
                startMouseX: mx,
                startMouseY: my,
                startX: selProp.x,
                startY: selProp.y,
                startWidth: selProp.width,
                startHeight: selProp.height,
              }
              skipNextClickRef.current = true
              return
            }
          }
        }
      }
      const hitProp2 = hitTestProp(mx, my, allProps)
      if (hitProp2 && !hitProp2.locked) {
        setSelectedPropId(hitProp2.id)
        setPropsMode(true)
        setSelectedCharId(null)
        setAwaitingDirectionFor(null)
        propDragRef.current = { id: hitProp2.id, offsetX: mx - hitProp2.x, offsetY: my - hitProp2.y, mode: 'move' }
        skipNextClickRef.current = true
        return
      }
    }

    // ── Note mode annotation dragging / resizing ──
    if (noteMode && keyframeMode) {
      const annotations = keyframes[activeKeyframeIndex]?.annotations ?? []
      const hit = hitTestAnnotation(mx, my, annotations)
      if (hit) {
        const { ann, zone } = hit
        setSelectedAnnotationId(ann.id)
        if (zone.startsWith('corner-')) {
          // Corner resize
          const corner = zone.replace('corner-', '') as 'tl' | 'tr' | 'bl' | 'br'
          annotationDragRef.current = {
            id: ann.id,
            offsetX: 0,
            offsetY: 0,
            mode: 'resize',
            corner,
            startMouseX: mx,
            startMouseY: my,
            startX: ann.x,
            startY: ann.y,
            startWidth: ann.width,
            startHeight: getAnnotationHeight(ann),
          }
          skipNextClickRef.current = true
          return
        }
        if (zone === 'border') {
          // Border drag → move
          annotationDragRef.current = {
            id: ann.id,
            offsetX: mx - ann.x,
            offsetY: my - ann.y,
            mode: 'move',
          }
          skipNextClickRef.current = true
          return
        }
        // zone === 'inside' → just select, let onClick open editing
        return
      }
      // Clicked empty space in note mode — deselect
      // If we were editing, skip the upcoming click so it doesn't create a new box
      if (editingAnnotationId) skipNextClickRef.current = true
      setSelectedAnnotationId(null)
      setEditingAnnotationId(null)
      return
    }

    if (addMode) return

    // Prevent dragging characters in keyframe 1 (the starting position)
    const blockDrag = keyframeMode && activeKeyframeIndex === 0

    for (const char of characters) {
      const angle = char.angle ?? 0

      const d = Math.hypot(mx - char.x, my - char.y)
      const headRx = personSize.headW / 2
      const headRy = personSize.headH / 2
      const shoulderRx = personSize.shoulderW / 2
      const shoulderRy = personSize.shoulderH / 2
      // Check visibility button click (only on selected char in keyframe mode)
      if (keyframeMode && selectedCharId === char.id) {
        const visBtnSize = hoveringVisBtn ? 24 : 18
        const visBtnX = char.x + Math.max(headRx, shoulderRx) + 8
        const visBtnY = char.y - visBtnSize / 2
        if (mx >= visBtnX && mx <= visBtnX + visBtnSize && my >= visBtnY && my <= visBtnY + visBtnSize) {
          const newVis = !(char.visible !== false)
          handleUpdateCharVisible(char.id, newVis)
          return
        }
      }

      if (d <= Math.max(headRx, headRy)) {
        setSelectedCharId(char.id)
        // Exit props mode and add char mode when selecting a character
        setPropsMode(false)
        setSelectedPropId(null)
        setAddMode(false)
        if (blockDrag) { showToast('Keyframe 1 is the starting position — move characters in other keyframes', 'info'); return }
        dragRef.current = { type: 'char-move', charId: char.id, hasMoved: false }
        return
      }

      const shoulderDist = headRy * 0.45
      const shoulderX = char.x - Math.cos(angle) * shoulderDist
      const shoulderY = char.y - Math.sin(angle) * shoulderDist
      const shoulderD = Math.hypot(mx - shoulderX, my - shoulderY)
      if (shoulderD <= Math.max(shoulderRx, shoulderRy)) {
        setSelectedCharId(char.id)
        // Exit props mode and add char mode when selecting a character
        setPropsMode(false)
        setSelectedPropId(null)
        setAddMode(false)
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
      const mx = e.clientX - rect.left - wingOffset
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

    // ── Note mode: update cursor based on annotation hit zone ──
    if (noteMode && keyframeMode) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left - wingOffset
      const my = e.clientY - rect.top
      const annotations = keyframes[activeKeyframeIndex]?.annotations ?? []
      const hit = hitTestAnnotation(mx, my, annotations)
      const wrapper = canvas.parentElement
      if (wrapper) {
        if (!hit) {
          wrapper.style.cursor = 'crosshair'
        } else if (hit.zone === 'corner-tl' || hit.zone === 'corner-br') {
          wrapper.style.cursor = 'nwse-resize'
        } else if (hit.zone === 'corner-tr' || hit.zone === 'corner-bl') {
          wrapper.style.cursor = 'nesw-resize'
        } else if (hit.zone === 'border') {
          wrapper.style.cursor = 'move'
        } else {
          wrapper.style.cursor = 'text'
        }
      }
      return
    }

    // ── Update cursor for prop resize handles ──
    if (selectedPropId) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left - wingOffset
      const my = e.clientY - rect.top
      const selProp = getStageProps().find(p => p.id === selectedPropId)
      const wrapper = canvas.parentElement
      if (selProp && !selProp.locked && wrapper) {
        // Check rotation handle hover
        const rotHX = selProp.x + selProp.width / 2
        const rotHY = selProp.y - 24
        const distRot = Math.sqrt((mx - rotHX) ** 2 + (my - rotHY) ** 2)
        if (distRot <= 8) {
          wrapper.style.cursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%232563eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/%3E%3Cpath d='M21 3v5h-5'/%3E%3C/svg%3E") 12 12, crosshair`
          return
        }
        const hs = 6
        const corners: { key: string; cx: number; cy: number }[] = [
          { key: 'tl', cx: selProp.x, cy: selProp.y },
          { key: 'tr', cx: selProp.x + selProp.width, cy: selProp.y },
          { key: 'bl', cx: selProp.x, cy: selProp.y + selProp.height },
          { key: 'br', cx: selProp.x + selProp.width, cy: selProp.y + selProp.height },
        ]
        let hitCorner = ''
        for (const corner of corners) {
          if (Math.abs(mx - corner.cx) <= hs + 2 && Math.abs(my - corner.cy) <= hs + 2) {
            hitCorner = corner.key
            break
          }
        }
        if (hitCorner === 'tl' || hitCorner === 'br') {
          wrapper.style.cursor = 'nwse-resize'
        } else if (hitCorner === 'tr' || hitCorner === 'bl') {
          wrapper.style.cursor = 'nesw-resize'
        } else {
          wrapper.style.cursor = ''
        }
      }
    }

    // ── Track hover on visibility eye button beside selected character ──
    if (keyframeMode && selectedCharId) {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left - wingOffset
        const my = e.clientY - rect.top
        const char = characters.find(c => c.id === selectedCharId)
        if (char) {
          const headRx = personSize.headW / 2
          const shoulderRx = personSize.shoulderW / 2
          const visBtnSize = hoveringVisBtn ? 24 : 18
          const visBtnX = char.x + Math.max(headRx, shoulderRx) + 8
          const visBtnY = char.y - visBtnSize / 2
          const isOver = mx >= visBtnX && mx <= visBtnX + visBtnSize && my >= visBtnY && my <= visBtnY + visBtnSize
          if (isOver !== hoveringVisBtn) {
            setHoveringVisBtn(isOver)
            const wrapper = canvas.parentElement
            if (wrapper) wrapper.style.cursor = isOver ? 'pointer' : ''
          }
        } else if (hoveringVisBtn) {
          setHoveringVisBtn(false)
        }
      }
    } else if (hoveringVisBtn) {
      setHoveringVisBtn(false)
    }
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
    const x = Math.round(e.clientX - rect.left - wingOffset)
    const y = Math.round(e.clientY - rect.top)

    const pos = preventOverlap ? resolveCollisions(x, y, id, characters) : { x, y }

    if (keyframeMode && keyframes.length > 0) {
      const updatedKfs = keyframes.map((kf, i) =>
        i === activeKeyframeIndex ? { ...kf, characters: kf.characters.map(c => c.id === id ? { ...c, x: pos.x, y: pos.y, visible: true } : c) } : kf
      )
      setKeyframes(updatedKfs)
      const updatedChars = JSON.parse(JSON.stringify(updatedKfs[activeKeyframeIndex].characters))
      setCharacters(updatedChars)
      saveToHistory(updatedChars, updatedKfs, activeKeyframeIndex)
      setSelectedCharId(id)
      setPropsMode(false)
      setSelectedPropId(null)
    } else {
      const updated = characters.map(c => c.id === id ? { ...c, x: pos.x, y: pos.y, visible: true } : c)
      setCharacters(updated)
      saveToHistory(updated)
      setSelectedCharId(id)
      setPropsMode(false)
      setSelectedPropId(null)
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
        // Extend horizontal guides into wing areas
        const drawStart = showWings ? Math.min(g.start, -wingOffset) : g.start
        const drawEnd = showWings ? Math.max(g.end, canvasSize.width + wingOffset) : g.end
        ctx.beginPath()
        ctx.moveTo(drawStart, g.pos)
        ctx.lineTo(drawEnd, g.pos)
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
    if (canvas.width !== totalCanvasWidth) canvas.width = totalCanvasWidth
    if (canvas.height !== canvasSize.height) canvas.height = canvasSize.height

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ── Draw wing areas (absolute canvas coordinates, before translate) ──
    if (showWings && wingOffset > 0) {
      ctx.save()
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
      const wh = Math.min(wingSize.height, canvas.height)
      // Left wing
      ctx.fillRect(0, 0, wingOffset, wh)
      // Right wing
      ctx.fillRect(canvas.width - wingOffset, 0, wingOffset, wh)
      // Wing border lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(wingOffset, 0)
      ctx.lineTo(wingOffset, wh)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(canvas.width - wingOffset, 0)
      ctx.lineTo(canvas.width - wingOffset, wh)
      ctx.stroke()
      // Bottom edge if wing height < canvas height
      if (wh < canvas.height) {
        ctx.beginPath()
        ctx.moveTo(0, wh)
        ctx.lineTo(wingOffset, wh)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(canvas.width - wingOffset, wh)
        ctx.lineTo(canvas.width, wh)
        ctx.stroke()
      }
      ctx.restore()
    }

    // Translate context so stage area [0, canvasSize.width] starts after the left wing
    ctx.save()
    ctx.translate(wingOffset, 0)

    ctx.save()
    ctx.font = `600 ${labelFontSize}px "Inter", sans-serif`
    ctx.letterSpacing = '12px'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#94a3b8' // Zinc 400 for subtle contrast
    const topLabel = stageReversed ? 'A U D I E N C E' : 'S T A G E'
    const bottomLabel = stageReversed ? 'S T A G E' : 'A U D I E N C E'
    ctx.fillText(topLabel, canvasSize.width / 2, 30 + labelFontSize)
    ctx.fillText(bottomLabel, canvasSize.width / 2, canvas.height - 15)
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
          ctx.lineTo(canvasSize.width, guide.y)
          ctx.stroke()
        }
      })

      ctx.restore()
    }

    // ── Draw stage props (behind characters) ──
    const currentProps = stageProps
    currentProps.forEach((prop) => {
      if (prop.visible === false) return
      ctx.save()
      ctx.globalAlpha = prop.opacity ?? 0.7
      ctx.fillStyle = prop.color || '#d4a574'
      const cx = prop.x + prop.width / 2
      const cy = prop.y + prop.height / 2
      ctx.translate(cx, cy)
      ctx.rotate((prop.rotation ?? 0) * Math.PI / 180)
      ctx.translate(-cx, -cy)

      if (prop.shape === 'rect') {
        ctx.fillRect(prop.x, prop.y, prop.width, prop.height)
      } else if (prop.shape === 'circle') {
        ctx.beginPath()
        ctx.ellipse(cx, cy, prop.width / 2, prop.height / 2, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (prop.shape === 'triangle') {
        ctx.beginPath()
        ctx.moveTo(cx, prop.y)
        ctx.lineTo(prop.x + prop.width, prop.y + prop.height)
        ctx.lineTo(prop.x, prop.y + prop.height)
        ctx.closePath()
        ctx.fill()
      }

      // Stroke border
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 1
      ctx.globalAlpha = 1
      if (prop.shape === 'rect') {
        ctx.strokeRect(prop.x, prop.y, prop.width, prop.height)
      } else if (prop.shape === 'circle') {
        ctx.beginPath()
        ctx.ellipse(cx, cy, prop.width / 2, prop.height / 2, 0, 0, Math.PI * 2)
        ctx.stroke()
      } else if (prop.shape === 'triangle') {
        ctx.beginPath()
        ctx.moveTo(cx, prop.y)
        ctx.lineTo(prop.x + prop.width, prop.y + prop.height)
        ctx.lineTo(prop.x, prop.y + prop.height)
        ctx.closePath()
        ctx.stroke()
      }

      // Label
      if (prop.label || prop.name) {
        ctx.globalAlpha = 1
        ctx.font = '11px "Inter", sans-serif'
        ctx.fillStyle = '#333'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(prop.label || prop.name, cx, cy)
      }

      // Selection highlight + resize handles
      if (selectedPropId === prop.id) {
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 3])
        ctx.strokeRect(prop.x - 3, prop.y - 3, prop.width + 6, prop.height + 6)
        ctx.setLineDash([])
        // Draw corner resize handles
        const hs = 5
        const corners = [
          { x: prop.x, y: prop.y },
          { x: prop.x + prop.width, y: prop.y },
          { x: prop.x, y: prop.y + prop.height },
          { x: prop.x + prop.width, y: prop.y + prop.height },
        ]
        for (const c of corners) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(c.x - hs, c.y - hs, hs * 2, hs * 2)
          ctx.strokeStyle = '#2563eb'
          ctx.lineWidth = 1.5
          ctx.strokeRect(c.x - hs, c.y - hs, hs * 2, hs * 2)
        }

        // Draw lock button (top-right, outside selection box)
        const lockBtnX = prop.x + prop.width + 6
        const lockBtnY = prop.y - 14
        const lockSize = 18
        ctx.fillStyle = prop.locked ? '#ef4444' : 'rgba(255,255,255,0.7)'
        ctx.strokeStyle = prop.locked ? '#dc2626' : 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(lockBtnX, lockBtnY, lockSize, lockSize, 3)
        ctx.fill()
        ctx.stroke()
        // Draw lock icon or X
        if (prop.locked) {
          // Draw X
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(lockBtnX + 5, lockBtnY + 5)
          ctx.lineTo(lockBtnX + lockSize - 5, lockBtnY + lockSize - 5)
          ctx.moveTo(lockBtnX + lockSize - 5, lockBtnY + 5)
          ctx.lineTo(lockBtnX + 5, lockBtnY + lockSize - 5)
          ctx.stroke()
        } else {
          // Draw unlock icon (small padlock outline)
          ctx.strokeStyle = '#666'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(lockBtnX + lockSize / 2, lockBtnY + 7, 3.5, Math.PI, 0)
          ctx.stroke()
          ctx.fillStyle = '#666'
          ctx.fillRect(lockBtnX + 4, lockBtnY + 9, lockSize - 8, 6)
        }

        // Draw rotation handle (circle above the top-center with a connecting line)
        if (!prop.locked) {
          const rotHandleX = prop.x + prop.width / 2
          const rotHandleY = prop.y - 24
          const rotHandleR = 5
          // Connecting line from top-center to handle
          ctx.strokeStyle = '#2563eb'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(rotHandleX, prop.y - 3)
          ctx.lineTo(rotHandleX, rotHandleY + rotHandleR)
          ctx.stroke()
          // Handle circle
          ctx.beginPath()
          ctx.arc(rotHandleX, rotHandleY, rotHandleR, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.strokeStyle = '#2563eb'
          ctx.lineWidth = 1.5
          ctx.stroke()
          // Small rotation arrow inside handle
          ctx.strokeStyle = '#2563eb'
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(rotHandleX, rotHandleY, 3, -Math.PI * 0.8, Math.PI * 0.3)
          ctx.stroke()
          // Arrow tip
          const arrowAngle = Math.PI * 0.3
          const ax = rotHandleX + 3 * Math.cos(arrowAngle)
          const ay = rotHandleY + 3 * Math.sin(arrowAngle)
          ctx.beginPath()
          ctx.moveTo(ax + 2, ay - 1.5)
          ctx.lineTo(ax, ay)
          ctx.lineTo(ax + 2.5, ay + 1)
          ctx.stroke()
        }
      }

      ctx.restore()
    })

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

      const headRx = personSize.headW / 2
      const headRy = personSize.headH / 2
      const shoulderRx = personSize.shoulderW / 2
      const shoulderRy = personSize.shoulderH / 2
      const shoulderDist = headRy * 0.45
      const shoulderX = char.x - Math.cos(angle) * shoulderDist
      const shoulderY = char.y - Math.sin(angle) * shoulderDist

      const eyeOffsetAngle = (char.eyeOffset ?? 0) + angle
      const shouldersUnder = Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle))

      if (shouldersUnder) {
        ctx.save()
        ctx.translate(shoulderX, shoulderY)
        ctx.beginPath()
        ctx.ellipse(0, 0, shoulderRx, shoulderRy, 0, 0, Math.PI * 2)
        ctx.fillStyle = char.shoulderColor || '#ff6b6b'
        ctx.fill()
        ctx.restore()
      }

      ctx.save()
      ctx.translate(char.x, char.y)
      ctx.beginPath()
      ctx.ellipse(0, 0, headRx, headRy, 0, 0, Math.PI * 2)
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
      const startX = Math.cos(eyeOffsetAngle) * (headRx + 2)
      const startY = Math.sin(eyeOffsetAngle) * (headRy + 2)
      const lineLen = Math.min(headRx, headRy) * 0.5
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

      // ── Overlap warning glow (only when preventOverlap is on) ──
      if (preventOverlap) {
        const isOverlapping = characters.some(other => {
          if (other.id === char.id) return false
          if (other.visible === false) return false
          const dx = char.x - other.x
          const dy = char.y - other.y
          const minDistX = personSize.shoulderW
          const minDistY = personSize.shoulderH + personSize.headH
          const normX = dx / minDistX
          const normY = dy / minDistY
          return normX * normX + normY * normY < 1
        })
        if (isOverlapping) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(char.x, char.y, Math.max(shoulderRx, headRx + headRy) + 6, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'
          ctx.lineWidth = 2.5
          ctx.setLineDash([4, 3])
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        }
      }

      if (selectedCharId === char.id && !(dragRef.current.type === 'char-move' && dragRef.current.hasMoved)) {
        ctx.beginPath()
        ctx.arc(char.x, char.y, Math.max(headRx, headRy) + 4, 0, Math.PI * 2)
        ctx.strokeStyle = '#2c3e50'
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw visibility eye button beside selected character in keyframe mode
        if (keyframeMode) {
          const isHovered = hoveringVisBtn
          const visBtnSize = isHovered ? 24 : 18
          const visBtnX = char.x + Math.max(headRx, shoulderRx) + 8
          const visBtnY = char.y - visBtnSize / 2
          const isVisible = char.visible !== false
          if (isHovered) {
            // Hovered: fully opaque and bigger
            ctx.globalAlpha = 1
            ctx.fillStyle = isVisible ? 'rgba(255,255,255,0.95)' : '#ef4444'
            ctx.strokeStyle = isVisible ? 'rgba(0,0,0,0.4)' : '#dc2626'
          } else {
            // Not hovered: transparent
            ctx.globalAlpha = 0.35
            ctx.fillStyle = isVisible ? 'rgba(255,255,255,0.7)' : 'rgba(239,68,68,0.7)'
            ctx.strokeStyle = isVisible ? 'rgba(0,0,0,0.15)' : 'rgba(220,38,38,0.5)'
          }
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.roundRect(visBtnX, visBtnY, visBtnSize, visBtnSize, 3)
          ctx.fill()
          ctx.stroke()
          // Draw eye icon
          const ecx = visBtnX + visBtnSize / 2
          const ecy = visBtnY + visBtnSize / 2
          const es = isHovered ? 1.3 : 1 // scale factor
          if (isVisible) {
            // Open eye
            ctx.strokeStyle = isHovered ? '#333' : '#666'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(ecx - 5 * es, ecy)
            ctx.quadraticCurveTo(ecx, ecy - 4 * es, ecx + 5 * es, ecy)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(ecx - 5 * es, ecy)
            ctx.quadraticCurveTo(ecx, ecy + 4 * es, ecx + 5 * es, ecy)
            ctx.stroke()
            ctx.beginPath()
            ctx.arc(ecx, ecy, 1.5 * es, 0, Math.PI * 2)
            ctx.fillStyle = isHovered ? '#333' : '#666'
            ctx.fill()
          } else {
            // Closed eye with slash
            ctx.strokeStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.8)'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(ecx - 5 * es, ecy)
            ctx.quadraticCurveTo(ecx, ecy + 4 * es, ecx + 5 * es, ecy)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(ecx - 4 * es, ecy - 4 * es)
            ctx.lineTo(ecx + 4 * es, ecy + 4 * es)
            ctx.stroke()
          }
          ctx.globalAlpha = 1
        }
      }

      if (!shouldersUnder) {
        ctx.save()
        ctx.translate(shoulderX, shoulderY)
        ctx.beginPath()
        ctx.ellipse(0, 0, shoulderRx, shoulderRy, 0, 0, Math.PI * 2)
        ctx.fillStyle = char.shoulderColor || '#ff6b6b'
        ctx.fill()
        ctx.restore()
      }

      ctx.restore()
    })

    // ── Draw text annotations for the current keyframe ──
    const currentAnnotations = keyframes[activeKeyframeIndex]?.annotations ?? []
    currentAnnotations.forEach((ann) => {
      if (editingAnnotationId === ann.id) return // skip drawing while editing (HTML overlay handles it)
      if (!ann.text.trim()) return // don't draw empty annotations
      ctx.save()
      ctx.font = `${ann.fontSize}px "Inter", sans-serif`
      ctx.fillStyle = ann.color || '#000'
      ctx.textBaseline = 'top'
      const lines = wrapText(ann.text, ann.fontSize, ann.width)
      const lineHeight = ann.fontSize * 1.3
      const totalH = getAnnotationHeight(ann)
      lines.forEach((line, li) => {
        ctx.fillText(line, ann.x, ann.y + li * lineHeight)
      })
      // Draw selection / border
      if (selectedAnnotationId === ann.id || noteMode) {
        const bx = ann.x - 2, by = ann.y - 2, bw = ann.width + 4, bh = totalH + 4
        ctx.strokeStyle = selectedAnnotationId === ann.id ? '#2563eb' : '#94a3b8'
        ctx.lineWidth = selectedAnnotationId === ann.id ? 2 : 1
        ctx.setLineDash(selectedAnnotationId === ann.id ? [] : [4, 4])
        ctx.strokeRect(bx, by, bw, bh)
        // Draw corner resize handles when selected
        if (selectedAnnotationId === ann.id) {
          const hs = 5 // handle half-size
          ctx.fillStyle = '#2563eb'
          ctx.setLineDash([])
          // TL
          ctx.fillRect(bx - hs, by - hs, hs * 2, hs * 2)
          // TR
          ctx.fillRect(bx + bw - hs, by - hs, hs * 2, hs * 2)
          // BL
          ctx.fillRect(bx - hs, by + bh - hs, hs * 2, hs * 2)
          // BR
          ctx.fillRect(bx + bw - hs, by + bh - hs, hs * 2, hs * 2)
        }
      }
      ctx.restore()
    })

    // Restore the wing-offset translate
    ctx.restore()
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
      setPropsMode(false)
      setSelectedPropId(null)
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
      // Commit any editing annotation before exiting
      commitEditingAnnotation()
      // Commit current characters into keyframes using functional form to preserve annotation updates
      setKeyframes(prev => {
        const committed = prev.map((kf, i) => i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf)
        saveToHistory(characters, committed, activeKeyframeIndex)
        return committed
      })
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
    saveToHistory(JSON.parse(JSON.stringify(relabeled[newActive].characters)), relabeled, newActive, newBoundaries, newSceneNames)
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

    const newSceneNames = (sceneNames || []).slice()
    newSceneNames[newSceneIndex] = newSceneNames[newSceneIndex] || `Scene ${newSceneIndex + 1}`
    setSceneNames(newSceneNames)

    saveToHistory(JSON.parse(JSON.stringify(relabeled[activeIdx].characters)), relabeled, activeIdx, newBoundaries, newSceneNames)
  }


  function addKeyframe() {

    // Commit current characters into the active keyframe before inserting
    const baseKfs = keyframes.map((kf, i) =>
      i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf
    )

    // When adding a keyframe, preserve visibility from current state
    const kf: Keyframe = {
      id: nextKfId.current++,
      label: '',
      characters: characters.map(c => ({ ...c, visible: c.visible !== false }))
    }
    // Insert after the currently active keyframe (within the same scene)
    const insertAt = activeKeyframeIndex + 1
    // Insert the new keyframe and shift subsequent scene boundaries so
    // scene start indices remain correct for scenes after the insertion.
    const updatedKfs = [...baseKfs.slice(0, insertAt), kf, ...baseKfs.slice(insertAt)]
    const newBoundaries = (sceneBoundaries || [0]).map(b => (b < insertAt ? b : b + 1))
    // If there were no boundaries, ensure at least one exists
    if (newBoundaries.length === 0) newBoundaries.push(0)
    const relabeled = renumberKeyframes(updatedKfs, newBoundaries)
    setKeyframes(relabeled)
    setSceneBoundaries(newBoundaries)
    setActiveKeyframeIndex(insertAt)
    saveToHistory(characters, relabeled, insertAt, newBoundaries, sceneNames)
  }

  function deleteKeyframe(index: number) {
    if (keyframes.length <= 1) return
    // Remove the keyframe and shift subsequent scene boundaries so scenes
    // remain attached to their intended keyframes.
    const filtered = keyframes.filter((_, i) => i !== index)

    // Shift boundaries: boundaries at positions <= index stay, those > index decrement by 1
    const rawBoundaries = Array.isArray(sceneBoundaries) && sceneBoundaries.length > 0 ? sceneBoundaries.slice() : [0]
    let newBoundaries = rawBoundaries.map(b => (b <= index ? b : b - 1))
    // Normalize: remove out-of-range boundaries and dedupe/sort
    newBoundaries = newBoundaries.filter(b => Number.isInteger(b) && b >= 0 && b < filtered.length)
    newBoundaries = Array.from(new Set(newBoundaries)).sort((a, b) => a - b)
    if (newBoundaries.length === 0) newBoundaries = [0]

    // Rebuild scene names to match new boundary count
    const newSceneNames: string[] = []
    for (let i = 0; i < newBoundaries.length; i++) {
      const n = (sceneNames && sceneNames[i]) || null
      newSceneNames.push(n && typeof n === 'string' ? n : `Scene ${i + 1}`)
    }

    const relabeled = renumberKeyframes(filtered, newBoundaries)
    setKeyframes(relabeled)
    setSceneBoundaries(newBoundaries)
    setSceneNames(newSceneNames)

    const newIndex = Math.min(index, relabeled.length - 1)
    setActiveKeyframeIndex(newIndex)
    setCharacters(JSON.parse(JSON.stringify(relabeled[newIndex].characters)))
    saveToHistory(JSON.parse(JSON.stringify(relabeled[newIndex].characters)), relabeled, newIndex, newBoundaries, newSceneNames)
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
    setEditingAnnotationId(null)
    setSelectedAnnotationId(null)
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

  /** Play from the active keyframe forward through the rest of the scene */
  function startPlaybackSingle() {
    if (keyframes.length < 2) return
    const sceneStartIdx = sceneBoundaries[sceneIndex] ?? 0
    if (activeKeyframeIndex <= sceneStartIdx) {
      // On keyframe 1 of the scene — behave like Play Scene
      startPlayback()
      return
    }
    const sceneStart = sceneBoundaries[sceneIndex] ?? 0
    const sceneEnd = sceneBoundaries[sceneIndex + 1] ?? keyframes.length
    const localKf = activeKeyframeIndex - sceneStart + 1
    showToast(`Playing from keyframe ${localKf}`, 'info')
    setIsPlaying(true)
    setSelectedCharId(null)
    setAwaitingDirectionFor(null)

    const allKfs: Keyframe[] = JSON.parse(JSON.stringify(keyframes.map((kf, i) =>
      i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf
    )))

    // Slice from the keyframe before the active one to the end of the scene
    const playStart = activeKeyframeIndex - 1
    const sceneKfs = allKfs.slice(playStart, sceneEnd)
    if (sceneKfs.length < 2) {
      setIsPlaying(false)
      return
    }

    let currentKfPair = 0
    const totalPairs = sceneKfs.length - 1
    const msMove = keyframeSpeed
    const msFade = fadeSpeed
    let startTime: number | null = null
    kfsRef.current = sceneKfs
    animPairRef.current = 0

    setActiveKeyframeIndex(playStart + 1)
    setCharacters(JSON.parse(JSON.stringify(sceneKfs[0].characters)))

    function animate(timestamp: number) {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      let pairProgress = elapsed / msMove

      if (currentKfPair >= totalPairs) {
        setCharacters(JSON.parse(JSON.stringify(sceneKfs[sceneKfs.length - 1].characters)))
        setActiveKeyframeIndex(playStart + sceneKfs.length - 1)
        setAnimationProgress(null)
        setFadeProgress(null)
        setIsPlaying(false)
        animFrameRef.current = null
        return
      }

      while (pairProgress >= 1 && currentKfPair < totalPairs) {
        currentKfPair++
        startTime = startTime! + msMove
        pairProgress = (timestamp - startTime) / msMove

        if (currentKfPair >= totalPairs) {
          setCharacters(JSON.parse(JSON.stringify(sceneKfs[sceneKfs.length - 1].characters)))
          setActiveKeyframeIndex(playStart + sceneKfs.length - 1)
          setAnimationProgress(null)
          setFadeProgress(null)
          setIsPlaying(false)
          animFrameRef.current = null
          return
        }
      }

      const t = Math.max(0, Math.min(pairProgress, 1))
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const fadeElapsed = timestamp - startTime
      const fadeT = Math.max(0, Math.min(fadeElapsed / msFade, 1))

      const fromChars = sceneKfs[currentKfPair].characters
      const toChars = sceneKfs[currentKfPair + 1].characters

      const interpolated = fromChars.map((fc: Character) => {
        const tc = toChars.find((c: Character) => c.id === fc.id)
        if (!tc) return fc
        const fromVis = fc.visible !== false
        const toVis = tc.visible !== false
        if (!fromVis && toVis) return { ...tc }
        if (fromVis && !toVis) return { ...fc }
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
      setActiveKeyframeIndex(playStart + Math.min(currentKfPair + 1, sceneKfs.length - 1))
      animPairRef.current = currentKfPair
      setAnimationProgress(eased)
      setFadeProgress(fadeT)
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }

  function startPlayback() {
    if (keyframes.length < 2) return
    showToast(`Playing scene: ${sceneNames[sceneIndex] || `Scene ${sceneIndex + 1}`}`, 'info')
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

  function startPlaybackAll() {
    if (keyframes.length < 2) return
    showToast('Playing all scenes', 'info')
    setIsPlaying(true)
    setSelectedCharId(null)
    setAwaitingDirectionFor(null)

    // Snapshot all keyframes across all scenes
    const allKfs: Keyframe[] = JSON.parse(JSON.stringify(keyframes.map((kf, i) =>
      i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf
    )))

    if (allKfs.length < 2) {
      setIsPlaying(false)
      return
    }

    // Start from the very first keyframe
    let currentKfPair = 0
    const totalPairs = allKfs.length - 1
    const msMove = keyframeSpeed
    const msFade = fadeSpeed
    let startTime: number | null = null
    kfsRef.current = allKfs
    animPairRef.current = 0

    // Jump to scene 0 and first keyframe
    setSceneIndex(0)
    setActiveKeyframeIndex(1)
    setCharacters(JSON.parse(JSON.stringify(allKfs[0].characters)))

    function animate(timestamp: number) {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      let pairProgress = elapsed / msMove

      if (currentKfPair >= totalPairs) {
        setCharacters(JSON.parse(JSON.stringify(allKfs[allKfs.length - 1].characters)))
        setActiveKeyframeIndex(allKfs.length - 1)
        // Set scene index to last scene
        for (let s = sceneBoundaries.length - 1; s >= 0; s--) {
          if ((sceneBoundaries[s] ?? 0) <= allKfs.length - 1) { setSceneIndex(s); break }
        }
        setAnimationProgress(null)
        setFadeProgress(null)
        setIsPlaying(false)
        animFrameRef.current = null
        return
      }

      while (pairProgress >= 1 && currentKfPair < totalPairs) {
        currentKfPair++
        startTime = startTime! + msMove
        pairProgress = (timestamp - startTime) / msMove

        if (currentKfPair >= totalPairs) {
          setCharacters(JSON.parse(JSON.stringify(allKfs[allKfs.length - 1].characters)))
          setActiveKeyframeIndex(allKfs.length - 1)
          for (let s = sceneBoundaries.length - 1; s >= 0; s--) {
            if ((sceneBoundaries[s] ?? 0) <= allKfs.length - 1) { setSceneIndex(s); break }
          }
          setAnimationProgress(null)
          setFadeProgress(null)
          setIsPlaying(false)
          animFrameRef.current = null
          return
        }
      }

      const t = Math.max(0, Math.min(pairProgress, 1))
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const fadeElapsed = timestamp - startTime
      const fadeT = Math.max(0, Math.min(fadeElapsed / msFade, 1))

      const fromChars = allKfs[currentKfPair].characters
      const toChars = allKfs[currentKfPair + 1].characters

      const interpolated = fromChars.map((fc: Character) => {
        const tc = toChars.find((c: Character) => c.id === fc.id)
        if (!tc) return fc
        const fromEntry = allKfs[currentKfPair].characters.find((c: Character) => c.id === fc.id)
        const toEntry = allKfs[currentKfPair + 1].characters.find((c: Character) => c.id === fc.id)
        const fromVis = fromEntry ? (fromEntry.visible !== false) : true
        const toVis = toEntry ? (toEntry.visible !== false) : true
        if (!fromVis && toVis) return { ...tc }
        if (fromVis && !toVis) return { ...fc }
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
      const targetIdx = Math.min(currentKfPair + 1, allKfs.length - 1)
      setActiveKeyframeIndex(targetIdx)
      // Update scene index to match the target keyframe
      for (let s = sceneBoundaries.length - 1; s >= 0; s--) {
        if ((sceneBoundaries[s] ?? 0) <= targetIdx) { setSceneIndex(s); break }
      }
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
    // If a note is being edited, commit its text from the DOM before saving
    if (editingAnnotationId) {
      const textarea = document.querySelector('textarea.z-50') as HTMLTextAreaElement | null
      const currentText = textarea ? textarea.value : null
      if (currentText !== null) {
        if (currentText.trim()) {
          committedKfs = committedKfs.map((kf, i) => i === activeKeyframeIndex ? {
            ...kf,
            annotations: (kf.annotations ?? []).map(a => a.id === editingAnnotationId ? { ...a, text: currentText } : a)
          } : kf)
        } else {
          committedKfs = committedKfs.map((kf, i) => i === activeKeyframeIndex ? {
            ...kf,
            annotations: (kf.annotations ?? []).filter(a => a.id !== editingAnnotationId)
          } : kf)
        }
      }
      setEditingAnnotationId(null)
    }
    // Clean up empty annotations before saving
    committedKfs = committedKfs.map(kf => ({
      ...kf,
      annotations: (kf.annotations ?? []).filter(a => a.text.trim())
    }))

    // Normalize scene names so we never save null/undefined entries.
    const rawSceneNames = Array.isArray(sceneNames) ? sceneNames.slice() : []
    const boundaries = Array.isArray(sceneBoundaries) && sceneBoundaries.length > 0 ? sceneBoundaries : [0]
    for (let i = 0; i < boundaries.length; i++) {
      const n = rawSceneNames[i]
      rawSceneNames[i] = (n && typeof n === 'string') ? n : `Scene ${i + 1}`
    }
    if (JSON.stringify(rawSceneNames) !== JSON.stringify(sceneNames)) setSceneNames(rawSceneNames)

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
      sceneNames: rawSceneNames,
      sceneIndex,
      projectTitle,
      sceneNotes,
      keyframeNotes,
      keyframeMode,
      activeKeyframeIndex,
      keyframeSpeed,
      fadeSpeed,
      labelFontSize,
      noteFontSize,
      showWings,
      wingSize,
      stageProps: JSON.parse(JSON.stringify(stageProps)),
      stageOffset
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

          // Determine scene boundaries (validate or infer) and fill missing scene names
          let finalBoundaries: number[] = []
          if (state.sceneBoundaries && Array.isArray(state.sceneBoundaries) && state.sceneBoundaries.length > 0) {
            finalBoundaries = state.sceneBoundaries.slice()
          } else if (state.scenes && Array.isArray(state.scenes) && state.scenes.length > 0) {
            const b: number[] = []
            let acc = 0
            for (const s of state.scenes) {
              b.push(acc)
              const len = Array.isArray(s) ? s.length : (s.keyframes ? s.keyframes.length : 0)
              acc += len
            }
            finalBoundaries = b
          } else {
            finalBoundaries = [0]
          }

          // If boundaries look invalid for the loaded keyframes, try to infer from labels
          if (finalBoundaries.some(b => typeof b !== 'number' || b < 0 || b >= loadedKfs.length) || finalBoundaries.length === 1 && loadedKfs.length > 1) {
            const inferred = inferSceneBoundariesFromKeyframes(loadedKfs)
            if (inferred && inferred.length > 0) finalBoundaries = inferred
          }

          // Build scene names array, filling nulls with "Scene N"
          const rawNames: (string | null)[] = (state.sceneNames && Array.isArray(state.sceneNames)) ? state.sceneNames.slice() : []
          const finalNames: string[] = []
          for (let i = 0; i < finalBoundaries.length; i++) {
            const n = rawNames[i]
            finalNames.push(n && typeof n === 'string' ? n : `Scene ${i + 1}`)
          }

          setSceneBoundaries(finalBoundaries)
          setSceneNames(finalNames)
          setSceneIndex(typeof state.sceneIndex === 'number' ? state.sceneIndex : 0)
          setProjectTitle(state.projectTitle || 'Untitled')
          setSceneNotes(state.sceneNotes || {})
          setKeyframeNotes(state.keyframeNotes || {})
          if (typeof state.labelFontSize === 'number') setLabelFontSize(state.labelFontSize)
          if (typeof state.noteFontSize === 'number') setNoteFontSize(state.noteFontSize)

          // If saved in keyframe mode, restore characters from the active keyframe
            if (state.keyframeMode) {
            setKeyframeMode(true)
            setCharacters(JSON.parse(JSON.stringify(loadedKfs[Math.min(idx, loadedKfs.length - 1)].characters || [])))
            saveToHistory(JSON.parse(JSON.stringify(loadedKfs[Math.min(idx, loadedKfs.length - 1)].characters || [])), loadedKfs, idx, finalBoundaries, finalNames)
          } else {
            setKeyframeMode(false)
            setCharacters(state.characters || [])
          }
        } else {
          setKeyframes([])
          setKeyframeMode(false)
          setCharacters(state.characters || [])
          nextKfId.current = 1
          setSceneBoundaries([0])
          setSceneNames(['Scene 1'])
        }

        if (typeof state.showWings === 'boolean') setShowWings(state.showWings)
        if (state.wingSize && typeof state.wingSize.width === 'number') setWingSize(state.wingSize)
        if (typeof state.keyframeSpeed === 'number') setKeyframeSpeed(state.keyframeSpeed)
        if (typeof state.fadeSpeed === 'number') setFadeSpeed(state.fadeSpeed)
        if (state.stageOffset && typeof state.stageOffset.top === 'number') setStageOffset(state.stageOffset)

        // Load stage props (top-level or migrate from keyframes)
        if (state.stageProps && Array.isArray(state.stageProps)) {
          setStageProps(state.stageProps)
        } else if (loadedKfs.length > 0) {
          // Backward compat: extract stageProps from first keyframe that has them
          const fromKf = loadedKfs.find(kf => kf.stageProps && kf.stageProps.length > 0)
          setStageProps(fromKf?.stageProps ?? [])
        } else {
          setStageProps([])
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
    // If a note is being edited, commit its text from the DOM before exporting
    if (editingAnnotationId) {
      const textarea = document.querySelector('textarea.z-50') as HTMLTextAreaElement | null
      const currentText = textarea ? textarea.value : null
      if (currentText !== null) {
        if (currentText.trim()) {
          committedKfs = committedKfs.map((kf, i) => i === activeKeyframeIndex ? {
            ...kf,
            annotations: (kf.annotations ?? []).map(a => a.id === editingAnnotationId ? { ...a, text: currentText } : a)
          } : kf)
        } else {
          committedKfs = committedKfs.map((kf, i) => i === activeKeyframeIndex ? {
            ...kf,
            annotations: (kf.annotations ?? []).filter(a => a.id !== editingAnnotationId)
          } : kf)
        }
      }
      setEditingAnnotationId(null)
    }
    // Clean up empty annotations before exporting
    committedKfs = committedKfs.map(kf => ({
      ...kf,
      annotations: (kf.annotations ?? []).filter(a => a.text.trim())
    }))
    // Normalize scene names for exported file
    const exportRawSceneNames = Array.isArray(sceneNames) ? sceneNames.slice() : []
    const exportBoundaries = Array.isArray(sceneBoundaries) && sceneBoundaries.length > 0 ? sceneBoundaries : [0]
    for (let i = 0; i < exportBoundaries.length; i++) {
      const n = exportRawSceneNames[i]
      exportRawSceneNames[i] = (n && typeof n === 'string') ? n : `Scene ${i + 1}`
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
      sceneNames: exportRawSceneNames,
      sceneIndex,
      keyframeMode,
      keyframeSpeed,
      fadeSpeed,
      projectTitle,
      sceneNotes,
      keyframeNotes,
      labelFontSize,
      noteFontSize,
      showWings,
      wingSize,
      stageProps: JSON.parse(JSON.stringify(stageProps)),
      stageOffset
    }
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // filename: projectTitle + timestamp (to minute), formatted: "24 February 2026 20:16"
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const month = monthNames[now.getMonth()]
    const year = now.getFullYear()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const timestamp = `${day} ${month} ${year} ${hh}:${mm}`
    // Prefer the persisted title if available (in case toolbar change hasn't propagated)
    let titleForFile = projectTitle
    try { const persisted = localStorage.getItem('stageProjectTitle'); if (persisted) titleForFile = persisted } catch (e) {}
    const safeTitle = (titleForFile || 'Untitled').replace(/[\\/:*?"<>|]/g, ' -')
    // Windows forbids ':' in filenames — show colon in UI but replace it with '.' in the filename
    const safeTimestampForFile = timestamp.replace(':', '.')
    a.download = `${safeTitle} - ${safeTimestampForFile}.json`
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

              // Determine scene boundaries and fill missing scene names
              let finalBoundaries: number[] = []
              if (state.sceneBoundaries && Array.isArray(state.sceneBoundaries) && state.sceneBoundaries.length > 0) {
                finalBoundaries = state.sceneBoundaries.slice()
              } else if (state.scenes && Array.isArray(state.scenes) && state.scenes.length > 0) {
                const b: number[] = []
                let acc = 0
                for (const s of state.scenes) {
                  b.push(acc)
                  const len = Array.isArray(s) ? s.length : (s.keyframes ? s.keyframes.length : 0)
                  acc += len
                }
                finalBoundaries = b
              } else {
                finalBoundaries = [0]
              }

              if (finalBoundaries.some(b => typeof b !== 'number' || b < 0 || b >= loadedKfs.length) || finalBoundaries.length === 1 && loadedKfs.length > 1) {
                const inferred = inferSceneBoundariesFromKeyframes(loadedKfs)
                if (inferred && inferred.length > 0) finalBoundaries = inferred
              }

              const rawNames: (string | null)[] = (state.sceneNames && Array.isArray(state.sceneNames)) ? state.sceneNames.slice() : []
              const finalNames: string[] = []
              for (let i = 0; i < finalBoundaries.length; i++) {
                const n = rawNames[i]
                finalNames.push(n && typeof n === 'string' ? n : `Scene ${i + 1}`)
              }

              setSceneBoundaries(finalBoundaries)
              setSceneNames(finalNames)
            } else {
              setKeyframes([])
              setKeyframeMode(false)
              setCharacters(state.characters || [])
              nextKfId.current = 1
              setSceneBoundaries([0])
              setSceneNames(['Scene 1'])
            }

            setProjectTitle(state.projectTitle || 'Untitled')
            setSceneNotes(state.sceneNotes || {})
            setKeyframeNotes(state.keyframeNotes || {})
            if (typeof state.labelFontSize === 'number') setLabelFontSize(state.labelFontSize)
            if (typeof state.noteFontSize === 'number') setNoteFontSize(state.noteFontSize)
            if (typeof state.keyframeSpeed === 'number') setKeyframeSpeed(state.keyframeSpeed)
            if (typeof state.fadeSpeed === 'number') setFadeSpeed(state.fadeSpeed)
            if (typeof state.showWings === 'boolean') setShowWings(state.showWings)
            if (state.wingSize && typeof state.wingSize.width === 'number') setWingSize(state.wingSize)
            if (state.stageOffset && typeof state.stageOffset.top === 'number') setStageOffset(state.stageOffset)

            // Load stage props (top-level or migrate from keyframes)
            if (state.stageProps && Array.isArray(state.stageProps)) {
              setStageProps(state.stageProps)
            } else if (loadedKfs.length > 0) {
              const fromKf = loadedKfs.find((kf: any) => kf.stageProps && kf.stageProps.length > 0)
              setStageProps(fromKf?.stageProps ?? [])
            } else {
              setStageProps([])
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

  // Keep file ops ref updated so keyboard handler always uses latest closures
  fileOpsRef.current = { saveToLocalStorage, loadFromLocalStorage, exportAsJSON, importFromJSON }

  /** Build the full project state object (shared by save, export, and cloud) */
  function buildProjectState() {
    let committedKfs = keyframes
    if (keyframeMode) {
      committedKfs = keyframes.map((kf, i) =>
        i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf
      )
    }
    if (editingAnnotationId) {
      const textarea = document.querySelector('textarea.z-50') as HTMLTextAreaElement | null
      const currentText = textarea ? textarea.value : null
      if (currentText !== null) {
        if (currentText.trim()) {
          committedKfs = committedKfs.map((kf, i) => i === activeKeyframeIndex ? {
            ...kf,
            annotations: (kf.annotations ?? []).map(a => a.id === editingAnnotationId ? { ...a, text: currentText } : a)
          } : kf)
        } else {
          committedKfs = committedKfs.map((kf, i) => i === activeKeyframeIndex ? {
            ...kf,
            annotations: (kf.annotations ?? []).filter(a => a.id !== editingAnnotationId)
          } : kf)
        }
      }
    }
    committedKfs = committedKfs.map(kf => ({
      ...kf,
      annotations: (kf.annotations ?? []).filter(a => a.text.trim())
    }))
    const rawSceneNames = Array.isArray(sceneNames) ? sceneNames.slice() : []
    const boundaries = Array.isArray(sceneBoundaries) && sceneBoundaries.length > 0 ? sceneBoundaries : [0]
    for (let i = 0; i < boundaries.length; i++) {
      const n = rawSceneNames[i]
      rawSceneNames[i] = (n && typeof n === 'string') ? n : `Scene ${i + 1}`
    }
    return {
      characters: JSON.parse(JSON.stringify(characters)),
      guides,
      canvasSize,
      counter,
      defaultPersonSize,
      defaultPersonColor,
      defaultShoulderColor,
      keyframes: committedKfs,
      sceneBoundaries: sceneBoundaries || [0],
      sceneNames: rawSceneNames,
      sceneIndex,
      projectTitle,
      sceneNotes,
      keyframeNotes,
      keyframeMode,
      activeKeyframeIndex,
      keyframeSpeed,
      fadeSpeed,
      labelFontSize,
      noteFontSize,
      showWings,
      wingSize,
      stageProps: JSON.parse(JSON.stringify(stageProps)),
      stageOffset
    }
  }

  /** Save current project to Supabase */
  async function saveToCloud() {
    if (cloudSaving) return
    if (!canEdit) {
      showToast('You cannot save changes to a project you don\'t own', 'info')
      return
    }
    setCloudSaving(true)
    try {
      const state = buildProjectState()
      if (currentProjectId) {
        await updateProject(currentProjectId, { title: projectTitle, data: state as Record<string, unknown> })
        showToast('Saved to cloud')
      } else {
        const row = await createProject(projectTitle, state as Record<string, unknown>)
        setCurrentProjectId(row.id)
        setIsProjectOwner(true)
        setSharePermission(null)
        showToast('Saved to cloud (new project)')
        refreshSubscription() // refresh project count after creation
      }
      // Also save to localStorage as backup
      localStorage.setItem('stageLayout', JSON.stringify(state))
    } catch (err: any) {
      const msg = err.message || ''
      if (msg === 'PROJECT_LIMIT_REACHED') {
        setUpgradeReason('limit')
        setUpgradeModalOpen(true)
      } else if (msg === 'TRIAL_EXPIRED') {
        setUpgradeReason('trial_expired')
        setUpgradeModalOpen(true)
      } else {
        showToast(msg || 'Failed to save to cloud', 'error')
      }
    } finally {
      setCloudSaving(false)
    }
  }

  /** Load a project from Supabase by id */
  async function loadProjectFromCloud(projectId: string) {
    try {
      const row = await loadProject(projectId)
      const state = row.data as any
      setCurrentProjectId(row.id)
      const isOwner = row.user_id === user.id
      setIsProjectOwner(isOwner)
      if (!isOwner) {
        const perm = await getMyPermission(row.id)
        setSharePermission(perm)
      } else {
        setSharePermission(null)
      }

      // Restore all state (same logic as loadFromLocalStorage / importFromJSON)
      setGuides(state.guides || [])
      setCanvasSize(state.canvasSize || { width: 1600, height: 900 })
      setCounter(state.counter || 0)
      setDefaultPersonSize(state.defaultPersonSize || 1)
      setDefaultPersonColor(state.defaultPersonColor || '#ffd93d')
      setDefaultShoulderColor(state.defaultShoulderColor || '#ff6b6b')

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
        let idx = state.activeKeyframeIndex ?? 0
        if (idx < 0) idx = 0
        if (idx >= loadedKfs.length) idx = loadedKfs.length - 1
        setActiveKeyframeIndex(idx)
        const maxId = Math.max(0, ...loadedKfs.map((kf: Keyframe) => kf.id || 0))
        nextKfId.current = maxId + 1

        let finalBoundaries: number[] = []
        if (state.sceneBoundaries && Array.isArray(state.sceneBoundaries) && state.sceneBoundaries.length > 0) {
          finalBoundaries = state.sceneBoundaries.slice()
        } else {
          finalBoundaries = [0]
        }
        if (finalBoundaries.some((b: number) => typeof b !== 'number' || b < 0 || b >= loadedKfs.length) || finalBoundaries.length === 1 && loadedKfs.length > 1) {
          const inferred = inferSceneBoundariesFromKeyframes(loadedKfs)
          if (inferred && inferred.length > 0) finalBoundaries = inferred
        }
        const rawNames: (string | null)[] = (state.sceneNames && Array.isArray(state.sceneNames)) ? state.sceneNames.slice() : []
        const finalNames: string[] = []
        for (let i = 0; i < finalBoundaries.length; i++) {
          const n = rawNames[i]
          finalNames.push(n && typeof n === 'string' ? n : `Scene ${i + 1}`)
        }
        setSceneBoundaries(finalBoundaries)
        setSceneNames(finalNames)
        setSceneIndex(typeof state.sceneIndex === 'number' ? state.sceneIndex : 0)
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
        setSceneBoundaries([0])
        setSceneNames(['Scene 1'])
      }

      setProjectTitle(state.projectTitle || row.title || 'Untitled')
      setSceneNotes(state.sceneNotes || {})
      setKeyframeNotes(state.keyframeNotes || {})
      if (typeof state.labelFontSize === 'number') setLabelFontSize(state.labelFontSize)
      if (typeof state.noteFontSize === 'number') setNoteFontSize(state.noteFontSize)
      if (typeof state.keyframeSpeed === 'number') setKeyframeSpeed(state.keyframeSpeed)
      if (typeof state.fadeSpeed === 'number') setFadeSpeed(state.fadeSpeed)
      if (typeof state.showWings === 'boolean') setShowWings(state.showWings)
      if (state.wingSize && typeof state.wingSize.width === 'number') setWingSize(state.wingSize)
      if (state.stageOffset && typeof state.stageOffset.top === 'number') setStageOffset(state.stageOffset)

      if (state.stageProps && Array.isArray(state.stageProps)) {
        setStageProps(state.stageProps)
      } else if (loadedKfs.length > 0) {
        const fromKf = loadedKfs.find((kf: any) => kf.stageProps && kf.stageProps.length > 0)
        setStageProps(fromKf?.stageProps ?? [])
      } else {
        setStageProps([])
      }

      setSelectedCharId(null)
      setAwaitingDirectionFor(null)
      setProjectListOpen(false)
      showToast(`Loaded "${row.title}"`)
    } catch (err: any) {
      showToast(err.message || 'Failed to load project', 'error')
    }
  }

  /** Start a new blank project (clears everything, unsets cloud project id) */
  async function newProject() {
    // Check subscription before allowing a new project
    try {
      const info = await refreshSubscription()
      if (info && !info.can_create_project) {
        setUpgradeReason('limit')
        setUpgradeModalOpen(true)
        setProjectListOpen(false)
        return
      }
    } catch (e) {
      // If we can't check, let them proceed — server will enforce on save
    }

    setCurrentProjectId(null)
    setIsProjectOwner(true)
    setSharePermission(null)
    setCharacters([])
    setKeyframes([])
    setKeyframeMode(false)
    setActiveKeyframeIndex(0)
    setSceneBoundaries([0])
    setSceneNames(['Scene 1'])
    setSceneIndex(0)
    setProjectTitle('Untitled')
    setSceneNotes({})
    setKeyframeNotes({})
    setCounter(0)
    setStageProps([])
    setSelectedCharId(null)
    setAwaitingDirectionFor(null)
    nextKfId.current = 1
    setProjectListOpen(false)
    showToast('New project created')
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
      // generate a new short id for the duplicate
      const id = String.fromCharCode(65 + (counter % 26))
      setCounter((c) => c + 1)

      // Determine a sensible duplicate name: "Original 2", "Original 3", ...
      const originalName = char.name || id
      // If originalName ends with a numeric suffix, strip it to find the root
      const trailingMatch = originalName.match(/^(.*?)(?:\s(\d+))?$/)
      const root = (trailingMatch && trailingMatch[1]) || originalName

      // collect existing suffix numbers for the same root
      const existingNums: number[] = []
      characters.forEach(c => {
        const m = c.name && c.name.match(new RegExp('^' + root.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '(?:\\s(\\d+))?$'))
        if (m) {
          if (m[1]) existingNums.push(Number(m[1]))
          else existingNums.push(1)
        }
      })
      const maxNum = existingNums.length ? Math.max(...existingNums) : 1
      const nextNum = maxNum + 1
      const newName = `${root} ${nextNum}`

      const duplicate = { ...char, id, name: newName, x: char.x + 30, y: char.y + 30 }
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

  function handleSizeChange(v: { headW: number; headH: number; shoulderW: number; shoulderH: number }) {
    setPersonSize(v)
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
    const w = canvasSize.width
    const h = canvasSize.height

    // Mirror helper: flips horizontally (mirror X) and vertically (mirror Y)
    // and adjusts facing angle so characters remain visually correct.
    // Flipping both axes is equivalent to rotating by PI (180°).
    function mirrorChars(chars: Character[]): Character[] {
      return chars.map(c => ({
        ...c,
        x: w - c.x,
        y: h - c.y,
        angle: c.angle !== undefined ? ((c.angle + Math.PI) % (Math.PI * 2)) : undefined
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
        const updatedKfs = [...keyframes.slice(0, newIndex), kf, ...keyframes.slice(newIndex)]
        const newBoundaries = (sceneBoundaries || [0]).map(b => (b < newIndex ? b : b + 1))
        if (newBoundaries.length === 0) newBoundaries.push(0)
        const relabeled = renumberKeyframes(updatedKfs, newBoundaries)
        setKeyframes(relabeled)
        setSceneBoundaries(newBoundaries)
        setActiveKeyframeIndex(newIndex)
        setCharacters(JSON.parse(JSON.stringify(kf.characters)))
        saveToHistory(kf.characters, relabeled, newIndex, newBoundaries, sceneNames)

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

  function handleCanvasSizeChange(size: { width: number; height: number }) {
    if (lockStageSize) {
      showToast('Stage size is locked', 'info')
      return
    }
    // Use stage area size (without wing offset) for centering calculations
    const oldW = canvasSize.width
    const oldH = canvasSize.height
    const oldCx = oldW / 2
    const oldCy = oldH / 2
    const newCx = size.width / 2
    const newCy = size.height / 2
    const deltaX = newCx - oldCx
    const deltaY = newCy - oldCy

    const shiftedChars = characters.map(c => ({ ...c, x: c.x + deltaX, y: c.y + deltaY }))
    setCharacters(shiftedChars)

    if (keyframes && keyframes.length > 0) {
      const shiftedKfs = keyframes.map(kf => ({
        ...kf,
        characters: kf.characters.map(c => ({ ...c, x: c.x + deltaX, y: c.y + deltaY }))
      }))
      setKeyframes(shiftedKfs)
      // save history with keyframes updated
      saveToHistory(shiftedChars, shiftedKfs, activeKeyframeIndex)
    } else {
      saveToHistory(shiftedChars)
    }

    setCanvasSize(size)
  }

  return (
    <div className="app" style={{ paddingTop: `${stageOffset.top}rem`, paddingRight: `${stageOffset.right}rem`, paddingBottom: `${stageOffset.bottom}rem`, paddingLeft: `${stageOffset.left}rem` }}>
      {/* Collapsible Sidebar Dock (Overlay) */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentProjectId={currentProjectId}
        onSelectProject={loadProjectFromCloud}
        onNewProject={newProject}
      />

      {/* Main Content Area (Full width, sidebar overlays on top) */}
      <div className="flex-1 flex flex-col min-w-0 relative pt-8 justify-between items-center w-full">
        <div style={{ width: '100%', maxWidth: totalCanvasWidth + 'px', margin: '0 auto' }}>
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
          onCanvasSizeChange={handleCanvasSizeChange}
          lockStageSize={lockStageSize}
          setLockStageSize={setLockStageSize}
          lockKeyframeTiming={lockKeyframeTiming}
          setLockKeyframeTiming={setLockKeyframeTiming}
          defaultPersonSize={defaultPersonSize}
          personSize={personSize}
          defaultPersonColor={defaultPersonColor}
          defaultShoulderColor={defaultShoulderColor}
          onSizeChange={handleSizeChange}
          onColorChange={handleColorChange}
          stageReversed={stageReversed}
          onToggleReverse={handleToggleReverse}
          labelFontSize={labelFontSize}
          onLabelFontSizeChange={setLabelFontSize}
          noteFontSize={noteFontSize}
          onNoteFontSizeChange={setNoteFontSize}
          showWings={showWings}
          setShowWings={setShowWings}
          wingSize={wingSize}
          onWingSizeChange={setWingSize}
          lockWingSize={lockWingSize}
          setLockWingSize={setLockWingSize}
          preventOverlap={preventOverlap}
          setPreventOverlap={setPreventOverlap}
          stageOffset={stageOffset}
          onStageOffsetChange={setStageOffset}
          lockStageOffset={lockStageOffset}
          setLockStageOffset={setLockStageOffset}
          fileMenuOpen={fileMenuOpen}
          setFileMenuOpen={setFileMenuOpen}
          onSave={() => fileOpsRef.current.saveToLocalStorage()}
          onLoad={() => fileOpsRef.current.loadFromLocalStorage()}
          onExportJSON={() => {
            if (subscriptionInfo?.status === 'pro') fileOpsRef.current.exportAsJSON()
            else { setUpgradeReason('feature'); setUpgradeModalOpen(true); }
          }}
          onImportJSON={() => fileOpsRef.current.importFromJSON()}
          onExportPNG={() => {
            if (subscriptionInfo?.status === 'pro') exportAsImage()
            else { setUpgradeReason('feature'); setUpgradeModalOpen(true); }
          }}
          onCloudSave={saveToCloud}
          onOpenProjects={() => setProjectListOpen(true)}
          onShareProject={() => {
            if (subscriptionInfo?.status !== 'pro') {
              setUpgradeReason('feature')
              setUpgradeModalOpen(true)
              return
            }
            if (!currentProjectId) {
              showToast('Save the project to cloud first before sharing', 'info')
              return
            }
            if (!isProjectOwner) {
              showToast('Only the project owner can manage sharing', 'info')
              return
            }
            setShareModalOpen(true)
          }}
          canShare={!!currentProjectId && isProjectOwner}
          readOnly={!canEdit && !!currentProjectId}
          cloudSaving={cloudSaving}
          subscriptionInfo={subscriptionInfo || undefined}
          usageSecondsRemaining={usageSecondsRemaining}
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
          sceneCount={sceneBoundaries.length}
          isPlaying={isPlaying}
          onSelectKeyframe={selectKeyframe}
          onAddKeyframe={addKeyframe}
          onDeleteKeyframe={deleteKeyframe}
          onRenameKeyframe={renameKeyframe}
          onPlay={startPlayback}
          onPlaySingle={startPlaybackSingle}
          onPlayAll={startPlaybackAll}
          onStop={stopPlayback}
          onPrev={goToPrevKeyframe}
          onNext={goToNextKeyframe}
          onUpdateCharVisible={handleUpdateCharVisible}
          keyframeSpeed={keyframeSpeed}
          onKeyframeSpeedChange={(s: number) => {
            if (lockKeyframeTiming) { showToast('Keyframe timing is locked', 'info'); return }
            setKeyframeSpeed(s)
          }}
          fadeSpeed={fadeSpeed}
          onFadeSpeedChange={(s: number) => {
            if (lockKeyframeTiming) { showToast('Keyframe timing is locked', 'info'); return }
            setFadeSpeed(s)
          }}
          projectTitle={projectTitle}
          onProjectTitleChange={(t: string) => { setProjectTitle(t); try { localStorage.setItem('stageProjectTitle', t) } catch (e) {} }}
          sceneNotes={sceneNotes}
          keyframeNotes={keyframeNotes}
          noteMode={noteMode}
          onToggleNoteMode={() => {
            if (noteMode) {
              commitEditingAnnotation()
              setSelectedAnnotationId(null)
            }
            setNoteMode(prev => !prev)
          }}
          propsMode={propsMode}
          selectedPropId={selectedPropId}
          onDeselectChar={() => setSelectedCharId(null)}
          onTogglePropsMode={() => {
            if (!propsMode) {
              // Entering props mode — exit add char mode and keyframe mode
              setAddMode(false)
              setAwaitingDirectionFor(null)
              setSelectedCharId(null)
              if (keyframeMode) {
                stopPlayback()
                setKeyframes(prev => prev.map((kf, i) =>
                  i === activeKeyframeIndex ? { ...kf, characters: JSON.parse(JSON.stringify(characters)) } : kf
                ))
                setKeyframeMode(false)
              }
            }
            setPropsMode(prev => !prev)
            setSelectedPropId(null)
          }}
          />
        </div>
        <div className="inline-block relative" style={{ width: '100%', maxWidth: totalCanvasWidth + 'px', marginBottom: 24, cursor: noteMode ? 'crosshair' : undefined }} id="annotation-canvas-wrapper">
          <StageCanvas
            canvasRef={canvasRef}
            canvasSize={{ width: totalCanvasWidth, height: canvasSize.height }}
            onClick={handleCanvasClick}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
          />
          {/* Annotation editing overlay */}
          {editingAnnotationId && (() => {
            const ann = (keyframes[activeKeyframeIndex]?.annotations ?? []).find(a => a.id === editingAnnotationId)
            if (!ann) return null
            return (
              <textarea
                key={ann.id}
                autoFocus
                className="absolute z-50 outline-none resize-none border-2 border-blue-500 bg-white/90 rounded px-1"
                style={{
                  left: ann.x + wingOffset,
                  top: ann.y + 24, // offset for StageCanvas margin-top (24px inside <main>)
                  width: ann.width,
                  minHeight: 28,
                  fontSize: ann.fontSize,
                  fontFamily: '"Inter", sans-serif',
                  color: ann.color || '#000',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                }}
                ref={(el) => {
                  // Auto-expand height to fit content and place cursor at end
                  if (el) {
                    el.style.height = 'auto'
                    el.style.height = el.scrollHeight + 'px'
                    el.setSelectionRange(el.value.length, el.value.length)
                  }
                }}
                value={ann.text}
                onChange={(e) => {
                  updateAnnotation(ann.id, { text: e.target.value })
                  // Auto-expand on content change
                  const el = e.target
                  el.style.height = 'auto'
                  el.style.height = el.scrollHeight + 'px'
                }}
                onBlur={(e) => {
                  // Read text directly from the DOM element (closure `ann.text` can be stale)
                  const currentText = e.target.value
                  if (!currentText.trim()) {
                    deleteAnnotation(ann.id)
                  } else {
                    // Commit the latest text to state in case the last onChange hasn't settled
                    updateAnnotation(ann.id, { text: currentText })
                    setEditingAnnotationId(null)
                  }
                  // Prevent the click that caused the blur from creating a new annotation
                  skipNextClickRef.current = true
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    if (!ann.text.trim()) deleteAnnotation(ann.id)
                    else setEditingAnnotationId(null)
                  }
                  e.stopPropagation()
                }}
              />
            )
          })()}
          {/* Note mode cursor hint */}
          {noteMode && keyframeMode && (
            <div className="absolute top-1 left-1 z-40 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded shadow-sm" style={{ marginTop: 24 }}>
              Note Mode — click to place text (N to exit, Esc to cancel)
            </div>
          )}
          {/* Props mode shape picker */}
          {propsMode && (
            <div className="absolute top-1 left-1 z-40 flex items-center gap-1.5 px-1.5 py-1 bg-orange-50 border border-orange-200 text-orange-800 text-[11px] rounded shadow-sm" style={{ marginTop: noteMode ? 52 : 24 }}>
              <span className="font-medium">Props:</span>
              {PROP_SHAPES.map((shape, i) => (
                <button
                  key={shape}
                  onClick={() => setPropShapeIndex(i)}
                  className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                    propShapeIndex === i
                      ? 'bg-orange-500 text-white border-orange-600'
                      : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-100'
                  }`}
                  title={shape.charAt(0).toUpperCase() + shape.slice(1)}
                >
                  {shape === 'rect' && (
                    <svg width="10" height="10" viewBox="0 0 14 14"><rect x="1" y="2" width="12" height="10" fill="currentColor" rx="1" /></svg>
                  )}
                  {shape === 'circle' && (
                    <svg width="10" height="10" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="currentColor" /></svg>
                  )}
                  {shape === 'triangle' && (
                    <svg width="10" height="10" viewBox="0 0 14 14"><polygon points="7,1 13,13 1,13" fill="currentColor" /></svg>
                  )}
                </button>
              ))}
              <span className="ml-0.5 text-[9px] text-orange-600">Click to place · Esc to exit</span>
            </div>
          )}
          {/* Offstage Props panel (left side) */}
          {canEdit && stageProps.length > 0 && (
            <div className="absolute right-full mr-2 z-40" style={{ top: 40, minWidth: 100 }}>
              <div className="text-xs text-muted-foreground">Props</div>
              <div className="mt-2 flex flex-col gap-1.5">
                {stageProps.filter(p => p.visible === false).length > 0 && (
                  <div className="text-xs text-muted-foreground mb-1 italic">Offstage:</div>
                )}
                {stageProps.filter(p => p.visible === false).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded px-2 py-1 bg-transparent cursor-pointer hover:bg-gray-100"
                    style={{ userSelect: 'none' }}
                    onClick={() => {
                      updateStageProp(p.id, { visible: true, x: canvasSize.width / 2 - p.width / 2, y: canvasSize.height / 2 - p.height / 2 })
                    }}
                    title="Click to bring on stage"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" className="flex-shrink-0">
                      {p.shape === 'rect' && <rect x="2" y="2" width="20" height="20" fill={p.color} opacity={0.7} stroke="#666" strokeWidth="1" />}
                      {p.shape === 'circle' && <ellipse cx="12" cy="12" rx="10" ry="10" fill={p.color} opacity={0.7} stroke="#666" strokeWidth="1" />}
                      {p.shape === 'triangle' && <polygon points="12,2 22,22 2,22" fill={p.color} opacity={0.7} stroke="#666" strokeWidth="1" />}
                    </svg>
                    <div className="text-xs text-foreground">{p.name}</div>
                  </div>
                ))}
                {/* Selected prop controls */}
                {selectedPropId && propsMode && (() => {
                  const sp = stageProps.find(p => p.id === selectedPropId)
                  if (!sp || sp.visible === false) return null
                  return (
                    <div className="mt-2 border-t pt-2 space-y-1.5">
                      <div className="text-xs font-semibold text-muted-foreground">Selected Prop</div>
                      <input
                        className="w-full text-xs rounded border px-1 py-0.5"
                        value={sp.name}
                        onChange={(e) => updateStageProp(sp.id, { name: e.target.value })}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Prop name"
                      />
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-muted-foreground">Shape:</label>
                        {(['rect', 'circle', 'triangle'] as const).map(s => (
                          <button key={s} className={`text-xs px-1.5 py-0.5 rounded border ${sp.shape === s ? 'bg-blue-100 border-blue-400' : 'border-gray-300'}`}
                            onClick={() => updateStageProp(sp.id, { shape: s })}
                          >{s === 'rect' ? '▬' : s === 'circle' ? '●' : '▲'}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-muted-foreground">Color:</label>
                        <input type="color" value={sp.color} onChange={(e) => updateStageProp(sp.id, { color: e.target.value })} className="w-6 h-6 border-0 p-0 cursor-pointer" />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-muted-foreground">W:</label>
                        <input type="number" value={sp.width} min={10} max={500} className="w-12 text-xs rounded border px-1 py-0.5" onChange={(e) => updateStageProp(sp.id, { width: Number(e.target.value) || 60 })} onKeyDown={(e) => e.stopPropagation()} />
                        <label className="text-xs text-muted-foreground">H:</label>
                        <input type="number" value={sp.height} min={10} max={500} className="w-12 text-xs rounded border px-1 py-0.5" onChange={(e) => updateStageProp(sp.id, { height: Number(e.target.value) || 60 })} onKeyDown={(e) => e.stopPropagation()} />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-muted-foreground">Rot:</label>
                        <input type="number" value={Math.round(sp.rotation ?? 0)} min={0} max={359} className="w-12 text-xs rounded border px-1 py-0.5" onChange={(e) => updateStageProp(sp.id, { rotation: ((Number(e.target.value) || 0) % 360 + 360) % 360 })} onKeyDown={(e) => e.stopPropagation()} />
                        <span className="text-[10px] text-muted-foreground">°</span>
                        <button className="text-[10px] px-1 py-0.5 rounded border border-gray-300 hover:bg-gray-100 text-muted-foreground" onClick={() => updateStageProp(sp.id, { rotation: 0 })} title="Reset rotation">↺</button>
                      </div>
                      <div className="flex gap-1">
                        <button className="text-xs px-1.5 py-0.5 rounded border border-gray-300 hover:bg-gray-100" onClick={() => updateStageProp(sp.id, { visible: false })} title="Send offstage">Offstage</button>
                        <button className="text-xs px-1.5 py-0.5 rounded border border-red-300 text-red-600 hover:bg-red-50" onClick={() => deleteStageProp(sp.id)} title="Delete prop">Delete</button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
          {canEdit && <div className="absolute left-full ml-2 z-40" style={{ top: 40 }}>
            <div className="text-xs text-muted-foreground">Offstage</div>
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
                      const scale = 18 / Math.max(personSize.headW, personSize.shoulderW)
                      const shoulderRx = personSize.shoulderW / 2 * scale
                      const shoulderRy = personSize.shoulderH / 2 * scale
                      const headRx = personSize.headW / 2 * scale
                      const headRy = personSize.headH / 2 * scale
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
          </div>}
        </div>
        {/* Stage Notes — 3-column text areas below stage */}
        {canEdit && keyframeMode && keyframes.length > 0 && (() => {
          const kf = keyframes[activeKeyframeIndex]
          if (!kf) return null
          const notes = kf.stageNotes ?? { left: '', center: '', right: '' }
          const updateStageNote = (position: 'left' | 'center' | 'right', value: string) => {
            const updatedKfs = keyframes.map((k, i) =>
              i === activeKeyframeIndex
                ? { ...k, stageNotes: { ...(k.stageNotes ?? { left: '', center: '', right: '' }), [position]: value } }
                : k
            )
            setKeyframes(updatedKfs)
          }
          return (
            <div style={{ width: '100%', maxWidth: totalCanvasWidth + 'px', display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['left', 'center', 'right'] as const).map((pos) => (
                <div key={pos} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <textarea
                    className="w-full rounded border border-gray-300 bg-white/80 px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                    style={{ minHeight: 48, fontFamily: '"Inter", sans-serif', overflow: 'hidden' }}
                    placeholder={`Notes for ${pos === 'left' ? 'stage left' : pos === 'center' ? 'center stage' : 'stage right'}...`}
                    value={notes[pos]}
                    onChange={(e) => {
                      updateStageNote(pos, e.target.value)
                      // Auto-expand height
                      e.target.style.height = 'auto'
                      e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                    ref={(el) => {
                      // Auto-expand on mount/update
                      if (el) {
                        el.style.height = 'auto'
                        el.style.height = el.scrollHeight + 'px'
                      }
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
          )
        })()}
        <ToastContainer toast={toast} />
      </div>
      <ProjectListModal
        isOpen={projectListOpen}
        onClose={() => setProjectListOpen(false)}
        onSelect={loadProjectFromCloud}
        onNew={newProject}
        currentProjectId={currentProjectId}
      />
      {currentProjectId && isProjectOwner && (
        <ShareProjectModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          projectId={currentProjectId}
          projectTitle={projectTitle}
        />
      )}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        subscriptionInfo={subscriptionInfo}
        onSubscriptionChange={refreshSubscription}
        reason={upgradeReason}
      />
    </div>
  )
}
