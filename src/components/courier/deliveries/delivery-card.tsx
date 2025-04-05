'use client';

import React from 'react';

interface DeliveryCardProps {
  id: string;
  status: string;
  origin: string;
  destination: string;
  date: string;
}

export default function DeliveryCard({ id, status, origin, destination, date }: DeliveryCardProps) {
  return (
    <div className='border rounded-lg p-4 mb-4'>
      <div className='flex justify-between items-center mb-2'>
        <h3 className='font-medium'>Livraison #{id}</h3>
        <span className='px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800'>{status}</span>
      </div>
      <p className='text-sm text-gray-600 mb-1'>De: {origin}</p>
      <p className='text-sm text-gray-600 mb-2'>À: {destination}</p>
      <p className='text-xs text-gray-500'>{date}</p>
    </div>
  );
}