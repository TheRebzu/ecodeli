'use client';

export default function CourierAnnouncementDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-6'>Détail de l'annonce {params.id}</h1>
      <p>Page en développement</p>
    </div>
  );
}