import React from 'react'

interface FileMenuProps {
  isOpen: boolean
  onSave: () => void
  onLoad: () => void
  onExportJSON: () => void
  onImportJSON: () => void
  onExportPNG: () => void
  onClose: () => void
  onCloudSave: () => void
  onOpenProjects: () => void
  cloudSaving?: boolean
}

export default function FileMenu({
  isOpen,
  onSave,
  onLoad,
  onExportJSON,
  onImportJSON,
  onExportPNG,
  onClose,
  onCloudSave,
  onOpenProjects,
  cloudSaving
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
      <button onClick={() => handleClick(onCloudSave)} disabled={cloudSaving} className="w-full text-left px-3 py-2 hover:bg-accent/10 disabled:opacity-50 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="M9 15l3-3 3 3"/><path d="M12 12v9"/></svg>
        <span>{cloudSaving ? 'Saving…' : 'Save to Cloud'}</span>
      </button>
      <button onClick={() => handleClick(onOpenProjects)} className="w-full text-left px-3 py-2 hover:bg-accent/10 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
        <span>My Projects</span>
      </button>
      <div className="border-t border-gray-200 my-1.5" />
      <button onClick={() => handleClick(onSave)} className="w-full text-left px-3 py-2 hover:bg-accent/10"><span><u>S</u>ave Local</span></button>
      <button onClick={() => handleClick(onLoad)} className="w-full text-left px-3 py-2 hover:bg-accent/10"><span><u>L</u>oad Local</span></button>
      <button onClick={() => handleClick(onExportJSON)} className="w-full text-left px-3 py-2 hover:bg-accent/10"><span>E<u>x</u>port JSON</span></button>
      <button onClick={() => handleClick(onImportJSON)} className="w-full text-left px-3 py-2 hover:bg-accent/10"><span>I<u>m</u>port JSON</span></button>
      <button onClick={() => handleClick(onExportPNG)} className="w-full text-left px-3 py-2 hover:bg-accent/10">Export PNG</button>
    </div>
  )
}
