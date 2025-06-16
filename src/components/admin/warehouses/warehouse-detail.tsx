"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useWarehouse } from "@/hooks/common/use-warehouse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Pagination } from "@/components/ui/pagination";
import { Search, PlusCircle, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { type WarehouseDetailResponse } from "@/types/warehouses/warehouse";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type WarehouseDetailProps = {
  warehouseId: string;
  initialData?: WarehouseDetailResponse;
};

export function WarehouseDetail({
  warehouseId,
  initialData}: WarehouseDetailProps) {
  const t = useTranslations("admin.warehouses.details");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [boxToDelete, setBoxToDelete] = useState<string | null>(null);

  const {
    getWarehouseById,
    boxes,
    boxesCount,
    boxesCurrentPage,
    boxesTotalPages,
    boxesLoading,
    boxFilters,
    updateBoxFilters,
    deleteBox} = useWarehouse();

  // Use the server-side fetched data if available
  const warehouseQuery = getWarehouseById(warehouseId);
  const warehouse = initialData?.warehouse || warehouseQuery.data?.warehouse;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = () => {
    updateBoxFilters({ search: searchQuery, warehouseId, page: 1  });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    updateBoxFilters({ page  });
  };

  const handleCreateBox = () => {
    router.push(`/admin/warehouses/${warehouseId}/boxes/create`);
  };

  const handleEditWarehouse = () => {
    router.push(`/admin/warehouses/${warehouseId}/edit`);
  };

  const handleBackToList = () => {
    router.push("/admin/warehouses");
  };

  const openDeleteDialog = (id: string) => {
    setBoxToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!boxToDelete) return;

    try {
      await deleteBox({ id  });
      toast.success(t("deleteBoxSuccess"));
    } catch (error) {
      console.error("Error deleting box:", error);
      toast.error(t("deleteBoxError"));
    } finally {
      setIsDeleteDialogOpen(false);
      setBoxToDelete(null);
    }
  };

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p>{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackToList}
          className="mr-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToList")}
        </Button>
        <Heading title={warehouse.name} description={t("warehouseDetails")} />
        <div className="ml-auto">
          <Button variant="outline" onClick={handleEditWarehouse}>
            <Edit className="mr-2 h-4 w-4" />
            {t("edit")}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("basicInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("location")}
              </p>
              <p>{warehouse.location}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("address")}
              </p>
              <p>{warehouse.address}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("status")}
              </p>
              <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                {warehouse.isActive ? t("active") : t("inactive")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("capacityInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("totalCapacity")}
              </p>
              <p>{warehouse.capacity}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("occupiedSpace")}
              </p>
              <p>
                {warehouse.occupied} ({warehouse.occupiedPercentage}%)
              </p>
              <Progress
                value={warehouse.occupiedPercentage}
                className="h-2 mt-2"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("totalBoxes")}
              </p>
              <p>{warehouse.boxCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("additionalInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("description")}
              </p>
              <p>{warehouse.description || t("noDescription")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("createdAt")}
              </p>
              <p>{new Date(warehouse.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("updatedAt")}
              </p>
              <p>{new Date(warehouse.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="boxes" className="w-full mt-6">
        <TabsList>
          <TabsTrigger value="boxes">{t("boxes")}</TabsTrigger>
          <TabsTrigger value="statistics">{t("statistics")}</TabsTrigger>
        </TabsList>
        <TabsContent value="boxes" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t("boxes")}</CardTitle>
                <Button onClick={handleCreateBox}>
                  <PlusCircle className="mr-2 h-4 w-4" /> {t("createBox")}
                </Button>
              </div>
              <CardDescription>{t("boxesDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchBox")}
                    className="pl-8"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <Button
                  variant="outline"
                  className="ml-2"
                  onClick={handleSearch}
                >
                  {t("searchButton")}
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("boxName")}</TableHead>
                      <TableHead>{t("size")}</TableHead>
                      <TableHead>{t("pricePerDay")}</TableHead>
                      <TableHead>{t("occupation")}</TableHead>
                      <TableHead>{t("client")}</TableHead>
                      <TableHead className="text-right">
                        {t("actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boxesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          {t("loadingBoxes")}
                        </TableCell>
                      </TableRow>
                    ) : boxes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          {t("noBoxes")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      boxes.map((box) => (
                        <TableRow key={box.id}>
                          <TableCell className="font-medium">
                            {box.name}
                          </TableCell>
                          <TableCell>{box.size} m³</TableCell>
                          <TableCell>{box.pricePerDay.toFixed(2)} €</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                box.isOccupied ? "destructive" : "success"
                              }
                            >
                              {box.isOccupied ? t("occupied") : t("available")}
                            </Badge>
                          </TableCell>
                          <TableCell>{box.clientName || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/admin/warehouses/${warehouseId}/boxes/${box.id}`,
                                  )
                                }
                              >
                                {t("view")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/admin/warehouses/${warehouseId}/boxes/${box.id}/edit`,
                                  )
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(box.id)}
                                disabled={box.isOccupied}
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
                  {boxesCount > 0
                    ? (boxesCurrentPage - 1) * boxFilters.limit! + 1
                    : 0}{" "}
                  - {Math.min(boxesCurrentPage * boxFilters.limit!, boxesCount)}{" "}
                  {t("of")} {boxesCount} {t("boxesTotal")}
                </div>
                <Pagination
                  currentPage={boxesCurrentPage}
                  totalPages={boxesTotalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="statistics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("statistics")}</CardTitle>
              <CardDescription>{t("statisticsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{t("comingSoon")}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteBoxTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteBoxDescription")}
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
