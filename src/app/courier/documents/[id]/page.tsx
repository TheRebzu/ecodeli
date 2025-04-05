'use client';

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-6'>Détail du document {params.id}</h1>
      <p>Page en développement</p>
    </div>
  );
}