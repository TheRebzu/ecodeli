'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support | EcoDeli',
  description: 'EcoDeli Support page',
}

export default function SupportPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Support</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Support section</p>
      </div>
    </div>
  )
}
