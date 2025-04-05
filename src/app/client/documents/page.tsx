import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documents | EcoDeli',
  description: 'EcoDeli Documents page',
}

export default function DocumentsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Documents</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Documents section</p>
      </div>
    </div>
  )
}
