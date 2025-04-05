'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Preferences | EcoDeli',
  description: 'EcoDeli Preferences page',
}

export default function PreferencesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Preferences</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Preferences section</p>
      </div>
    </div>
  )
}
