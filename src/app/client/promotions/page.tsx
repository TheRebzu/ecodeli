'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Promotions | EcoDeli',
  description: 'EcoDeli Promotions page',
}

export default function PromotionsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Promotions</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Promotions section</p>
      </div>
    </div>
  )
}
