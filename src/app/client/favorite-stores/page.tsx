import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Favorite Stores | EcoDeli',
  description: 'EcoDeli Favorite Stores page',
}

export default function FavoriteStoresPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Favorite Stores</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Favorite Stores section</p>
      </div>
    </div>
  )
}
