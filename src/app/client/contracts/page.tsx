import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contracts | EcoDeli',
  description: 'EcoDeli Contracts page',
}

export default function ContractsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Contracts</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Contracts section</p>
      </div>
    </div>
  )
}
