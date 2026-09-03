'use client'

import React, { useEffect } from 'react'
import { Info, X, Cpu, Server, Database, Layers, Clock, Activity } from 'lucide-react'

interface FreeTierInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FreeTierInfoModal({ isOpen, onClose }: FreeTierInfoModalProps) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const techStack = [
    { label: 'Frontend', text: 'Next.js (React), Tailwind CSS, Recharts, Vercel' },
    { label: 'Backend & ML', text: 'Python, FastAPI, XGBoost, Scikit-Learn, Render' },
    { label: 'Database & Cache', text: 'Supabase (PostgreSQL), Upstash (Redis)' },
  ]

  return (
    <div 
      className="fixed inset-[#0] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-[#0f1117] border border-[#1e2130] rounded-xl shadow-2xl overflow-hidden text-gray-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2130] bg-[#141722]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 text-[#f97316]">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono text-base font-bold tracking-wide text-white uppercase">
                About NBA Game Analytics
              </h3>
              <p className="text-xs text-gray-400 font-mono">Overview, Tech Stack & Free Tier Info</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1e2130] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm leading-relaxed max-h-[75vh] overflow-y-auto">
          {/* Section 1: Purpose & Overview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#f97316] font-mono text-xs font-bold uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              <span>About & How To Use</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed bg-[#080a0e] p-4 border border-[#1e2130] rounded-lg">
              This is a personal project created to combine my interest in computer science, data science, analytics, machine learning, and the NBA. Using this web application, you can select past NBA games and watch it play out in real time. The dashboard updates live scores, team statistics, machine learning driven win probability, and momentum for each team as the game goes on, offering a deeper, data driven understanding of how games unfold.
            </p>
          </div>

          {/* Section 2: Tools & Tech Stack */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              <span>Technologies & Tools Used</span>
            </div>
            <div className="grid grid-cols-1 gap-2 bg-[#080a0e] p-3 border border-[#1e2130] rounded-lg text-xs">
              {techStack.map((tech) => (
                <div key={tech.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="font-mono text-gray-400 font-semibold min-w-[130px]">{tech.label}:</span>
                  <span className="text-gray-200">{tech.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Free Tier & Performance Notice */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Free Tier Hosting Notice</span>
            </div>
            <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-lg space-y-2">
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Because this project is hosted on free tiers using <strong className="text-amber-100">Render</strong> for the backend API, <strong className="text-amber-100">Supabase</strong> for PostgreSQL, and <strong className="text-amber-100">Upstash</strong> for Redis caching, services spin down during periods of inactivity.
              </p>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                When you first visit, waking up the backend server can take up to <span className="font-bold text-amber-400">50+ seconds</span>. Once the initial request wakes the server, all play-by-play replays and data visualizations will run quickly.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-[#1e2130] bg-[#141722]">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#f97316] hover:bg-[#ea580c] text-white font-mono text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  )
}
