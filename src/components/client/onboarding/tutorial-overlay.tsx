'use client'

import React from 'react'

export function TutorialOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="relative h-full max-w-4xl mx-auto bg-white">
        {children}
      </div>
    </div>
  )
}
