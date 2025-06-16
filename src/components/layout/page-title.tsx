"use client";

import { cn } from "@/lib/utils/common";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageTitleProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  iconComponent?: React.ReactNode;
}

export function PageTitle({
  title,
  description,
  breadcrumbs,
  actions,
  className,
  iconComponent}: PageTitleProps) {
  return (
    <div className={cn("pb-4", className)}>
      {/* Fil d'Ariane */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center text-sm text-muted-foreground mb-2 overflow-x-auto">
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Titre et actions */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {iconComponent}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function PageTitleWithAction({
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  actionHref,
  className,
  ...props
}: PageTitleProps & {
  actionLabel: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  actionHref?: string;
}) {
  const ActionButton = (
    <Button onClick={onAction} className="ml-auto">
      {actionIcon}
      {actionLabel}
    </Button>
  );

  return (
    <PageTitle
      title={title}
      description={description}
      className={className}
      actions={
        actionHref ? (
          <Link href={actionHref} passHref>
            {ActionButton}
          </Link>
        ) : (
          ActionButton
        )
      }
      {...props}
    />
  );
}
