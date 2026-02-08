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

  const handleClick = (action: () => void) => {
    action()
    onClose()
  }

  return (
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
      <button onClick={() => handleClick(onSave)} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>Save</button>
      <button onClick={() => handleClick(onLoad)} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>Load</button>
      <button onClick={() => handleClick(onExportJSON)} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>Export JSON</button>
      <button onClick={() => handleClick(onImportJSON)} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>Import JSON</button>
      <button onClick={() => handleClick(onExportPNG)} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>Export PNG</button>
    </div>
  )
}
