'use client';

import React from 'react';
import { DeliveryStatus as DeliveryStatusEnum } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from './delivery-status';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatusEnum;
  showIcon?: boolean;
  showTooltip?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const DeliveryStatusBadge: React.FC<DeliveryStatusBadgeProps> = ({
  status,
  showIcon = true,
  showTooltip = true,
  className,
  size = 'md',
}) => {
  // Récupérer la configuration du statut
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
  const Icon = config.icon;

  // Classes CSS selon la taille
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  // Classes pour l'icône selon la taille
  const iconClasses = {
    sm: 'h-3 w-3 mr-1',
    md: 'h-3.5 w-3.5 mr-1.5',
    lg: 'h-4 w-4 mr-2',
  };

  // Créer le badge avec les couleurs appropriées
  const badge = (
    <Badge
      className={cn(
        config.bgColor,
        'text-foreground font-medium border',
        config.borderColor,
        sizeClasses[size],
        'flex items-center justify-center',
        className
      )}
      variant="outline"
    >
      {showIcon && <Icon className={cn(config.color, iconClasses[size])} />}
      <span className={config.color}>{config.label}</span>
    </Badge>
  );

  // Envelopper dans un tooltip si demandé
  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};

export default DeliveryStatusBadge;
