import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calendar | EcoDeli',
  description: 'EcoDeli Calendar page',
}

export default function CalendarPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p>Content for Calendar section</p>
      </div>
    </div>
  )
}
