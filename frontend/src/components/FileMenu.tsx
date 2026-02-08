import React, { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Save, FolderOpen, FileJson, Download, Image
} from 'lucide-react'

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
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleClick = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-50 mt-1 w-48 animate-in fade-in slide-in-from-top-1 rounded-lg border border-border bg-white p-1 shadow-lg"
    >
      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => handleClick(onSave)}>
        <Save className="h-4 w-4 text-muted-foreground" /> Save
      </Button>
      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => handleClick(onLoad)}>
        <FolderOpen className="h-4 w-4 text-muted-foreground" /> Load
      </Button>
      <div className="my-1 h-px bg-border" />
      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => handleClick(onExportJSON)}>
        <Download className="h-4 w-4 text-muted-foreground" /> Export JSON
      </Button>
      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => handleClick(onImportJSON)}>
        <FileJson className="h-4 w-4 text-muted-foreground" /> Import JSON
      </Button>
      <div className="my-1 h-px bg-border" />
      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => handleClick(onExportPNG)}>
        <Image className="h-4 w-4 text-muted-foreground" /> Export PNG
      </Button>
    </div>
  )
}
