'use client';

import * as React from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './loading-spinner';

export interface ButtonWithLoadingProps extends ButtonProps {
  loading?: boolean;
}

/**
 * Button avec un état de chargement
 * Affiche un spinner lorsque loading est true
 */
const ButtonWithLoading = React.forwardRef<HTMLButtonElement, ButtonWithLoadingProps>(
  ({ className, children, loading = false, disabled, ...props }, ref) => {
    return (
      <Button className={cn(className)} disabled={disabled || loading} ref={ref} {...props}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" />
            {typeof children === 'string' ? children : null}
          </span>
        ) : (
          children
        )}
      </Button>
    );
  }
);

ButtonWithLoading.displayName = 'ButtonWithLoading';

export { ButtonWithLoading };
