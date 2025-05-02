'use client';

import React from 'react';

export function TutorialOverlay({
  children,
  isActive,
}: {
  children: React.ReactNode;
  isActive: boolean;
}) {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-3xl p-6 overflow-auto max-h-[90vh]">{children}</div>
    </div>
  );
}
