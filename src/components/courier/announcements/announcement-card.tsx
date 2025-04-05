'use client';

import React from 'react';

interface AnnouncementCardProps {
  id: string;
  title: string;
  description: string;
  date: string;
}

export default function AnnouncementCard({ id, title, description, date }: AnnouncementCardProps) {
  return (
    <div className='border rounded-lg p-4 mb-4'>
      <h3 className='font-medium'>{title}</h3>
      <p className='text-sm text-gray-600 mb-2'>{description}</p>
      <p className='text-xs text-gray-500'>{date}</p>
    </div>
  );
}