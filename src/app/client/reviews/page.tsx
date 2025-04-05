'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reviews | EcoDeli',
  description: 'EcoDeli Reviews page',
}

export default function ReviewsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Reviews</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Reviews section</p>
      </div>
    </div>
  )
}
