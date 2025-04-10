import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Insurance | EcoDeli',
  description: 'EcoDeli Insurance page',
}

export default function InsurancePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Insurance</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Insurance section</p>
      </div>
    </div>
  )
}
