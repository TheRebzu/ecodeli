'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils/common';
import Image from 'next/image';

type TutorialStepProps = {
  title: string;
  description: string;
  image?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function TutorialStep({
  title,
  description,
  image,
  children,
  footer,
  className,
}: TutorialStepProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center space-y-6">
        {image && (
          <div className="relative w-full aspect-video">
            {image.startsWith('/') || image.startsWith('http') ? (
              // Utiliser Image pour les images statiques ou externes
              <Image src={image} alt={title} fill className="rounded-md object-contain" />
            ) : (
              // Fallback pour les images dynamiques
              <img src={image} alt={title} className="rounded-md object-contain w-full h-full" />
            )}
          </div>
        )}

        {children}
      </CardContent>

      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
