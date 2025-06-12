'use client';

import React from 'react';
import { DeliveryStatus as DeliveryStatusEnum } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/common';
import { STATUS_CONFIG } from '@/components/shared/deliveries/delivery-status';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DeliveryStatusBadgeProps {
  status: string;
  className?: string;
}

export function DeliveryStatusBadge({ status, className }: DeliveryStatusBadgeProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Badge className={cn(getStatusColor(status), className)}>
      {status}
    </Badge>
  );
}
