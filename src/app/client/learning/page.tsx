'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Learning | EcoDeli',
  description: 'EcoDeli Learning page',
}

export default function LearningPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Learning</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Learning section</p>
      </div>
    </div>
  )
}
