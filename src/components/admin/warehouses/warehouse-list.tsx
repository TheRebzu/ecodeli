"use client";

import { useTranslations } from "next-intl";
import { useWarehouse } from "@/hooks/common/use-warehouse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function WarehouseList() {
  const t = useTranslations("admin.warehouses");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(
    null,
  );

  const {
    warehouses,
    warehousesCount,
    warehousesCurrentPage,
    warehousesTotalPages,
    warehousesLoading,
    warehouseFilters,
    updateWarehouseFilters,
    deleteWarehouse,
  } = useWarehouse();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = () => {
    updateWarehouseFilters({ search: searchQuery, page: 1 });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    updateWarehouseFilters({ page });
  };

  const handleCreateWarehouse = () => {
    router.push("/admin/warehouses/create");
  };

  const handleEditWarehouse = (id: string) => {
    router.push(`/admin/warehouses/${id}/edit`);
  };

  const openDeleteDialog = (id: string) => {
    setWarehouseToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!warehouseToDelete) return;

    try {
      await deleteWarehouse({ id: warehouseToDelete });
      toast.success(t("deleteSuccess"));
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      toast.error(t("deleteError"));
    } finally {
      setIsDeleteDialogOpen(false);
      setWarehouseToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("subtitle")}</CardDescription>
            </div>
            <Button onClick={handleCreateWarehouse}>
              <Plus className="mr-2 h-4 w-4" /> {t("create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search")}
                className="pl-8"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button variant="outline" className="ml-2" onClick={handleSearch}>
              {t("searchButton")}
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("location")}</TableHead>
                  <TableHead>{t("capacity")}</TableHead>
                  <TableHead>{t("occupied")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehousesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                ) : warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {t("noWarehouses")}
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-medium">
                        {warehouse.name}
                      </TableCell>
                      <TableCell>{warehouse.location}</TableCell>
                      <TableCell>{warehouse.capacity}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{warehouse.occupied}</span>
                            <span>{warehouse.occupiedPercentage}%</span>
                          </div>
                          <Progress
                            value={warehouse.occupiedPercentage}
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={warehouse.isActive ? "default" : "secondary"}
                        >
                          {warehouse.isActive ? t("active") : t("inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/warehouses/${warehouse.id}`)
                            }
                          >
                            {t("view")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditWarehouse(warehouse.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(warehouse.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {t("showing")}{" "}
              {warehousesCount > 0
                ? (warehousesCurrentPage - 1) * warehouseFilters.limit! + 1
                : 0}{" "}
              -{" "}
              {Math.min(
                warehousesCurrentPage * warehouseFilters.limit!,
                warehousesCount,
              )}{" "}
              {t("of")} {warehousesCount} {t("warehouses")}
            </div>
            <Pagination
              currentPage={warehousesCurrentPage}
              totalPages={warehousesTotalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </CardFooter>
      </Card>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
