import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Delivery Preferences | EcoDeli',
  description: 'EcoDeli Delivery Preferences page',
}

export default function DeliveryPreferencesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Delivery Preferences</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Delivery Preferences section</p>
      </div>
    </div>
  )
}
