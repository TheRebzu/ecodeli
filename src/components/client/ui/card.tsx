import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg overflow-hidden", 
  {
    variants: {
      variant: {
        default: "bg-white border border-gray-200 shadow-sm",
        outline: "bg-white border border-gray-200",
        ghost: "bg-transparent",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const cardHeaderVariants = cva(
  "flex items-center", 
  {
    variants: {
      align: {
        default: "justify-between",
        left: "justify-start",
        center: "justify-center",
      },
      size: {
        default: "mb-4",
        sm: "mb-3",
        lg: "mb-6",
      },
    },
    defaultVariants: {
      align: "default",
      size: "default",
    },
  }
);

const cardFooterVariants = cva(
  "flex items-center", 
  {
    variants: {
      align: {
        default: "justify-between",
        left: "justify-start",
        center: "justify-center",
        right: "justify-end",
      },
      size: {
        default: "mt-4",
        sm: "mt-3",
        lg: "mt-6",
      },
    },
    defaultVariants: {
      align: "default",
      size: "default",
    },
  }
);

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, size, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, size }), className)} {...props} />
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardHeaderVariants> {}

export function CardHeader({ className, align, size, ...props }: CardHeaderProps) {
  return (
    <div className={cn(cardHeaderVariants({ align, size }), className)} {...props} />
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div className={cn("", className)} {...props} />
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3 className={cn("text-xl font-semibold", className)} {...props} />
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn("text-sm text-gray-500", className)} {...props} />
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardFooterVariants> {}

export function CardFooter({ className, align, size, ...props }: CardFooterProps) {
  return (
    <div className={cn(cardFooterVariants({ align, size }), className)} {...props} />
  );
} 