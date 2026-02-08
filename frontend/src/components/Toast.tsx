import React, { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
  fading: boolean
}

let nextId = 0

interface ToastContainerProps {
  toast: { message: string; type: ToastType; key: number } | null
}

export default function ToastContainer({ toast }: ToastContainerProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    if (!toast) return
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message: toast.message, type: toast.type, fading: false }])

    // Start fade out
    const fadeTimer = setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, fading: true } : t)))
    }, 2200)

    // Remove
    const removeTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2700)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [toast])

  if (toasts.length === 0) return null

  const colors: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
    info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none'
    }}>
      {toasts.map((t) => {
        const c = colors[t.type]
        return (
          <div
            key={t.id}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.text,
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              opacity: t.fading ? 0 : 1,
              transform: t.fading ? 'translateX(20px)' : 'translateX(0)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
              pointerEvents: 'auto'
            }}
          >
            {t.type === 'success' && '✓ '}
            {t.type === 'error' && '✕ '}
            {t.type === 'info' && 'ℹ '}
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
