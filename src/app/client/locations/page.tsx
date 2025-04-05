'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Locations | EcoDeli',
  description: 'EcoDeli Locations page',
}

export default function LocationsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Locations</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Locations section</p>
      </div>
    </div>
  )
}
