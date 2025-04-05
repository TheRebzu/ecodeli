'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nfc | EcoDeli',
  description: 'EcoDeli Nfc page',
}

export default function NfcPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Nfc</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Nfc section</p>
      </div>
    </div>
  )
}
