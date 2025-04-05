import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cost Centers | EcoDeli',
  description: 'EcoDeli Cost Centers page',
}

export default function CostCentersPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Cost Centers</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Cost Centers section</p>
      </div>
    </div>
  )
}
