import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Eco Impact | EcoDeli',
  description: 'EcoDeli Eco Impact page',
}

export default function EcoImpactPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Eco Impact</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Eco Impact section</p>
      </div>
    </div>
  )
}
