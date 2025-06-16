"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { UserRole, UserStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Eye, Search, UserCheck, UserX } from "lucide-react";
import { api } from "@/trpc/react";

export default function UsersVerificationList() {
  const t = useTranslations("Admin.verification");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filters, setFilters] = useState<{
    role?: UserRole;
    status?: UserStatus;
    search?: string;
    page: number;
    limit: number;
  }>({ page: 1,
    limit: 10 });
  const [searchQuery, setSearchQuery] = useState("");

  // Query to fetch users
  const { data: usersData, isLoading } = api.adminUser.getUsers.useQuery({ ...filters,
    sortBy: "createdAt",
    sortDirection: "desc" });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    let newFilters: { role?: UserRole; status?: UserStatus } = {};

    switch (value) {
      case "clients":
        newFilters = { role: UserRole.CLIENT };
        break;
      case "deliverers":
        newFilters = { role: UserRole.DELIVERER };
        break;
      case "merchants":
        newFilters = { role: UserRole.MERCHANT };
        break;
      case "providers":
        newFilters = { role: UserRole.PROVIDER };
        break;
      case "pending":
        newFilters = { status: UserStatus.PENDING_VERIFICATION };
        break;
      case "all":
      default:
        // No filters for "all" tab
        break;
    }

    setFilters((prev) => ({ ...prev,
      ...newFilters,
      page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page  }));
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchQuery, page: 1  }));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleViewUserDocuments = (userId: string) => {
    router.push(`/admin/verifications/user/${userId}`);
  };

  // Helper to get role badge
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.CLIENT:
        return <Badge className="bg-blue-500">Client</Badge>;
      case UserRole.DELIVERER:
        return <Badge className="bg-green-500">Deliverer</Badge>;
      case UserRole.MERCHANT:
        return <Badge className="bg-orange-500">Merchant</Badge>;
      case UserRole.PROVIDER:
        return <Badge className="bg-teal-500">Provider</Badge>;
      case UserRole.ADMIN:
        return <Badge className="bg-purple-500">Admin</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  // Helper to get verification badge
  const getVerificationBadge = (isVerified: boolean) => {
    return isVerified ? (
      <Badge className="bg-green-500">
        <UserCheck className="mr-1 h-3 w-3" />
        Verified
      </Badge>
    ) : (
      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
        <UserX className="mr-1 h-3 w-3" />
        Unverified
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {t("usersVerification.title", "Users Verification")}
        </CardTitle>
        <CardDescription>
          {t("usersVerification.description", "View and verify user documents")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search and filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t(
                "usersVerification.searchPlaceholder",
                "Search users by name or email",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-8"
            />
          </div>
          <Button onClick={handleSearch}>
            {t("usersVerification.search", "Search")}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="all">{t("tabs.all", "All")}</TabsTrigger>
            <TabsTrigger value="clients">
              {t("tabs.clients", "Clients")}
            </TabsTrigger>
            <TabsTrigger value="deliverers">
              {t("tabs.deliverers", "Deliverers")}
            </TabsTrigger>
            <TabsTrigger value="merchants">
              {t("tabs.merchants", "Merchants")}
            </TabsTrigger>
            <TabsTrigger value="providers">
              {t("tabs.providers", "Providers")}
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t("tabs.pending", "Pending")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.user", "User")}</TableHead>
                  <TableHead>{t("table.role", "Role")}</TableHead>
                  <TableHead>{t("table.status", "Status")}</TableHead>
                  <TableHead>{t("table.documents", "Documents")}</TableHead>
                  <TableHead>{t("table.created", "Created")}</TableHead>
                  <TableHead className="text-right">
                    {t("table.actions", "Actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {t("loading", "Loading...")}
                    </TableCell>
                  </TableRow>
                ) : usersData?.users && usersData.users.length > 0 ? (
                  usersData.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {getVerificationBadge(user.isVerified)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.documentsCount || 0}{" "}
                          {t("documents", "documents")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUserDocuments(user.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t("actions.viewDocuments", "View Documents")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {t("usersVerification.noUsers", "No users found")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {!isLoading &&
              usersData?.totalPages &&
              usersData.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={filters.page}
                    totalPages={usersData.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
