import React from 'react'
import { cn } from '@/lib/utils'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const Container = ({
  children,
  className,
  ...props
}: ContainerProps) => {
  return (
    <div
      className={cn(
        'w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
} 