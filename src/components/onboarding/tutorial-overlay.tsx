'use client';

import React from 'react';
import { X } from 'lucide-react';

export function TutorialOverlay({
  children,
  isActive,
}: {
  children: React.ReactNode;
  isActive: boolean;
}) {
  // N'affiche rien si non actif
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-3xl p-6 overflow-auto max-h-[90vh] relative bg-white rounded-lg shadow-lg">
        {children}
      </div>
    </div>
  );
}
