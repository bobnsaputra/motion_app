import React from 'react'

interface StageCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  canvasSize: { width: number; height: number }
  onClick: (e: React.MouseEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
}

export default function StageCanvas({
  canvasRef,
  canvasSize,
  onClick,
  onMouseDown,
  onMouseMove
}: StageCanvasProps) {
  return (
    <main style={{ marginTop: 24 }}>
      <canvas
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        width={canvasSize.width}
        height={canvasSize.height}
        className="stage"
        onClick={onClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
      />
    </main>
  )
}
