'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'History | EcoDeli',
  description: 'EcoDeli History page',
}

export default function HistoryPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">History</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for History section</p>
      </div>
    </div>
  )
}
