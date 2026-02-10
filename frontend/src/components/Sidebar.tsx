import React from 'react'
import { PanelLeft } from 'lucide-react'

interface SidebarProps {
    isOpen: boolean
    onToggle: () => void
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
    return (
        <div
            className={`fixed left-0 top-0 h-screen z-50 flex flex-col border-r border-border/50 bg-gradient-to-b from-yellow-50 to-white shadow-xl transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-12'
                }`}
        >
            <div className="p-2 flex items-center justify-center border-b border-border/20">
                <button
                    onClick={onToggle}
                    className="p-2 rounded-md hover:bg-yellow-100 text-muted-foreground hover:text-yellow-700 transition-colors"
                    title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                    <PanelLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Sidebar Content (Hidden when collapsed) */}
            <div className={`flex-1 overflow-hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 invisible'}`}>
                <div className="p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Library</p>
                    {/* Future library content here */}
                </div>
            </div>
        </div>
    )
}
