import React from 'react'

interface StageCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  canvasSize: { width: number; height: number }
  onClick: (e: React.MouseEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
}

export default function StageCanvas({
  canvasRef,
  canvasSize,
  onClick,
  onMouseDown,
  onMouseMove
  , onDrop, onDragOver
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
        onDrop={onDrop}
        onDragOver={onDragOver}
      />
    </main>
  )
}
