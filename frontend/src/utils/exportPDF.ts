import jsPDF from 'jspdf'
import type { Character, Keyframe, StageProp, TextAnnotation } from '../types'

interface ExportPDFOptions {
  projectTitle: string
  keyframes: Keyframe[]
  sceneBoundaries: number[]
  sceneNames: string[]
  stageProps: StageProp[]
  canvasSize: { width: number; height: number }
  personSize: { headW: number; headH: number; shoulderW: number; shoulderH: number }
  showWings: boolean
  wingSize: { width: number; height: number }
  stageReversed: boolean
  labelFontSize: number
}

// ── Offscreen canvas rendering (mirrors the main draw logic) ──

function drawStageToCanvas(
  opts: ExportPDFOptions,
  keyframe: Keyframe,
): HTMLCanvasElement {
  const { canvasSize, showWings, wingSize, personSize, stageReversed, labelFontSize } = opts
  const wingOffset = showWings ? Math.min(wingSize.width, 500) : 0
  const totalWidth = canvasSize.width + 2 * wingOffset
  const totalHeight = canvasSize.height

  const canvas = document.createElement('canvas')
  canvas.width = totalWidth
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')!

  // White background for print
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, totalWidth, totalHeight)

  // Stage border
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2
  ctx.strokeRect(wingOffset, 0, canvasSize.width, canvasSize.height)

  // Wing areas
  if (showWings && wingOffset > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)'
    const wh = Math.min(wingSize.height, totalHeight)
    ctx.fillRect(0, 0, wingOffset, wh)
    ctx.fillRect(totalWidth - wingOffset, 0, wingOffset, wh)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(wingOffset, 0); ctx.lineTo(wingOffset, wh); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(totalWidth - wingOffset, 0); ctx.lineTo(totalWidth - wingOffset, wh); ctx.stroke()
    ctx.setLineDash([])
  }

  // Translate for stage area
  ctx.save()
  ctx.translate(wingOffset, 0)

  // Stage / Audience labels
  ctx.font = `600 ${labelFontSize}px "Inter", sans-serif`
  ctx.letterSpacing = '12px'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#94a3b8'
  const topLabel = stageReversed ? 'A U D I E N C E' : 'S T A G E'
  const bottomLabel = stageReversed ? 'S T A G E' : 'A U D I E N C E'
  ctx.fillText(topLabel, canvasSize.width / 2, 30 + labelFontSize)
  ctx.fillText(bottomLabel, canvasSize.width / 2, canvasSize.height - 15)

  // Props
  const props = keyframe.stageProps ?? opts.stageProps
  props.forEach((prop) => {
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

    ctx.restore()
  })

  // Text annotations (drawn before characters so characters appear on top)
  const annotations = keyframe.annotations ?? []
  annotations.forEach((ann) => {
    ctx.save()
    ctx.font = `${ann.fontSize}px "Inter", sans-serif`
    const lines = wrapText(ctx, ann.text, ann.width)
    const lineHeight = ann.fontSize * 1.3
    const textH = lines.length * lineHeight
    const pad = 6

    // Background box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.fillRect(ann.x - pad, ann.y - pad, ann.width + pad * 2, textH + pad * 2)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.lineWidth = 1
    ctx.strokeRect(ann.x - pad, ann.y - pad, ann.width + pad * 2, textH + pad * 2)

    // Text
    ctx.fillStyle = ann.color || '#333'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    lines.forEach((line, li) => {
      ctx.fillText(line, ann.x, ann.y + li * lineHeight)
    })
    ctx.restore()
  })

  // Characters (drawn after annotations so they appear on top)
  keyframe.characters.forEach((char) => {
    if (char.visible === false) return
    const angle = char.angle ?? 0

    const headRx = personSize.headW / 2
    const headRy = personSize.headH / 2
    const shoulderRx = personSize.shoulderW / 2
    const shoulderRy = personSize.shoulderH / 2
    const shoulderDist = headRy * 0.45
    const shoulderX = char.x - Math.cos(angle) * shoulderDist
    const shoulderY = char.y - Math.sin(angle) * shoulderDist
    const eyeOffsetAngle = (char.eyeOffset ?? 0) + angle
    const shouldersUnder = Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle))

    // Shoulder (behind head when facing up/down)
    if (shouldersUnder) {
      ctx.save()
      ctx.translate(shoulderX, shoulderY)
      ctx.beginPath()
      ctx.ellipse(0, 0, shoulderRx, shoulderRy, 0, 0, Math.PI * 2)
      ctx.fillStyle = char.shoulderColor || '#ff6b6b'
      ctx.fill()
      ctx.restore()
    }

    // Head
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

    // Shoulder (in front when facing left/right)
    if (!shouldersUnder) {
      ctx.save()
      ctx.translate(shoulderX, shoulderY)
      ctx.beginPath()
      ctx.ellipse(0, 0, shoulderRx, shoulderRy, 0, 0, Math.PI * 2)
      ctx.fillStyle = char.shoulderColor || '#ff6b6b'
      ctx.fill()
      ctx.restore()
    }

    // Gaze line
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

    // Name label
    ctx.fillStyle = '#000'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(char.name, char.x, char.y)
  })

  ctx.restore()
  return canvas
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

// ── PDF generation ──

