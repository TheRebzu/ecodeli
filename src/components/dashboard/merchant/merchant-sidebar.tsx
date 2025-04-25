"use client";

import { useSession } from "next-auth/react";
import {
  DashboardNavigation,
  DashboardUserInfo,
  DashboardSidebarFooter,
} from "@/components/dashboard/dashboard-navigation";
import { DashboardSidebar } from "@/components/dashboard/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export function MerchantSidebar() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <DashboardSidebar>
        <div className="flex items-center gap-2 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="space-y-2 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </DashboardSidebar>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <DashboardSidebar>
      <DashboardUserInfo />
      <div className="px-2 py-4">
        <DashboardNavigation role="MERCHANT" />
      </div>
      <DashboardSidebarFooter />
    </DashboardSidebar>
  );
}
