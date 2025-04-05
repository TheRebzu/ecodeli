'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Routes | EcoDeli',
  description: 'EcoDeli Routes page',
}

export default function RoutesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Routes</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Routes section</p>
      </div>
    </div>
  )
}
