'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Urgent | EcoDeli',
  description: 'EcoDeli Urgent page',
}

export default function UrgentPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Urgent</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Urgent section</p>
      </div>
    </div>
  )
}
