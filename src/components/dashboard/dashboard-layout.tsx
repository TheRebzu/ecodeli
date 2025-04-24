"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  className?: string;
}

export function DashboardLayout({
  children,
  sidebar,
  header,
  className = "",
}: DashboardLayoutProps) {
  return (
    <div className={cn("flex min-h-screen bg-background", className)}>
      {sidebar && (
        <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r bg-background lg:block">
          <div className="flex h-full flex-col">{sidebar}</div>
        </aside>
      )}
      <div className={cn("flex flex-1 flex-col", sidebar ? "lg:pl-64" : "")}>
        {header && <header className="sticky top-0 z-20 border-b bg-background">{header}</header>}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function DashboardHeader({
  title,
  description,
  actions,
  className = "",
}: DashboardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface DashboardSidebarProps {
  children: ReactNode;
  className?: string;
}

export function DashboardSidebar({
  children,
  className = "",
}: DashboardSidebarProps) {
  return (
    <div className={cn("flex h-full flex-col gap-4 p-4", className)}>
      {children}
    </div>
  );
}

interface DashboardSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  description,
  children,
  className = "",
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
