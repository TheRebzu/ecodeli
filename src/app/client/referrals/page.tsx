'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Referrals | EcoDeli',
  description: 'EcoDeli Referrals page',
}

export default function ReferralsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Referrals</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Referrals section</p>
      </div>
    </div>
  )
}
