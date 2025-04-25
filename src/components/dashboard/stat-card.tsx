"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  className = "",
}: StatCardProps) {
  return (
    <Card className={`p-4 flex items-center justify-between ${className}`}>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {trend && (
          <div className="flex items-center text-xs">
            <span
              className={trend.isPositive ? "text-green-500" : "text-red-500"}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground ml-1">
              vs. mois précédent
            </span>
          </div>
        )}
      </div>
      {icon && <div className="text-muted-foreground">{icon}</div>}
    </Card>
  );
}
