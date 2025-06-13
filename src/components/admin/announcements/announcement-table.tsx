"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import {
  EllipsisVertical,
  Eye,
  Check,
  X,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { AnnouncementStatus, AnnouncementType } from "@prisma/client";
import { toast } from "sonner";

// Types pour les annonces basées sur le modèle Prisma
interface Announcement {
  id: string;
  title: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  pickupAddress: string;
  deliveryAddress: string;
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
  delivererId: string | null;
  suggestedPrice: number | null;
  finalPrice: number | null;
  client: {
    id: string;
    name: string;
    image: string | null;
  };
  _count: {
    applications: number;
    favorites: number;
  };
}

interface AnnouncementTableProps {
  announcements: Announcement[];
  isLoading: boolean;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function AnnouncementTable({
  announcements,
  isLoading,
  totalPages,
  currentPage,
  onPageChange,
}: AnnouncementTableProps) {
  const t = useTranslations("admin.announcements");
  const router = useRouter();
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>(
    [],
  );
  const [sortColumn, setSortColumn] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<
    string | null
  >(null);

  // Mutation tRPC pour la suppression d'annonce
  const deleteMutation = api.announcement.delete.useMutation({
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      setDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
      // Rafraîchir les données
      router.refresh();
    },
    onError: (error) => {
      toast.error(t("deleteError", { error: error.message }));
    },
  });

