'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pet Care | EcoDeli',
  description: 'EcoDeli Pet Care page',
}

export default function PetCarePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Pet Care</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Pet Care section</p>
      </div>
    </div>
  )
}
