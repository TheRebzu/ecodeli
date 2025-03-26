"use client";

import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto py-3 sm:py-4 md:py-6 space-y-3 sm:space-y-6 px-2 sm:px-4">
      <Suspense fallback={<AdminUsersSkeleton />}>
        <AdminUsersContent />
      </Suspense>
    </div>
  );
}

function AdminUsersContent() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl">Gestion des utilisateurs</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Consultez et gérez les utilisateurs de la plateforme
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-center py-10">
          <Button asChild>
            <a href="/dashboard">Retour au tableau de bord</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminUsersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <div className="border rounded-md p-6">
        <Skeleton className="h-8 w-full max-w-md mx-auto" />
      </div>
    </div>
  );
} 