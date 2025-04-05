'use client';

import React from 'react';
import Link from 'next/link';

export default function CourierSidebar() {
  return (
    <div className='w-64 h-screen bg-gray-100 border-r p-4'>
      <h2 className='text-xl font-bold mb-6'>EcoDeli Livreur</h2>
      <nav>
        <ul className='space-y-2'>
          <li><Link href='/courier/dashboard' className='block p-2 hover:bg-gray-200 rounded'>Tableau de bord</Link></li>
          <li><Link href='/courier/deliveries' className='block p-2 hover:bg-gray-200 rounded'>Livraisons</Link></li>
          <li><Link href='/courier/announcements' className='block p-2 hover:bg-gray-200 rounded'>Annonces</Link></li>
          <li><Link href='/courier/payments' className='block p-2 hover:bg-gray-200 rounded'>Paiements</Link></li>
          <li><Link href='/courier/schedule' className='block p-2 hover:bg-gray-200 rounded'>Planning</Link></li>
          <li><Link href='/courier/profile' className='block p-2 hover:bg-gray-200 rounded'>Profil</Link></li>
        </ul>
      </nav>
    </div>
  );
}