export async function exportPDF(opts: ExportPDFOptions): Promise<void> {
  const { projectTitle, keyframes, sceneBoundaries, sceneNames } = opts

  if (keyframes.length === 0) return

  // Landscape A4: 297mm × 210mm
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = 297
  const pageH = 210
  const margin = 12

  // Build scene info
  const scenes: { name: string; startIdx: number; endIdx: number }[] = []
  for (let s = 0; s < sceneBoundaries.length; s++) {
    const start = sceneBoundaries[s]
    const end = s + 1 < sceneBoundaries.length ? sceneBoundaries[s + 1] : keyframes.length
    scenes.push({
      name: sceneNames[s] || `Scene ${s + 1}`,
      startIdx: start,
      endIdx: end,
    })
  }

  // ── PAGE 1: Title page ──
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(32)
  pdf.text(projectTitle || 'Untitled', pageW / 2, 60, { align: 'center' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(14)
  pdf.text('Rehearsal Packet', pageW / 2, 74, { align: 'center' })

  pdf.setFontSize(11)
  pdf.setTextColor(120, 120, 120)
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  pdf.text(dateStr, pageW / 2, 86, { align: 'center' })

  // Scene directory
  pdf.setTextColor(0, 0, 0)
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Scenes', pageW / 2, 110, { align: 'center' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  let dirY = 120
  scenes.forEach((scene, i) => {
    const kfCount = scene.endIdx - scene.startIdx
    pdf.text(`${i + 1}. ${scene.name}  —  ${kfCount} keyframe${kfCount !== 1 ? 's' : ''}`, pageW / 2, dirY, { align: 'center' })
    dirY += 7
  })

  // Cast list
  const allChars = new Map<string, Character>()
  keyframes.forEach(kf => kf.characters.forEach(c => { if (!allChars.has(c.id)) allChars.set(c.id, c) }))
  if (allChars.size > 0) {
    dirY += 6
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.text('Cast', pageW / 2, dirY, { align: 'center' })
    dirY += 10
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    const chars = Array.from(allChars.values())
    const cols = 4
    const colW = (pageW - margin * 2) / cols
    chars.forEach((c, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = margin + col * colW + colW / 2
      const y = dirY + row * 6
      pdf.text(c.name, x, y, { align: 'center' })
    })
  }

  // ── KEYFRAME PAGES ──
  for (let s = 0; s < scenes.length; s++) {
    const scene = scenes[s]
    for (let ki = scene.startIdx; ki < scene.endIdx; ki++) {
      const kf = keyframes[ki]
      const localIdx = ki - scene.startIdx + 1
      pdf.addPage()

      // Header
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      pdf.text(`${scene.name}  ·  Keyframe ${localIdx}`, margin, margin + 5)

      // Subtitle with project title (right-aligned)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(120, 120, 120)
      pdf.text(projectTitle || 'Untitled', pageW - margin, margin + 5, { align: 'right' })

      // Thin rule below header
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.3)
      pdf.line(margin, margin + 8, pageW - margin, margin + 8)

      // Draw stage diagram
      const stageCanvas = drawStageToCanvas(opts, kf)
      const imgData = stageCanvas.toDataURL('image/png')

      // Fit the stage image into the available area
      const imgAreaTop = margin + 12
      const notesHeight = 30 // reserved for notes at the bottom
      const imgAreaHeight = pageH - imgAreaTop - notesHeight - margin
      const imgAreaWidth = pageW - margin * 2
      const scale = Math.min(imgAreaWidth / stageCanvas.width, imgAreaHeight / stageCanvas.height)
      const imgW = stageCanvas.width * scale
      const imgH = stageCanvas.height * scale
      const imgX = margin + (imgAreaWidth - imgW) / 2

      pdf.addImage(imgData, 'PNG', imgX, imgAreaTop, imgW, imgH)

      // Stage notes below the diagram
      const notes = kf.stageNotes ?? { left: '', center: '', right: '' }
      const hasNotes = notes.left || notes.center || notes.right

      if (hasNotes) {
        const notesY = imgAreaTop + imgH + 4
        const thirdW = (pageW - margin * 2) / 3

        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(100, 100, 100)
        pdf.text('SL', margin + thirdW * 0.5, notesY, { align: 'center' })
        pdf.text('CS', margin + thirdW * 1.5, notesY, { align: 'center' })
        pdf.text('SR', margin + thirdW * 2.5, notesY, { align: 'center' })

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(50, 50, 50)
        const noteTop = notesY + 5

        if (notes.left) {
          const leftLines = pdf.splitTextToSize(notes.left, thirdW - 4)
          pdf.text(leftLines, margin + 2, noteTop)
        }
        if (notes.center) {
          const centerLines = pdf.splitTextToSize(notes.center, thirdW - 4)
          pdf.text(centerLines, margin + thirdW + 2, noteTop)
        }
        if (notes.right) {
          const rightLines = pdf.splitTextToSize(notes.right, thirdW - 4)
          pdf.text(rightLines, margin + thirdW * 2 + 2, noteTop)
        }
      }

      // Character legend at bottom
      const visibleChars = kf.characters.filter(c => c.visible !== false)
      if (visibleChars.length > 0) {
        const legendY = pageH - margin
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(130, 130, 130)
        const legend = visibleChars.map(c => c.name).join('  ·  ')
        pdf.text(legend, pageW / 2, legendY, { align: 'center' })
      }
    }
  }

  // Save
  const filename = (projectTitle || 'Untitled').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'rehearsal-packet'
  pdf.save(`${filename}.pdf`)
}
