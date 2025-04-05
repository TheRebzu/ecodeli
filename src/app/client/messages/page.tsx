'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Messages | EcoDeli',
  description: 'EcoDeli Messages page',
}

export default function MessagesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Messages section</p>
      </div>
    </div>
  )
}