  // Mutation tRPC pour la mise à jour du statut d'annonce
  const updateStatusMutation = api.announcement.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t("statusUpdateSuccess"));
      // Rafraîchir les données
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        getTranslation("statusUpdateError", { error: error.message }),
      );
    },
  });

  const handleSelectAnnouncement = (announcementId: string) => {
    setSelectedAnnouncements((prev) => {
      if (prev.includes(announcementId)) {
        return prev.filter((id) => id !== announcementId);
      } else {
        return [...prev, announcementId];
      }
    });
  };

  const handleSelectAllAnnouncements = () => {
    if (selectedAnnouncements.length === announcements.length) {
      setSelectedAnnouncements([]);
    } else {
      setSelectedAnnouncements(announcements.map((a) => a.id));
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleView = (id: string) => {
    router.push(`/admin/announcements/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/announcements/${id}/edit`);
  };

  const handleUpdateStatus = (id: string, status: AnnouncementStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    setAnnouncementToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (announcementToDelete) {
      deleteMutation.mutate({ id: announcementToDelete });
    }
  };

  const renderStatusBadge = (status: AnnouncementStatus) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="outline">{getTranslation("status.draft")}</Badge>
        );
      case "PUBLISHED":
        return (
          <Badge variant="secondary">
            {getTranslation("status.published")}
          </Badge>
        );
      case "IN_APPLICATION":
        return (
          <Badge variant="secondary">
            {getTranslation("status.inApplication")}
          </Badge>
        );
      case "ASSIGNED":
        return (
          <Badge variant="secondary">{getTranslation("status.assigned")}</Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge variant="primary">{getTranslation("status.inProgress")}</Badge>
        );
      case "DELIVERED":
        return (
          <Badge variant="primary">{getTranslation("status.delivered")}</Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="success">{getTranslation("status.completed")}</Badge>
        );
      case "PAID":
        return <Badge variant="success">{getTranslation("status.paid")}</Badge>;
      case "PROBLEM":
        return (
          <Badge variant="destructive">
            {getTranslation("status.problem")}
          </Badge>
        );
      case "DISPUTE":
        return (
          <Badge variant="destructive">
            {getTranslation("status.dispute")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive">
            {getTranslation("status.cancelled")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderTypeLabel = (type: AnnouncementType) => {
    switch (type) {
      case "PACKAGE_DELIVERY":
        return getTranslation("type.packageDelivery");
      case "GROCERY_SHOPPING":
        return getTranslation("type.groceryShopping");
      case "PERSON_TRANSPORT":
        return getTranslation("type.personTransport");
      case "AIRPORT_TRANSFER":
        return getTranslation("type.airportTransfer");
      case "FOREIGN_PURCHASE":
        return getTranslation("type.foreignPurchase");
      case "PET_CARE":
        return getTranslation("type.petCare");
      case "HOME_SERVICES":
        return getTranslation("type.homeServices");
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{getTranslation("columns.title")}</TableHead>
                <TableHead>{getTranslation("columns.type")}</TableHead>
                <TableHead>{getTranslation("columns.status")}</TableHead>
                <TableHead>{getTranslation("columns.client")}</TableHead>
                <TableHead>{getTranslation("columns.price")}</TableHead>
                <TableHead>{getTranslation("columns.date")}</TableHead>
                <TableHead className="text-right">
                  {getTranslation("columns.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-5" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-10 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-64" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedAnnouncements.length === announcements.length &&
                    announcements.length > 0
                  }
                  onCheckedChange={handleSelectAllAnnouncements}
                  aria-label="Sélectionner toutes les annonces"
                />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("title")}
              >
                {getTranslation("columns.title")}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("type")}
              >
                {getTranslation("columns.type")}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("status")}
              >
                {getTranslation("columns.status")}
              </TableHead>
              <TableHead>{getTranslation("columns.client")}</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("suggestedPrice")}
              >
                {getTranslation("columns.price")}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("createdAt")}
              >
                {getTranslation("columns.date")}
              </TableHead>
              <TableHead className="text-right">
                {getTranslation("columns.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  {getTranslation("noAnnouncements")}
                </TableCell>
              </TableRow>
            ) : (
              announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedAnnouncements.includes(announcement.id)}
                      onCheckedChange={() =>
                        handleSelectAnnouncement(announcement.id)
                      }
                      aria-label={`Sélectionner l'annonce ${announcement.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {announcement.title}
                  </TableCell>
                  <TableCell>{renderTypeLabel(announcement.type)}</TableCell>
                  <TableCell>
                    {renderStatusBadge(announcement.status)}
                  </TableCell>
                  <TableCell>{announcement.client.name}</TableCell>
                  <TableCell>
                    {announcement.finalPrice
                      ? `${announcement.finalPrice.toFixed(2)} €`
                      : announcement.suggestedPrice
                        ? `${announcement.suggestedPrice.toFixed(2)} €`
                        : "-"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(announcement.createdAt), "dd/MM/yyyy", {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <EllipsisVertical className="h-4 w-4" />
                          <span className="sr-only">Menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          {getTranslation("actions")}
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleView(announcement.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {getTranslation("view")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEdit(announcement.id)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          {getTranslation("edit")}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuLabel>
                          {getTranslation("changeStatus")}
                        </DropdownMenuLabel>

                        {announcement.status === "DRAFT" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(announcement.id, "PUBLISHED")
                            }
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {getTranslation("publish")}
                          </DropdownMenuItem>
                        )}

                        {["PROBLEM", "DISPUTE"].includes(
                          announcement.status,
                        ) && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(announcement.id, "COMPLETED")
                            }
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {getTranslation("markAsResolved")}
                          </DropdownMenuItem>
                        )}

                        {["DRAFT", "PUBLISHED", "IN_APPLICATION"].includes(
                          announcement.status,
                        ) && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(announcement.id, "CANCELLED")
                            }
                          >
                            <X className="h-4 w-4 mr-2" />
                            {getTranslation("cancel")}
                          </DropdownMenuItem>
                        )}

                        {["DELIVERED", "IN_PROGRESS"].includes(
                          announcement.status,
                        ) && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(announcement.id, "PROBLEM")
                            }
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            {getTranslation("reportProblem")}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleDelete(announcement.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {getTranslation("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {getTranslation("deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getTranslation("deleteConfirmMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{getTranslation("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {getTranslation("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
