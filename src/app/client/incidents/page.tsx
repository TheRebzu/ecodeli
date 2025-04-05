'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Incidents | EcoDeli',
  description: 'EcoDeli Incidents page',
}

export default function IncidentsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Incidents</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Incidents section</p>
      </div>
    </div>
  )
}
