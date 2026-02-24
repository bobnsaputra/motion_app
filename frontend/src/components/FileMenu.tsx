import React from 'react'

interface FileMenuProps {
  isOpen: boolean
  onSave: () => void
  onLoad: () => void
  onExportJSON: () => void
  onImportJSON: () => void
  onExportPNG: () => void
  onClose: () => void
}

export default function FileMenu({
  isOpen,
  onSave,
  onLoad,
  onExportJSON,
  onImportJSON,
  onExportPNG,
  onClose
}: FileMenuProps) {
  if (!isOpen) return null

  const menuRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleClick = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <div ref={menuRef} className="absolute right-0 top-full mt-1 w-56 animate-in fade-in slide-in-from-top-1 rounded-lg border border-border bg-white p-3 shadow-lg text-sm z-50">
      <button onClick={() => handleClick(onSave)} className="w-full text-left px-3 py-2 hover:bg-accent/10"><span><u>S</u>ave</span></button>
      <button onClick={() => handleClick(onLoad)} className="w-full text-left px-3 py-2 hover:bg-accent/10"><span><u>L</u>oad</span></button>
      <button onClick={() => handleClick(onExportJSON)} className="w-full text-left px-3 py-2 hover:bg-accent/10"><span>E<u>x</u>port JSON</span></button>
      <button onClick={() => handleClick(onImportJSON)} className="w-full text-left px-3 py-2 hover:bg-accent/10"><span><u>M</u>port JSON</span></button>
      <button onClick={() => handleClick(onExportPNG)} className="w-full text-left px-3 py-2 hover:bg-accent/10">Export PNG</button>
    </div>
  )
}
