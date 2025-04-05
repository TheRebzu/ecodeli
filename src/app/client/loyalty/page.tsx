'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Loyalty | EcoDeli',
  description: 'EcoDeli Loyalty page',
}

export default function LoyaltyPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Loyalty</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Loyalty section</p>
      </div>
    </div>
  )
}
