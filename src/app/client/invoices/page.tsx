'use client'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Invoices | EcoDeli',
  description: 'EcoDeli Invoices page',
}

export default function InvoicesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Invoices section</p>
      </div>
    </div>
  )
}
