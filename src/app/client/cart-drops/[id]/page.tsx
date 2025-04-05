'use client';

export default function CartDropDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className='container mx-auto py-8'>
      <h1 className='text-2xl font-bold mb-6'>Détails du lâcher de chariot {params.id}</h1>
      <p>Cette page est en cours de développement.</p>
    </div>
  );
}