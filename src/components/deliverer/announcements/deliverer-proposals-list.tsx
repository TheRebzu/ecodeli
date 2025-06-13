"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Star,
  MoreVertical,
  User,
  Calendar,
  Clock,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Truck,
  ChevronDown,
  Filter,
  Search,
  Euro,
  Loader,
} from "lucide-react";
import { cn } from "@/lib/utils/common";

// Types pour le composant
type DelivererProposalStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

interface DelivererProposal {
  id: string;
  announcementId: string;
  delivererId: string;
  deliverer: {
    id: string;
    name: string;
    image?: string | null;
    rating?: number;
    completedDeliveries?: number;
    averageResponseTime?: number;
    verificationStatus?: string;
  };
  status: DelivererProposalStatus;
  proposedPrice: number;
  estimatedDeliveryTime?: string | Date;
  message: string;
  hasRequiredEquipment: boolean;
  canPickupAtScheduledTime: boolean;
  createdAt: Date;
}

interface DelivererProposalsListProps {
  proposals: DelivererProposal[];
  announcementId: string;
  announcementTitle: string;
  suggestedPrice: number;
  onProposalAccepted?: () => void;
  onAccept?: (proposalId: string) => Promise<void>;
  onReject?: (proposalId: string) => Promise<void>;
  onSendMessage?: (delivererId: string) => void;
  onViewDelivererProfile?: (delivererId: string) => void;
  isLoading?: boolean;
  error?: string;
}

/**
 * Liste des propositions des livreurs pour une annonce
 */
export default function DelivererProposalsList({
  proposals,
  announcementId,
  announcementTitle,
  suggestedPrice,
  onAccept,
  onReject,
  onSendMessage,
  onViewDelivererProfile,
  onProposalAccepted,
  isLoading = false,
  error,
}: DelivererProposalsListProps) {
  const t = useTranslations("announcements");
  const [sortBy, setSortBy] = useState<string>("proposedPrice");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDeliverer, setSelectedDeliverer] =
    useState<DelivererProposal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [processingProposalId, setProcessingProposalId] = useState<
    string | null
  >(null);

  // Trier les propositions
  const sortedProposals = [...proposals].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "proposedPrice":
        comparison = a.proposedPrice - b.proposedPrice;
        break;
      case "delivererRating":
        comparison = (b.deliverer.rating || 0) - (a.deliverer.rating || 0);
        break;
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "estimatedDeliveryTime":
        if (a.estimatedDeliveryTime && b.estimatedDeliveryTime) {
          comparison =
            new Date(a.estimatedDeliveryTime).getTime() -
            new Date(b.estimatedDeliveryTime).getTime();
        }
        break;
      default:
        comparison = a.proposedPrice - b.proposedPrice;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Filtrer les propositions par recherche
  const filteredProposals = sortedProposals.filter((proposal) => {
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      proposal.deliverer.name.toLowerCase().includes(searchLower) ||
      proposal.message.toLowerCase().includes(searchLower)
    );
  });

  // Changer le tri
  const handleSortChange = (criteria: string) => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(criteria);
      setSortOrder("asc");
    }
  };

  // Accepter une proposition
  const handleAccept = async (proposal: DelivererProposal) => {
    try {
      setProcessingProposalId(proposal.id);
      await onAccept?.(proposal.id);
    } finally {
      setProcessingProposalId(null);
      setIsDialogOpen(false);
    }
  };

  // Rejeter une proposition
  const handleReject = async (proposal: DelivererProposal) => {
    try {
      setProcessingProposalId(proposal.id);
      await onReject?.(proposal.id);
    } finally {
      setProcessingProposalId(null);
      setIsDialogOpen(false);
    }
  };

  // Gérer l'ouverture du dialogue de détails
  const openProposalDetails = (proposal: DelivererProposal) => {
    setSelectedDeliverer(proposal);
    setIsDialogOpen(true);
  };

  // Formatter une date pour l'affichage
  const formatDateTime = (date?: Date | string) => {
    if (!date) return t("notSpecified");
    return format(new Date(date), "Pp", { locale: fr });
  };

  // Afficher les étoiles de rating
  const renderStars = (rating?: number) => {
    if (!rating)
      return (
        <span className="text-xs text-muted-foreground">{t("noRating")}</span>
      );

    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-3.5 w-3.5",
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted",
            )}
          />
        ))}
        <span className="ml-1 text-xs">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Badge de statut pour une proposition
  const getStatusBadge = (status: DelivererProposalStatus) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">{t("pending")}</Badge>;
      case "ACCEPTED":
        return <Badge variant="default">{t("accepted")}</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">{t("rejected")}</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary">{t("cancelled")}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("proposalsTitle")}</CardTitle>
        <CardDescription>
          {t("proposalsDescription", { title: announcementTitle })}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("searchDeliverers")}
              className="pl-9 w-full sm:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <Filter className="mr-2 h-4 w-4" />
                {t("sortBy")}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleSortChange("proposedPrice")}
              >
                <Euro className="mr-2 h-4 w-4" />
                {t("sortByPrice")}{" "}
                {sortBy === "proposedPrice" &&
                  (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange("delivererRating")}
              >
                <Star className="mr-2 h-4 w-4" />
                {t("sortByRating")}{" "}
                {sortBy === "delivererRating" &&
                  (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("createdAt")}>
                <Clock className="mr-2 h-4 w-4" />
                {t("sortByDate")}{" "}
                {sortBy === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange("estimatedDeliveryTime")}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {t("sortByDeliveryTime")}{" "}
                {sortBy === "estimatedDeliveryTime" &&
                  (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* État de chargement */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? t("noProposalsMatch") : t("noProposalsYet")}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("deliverer")}</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSortChange("proposedPrice")}
                      className="flex items-center"
                    >
                      {t("proposedPrice")}
                      {sortBy === "proposedPrice" && (
                        <ChevronDown
                          className={cn(
                            "ml-1 h-4 w-4 transition-transform",
                            sortOrder === "desc" && "rotate-180",
                          )}
                        />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSortChange("estimatedDeliveryTime")}
                      className="flex items-center"
                    >
                      {t("estimatedDelivery")}
                      {sortBy === "estimatedDeliveryTime" && (
                        <ChevronDown
                          className={cn(
                            "ml-1 h-4 w-4 transition-transform",
                            sortOrder === "desc" && "rotate-180",
                          )}
                        />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    {t("status")}
                  </TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProposals.map((proposal) => (
                  <TableRow
                    key={proposal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openProposalDetails(proposal)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={proposal.deliverer.image || ""}
                            alt={proposal.deliverer.name}
                          />
                          <AvatarFallback>
                            {proposal.deliverer.name
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {proposal.deliverer.name}
                          </div>
                          <div className="text-xs">
                            {renderStars(proposal.deliverer.rating)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {proposal.proposedPrice.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                      {proposal.proposedPrice < suggestedPrice ? (
                        <div className="text-xs text-yellow-600">
                          {t("belowSuggested")}
                        </div>
                      ) : proposal.proposedPrice > suggestedPrice ? (
                        <div className="text-xs text-red-600">
                          {t("aboveSuggested")}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {proposal.estimatedDeliveryTime
                        ? formatDateTime(proposal.estimatedDeliveryTime)
                        : t("notSpecified")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {getStatusBadge(proposal.status)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openProposalDetails(proposal);
                            }}
                          >
                            {t("viewDetails")}
                          </DropdownMenuItem>
                          {proposal.status === "PENDING" && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDeliverer(proposal);
                                  handleAccept(proposal);
                                }}
                              >
                                <ThumbsUp className="mr-2 h-4 w-4" />
                                {t("accept")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDeliverer(proposal);
                                  handleReject(proposal);
                                }}
                              >
                                <ThumbsDown className="mr-2 h-4 w-4" />
                                {t("reject")}
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendMessage?.(proposal.deliverer.id);
                            }}
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            {t("sendMessage")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDelivererProfile?.(proposal.deliverer.id);
                            }}
                          >
                            <User className="mr-2 h-4 w-4" />
                            {t("viewProfile")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Dialogue de détails d'une proposition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedDeliverer && (
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("proposalDetails")}</DialogTitle>
              <DialogDescription>
                {t("proposalFrom")} {selectedDeliverer.deliverer.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={selectedDeliverer.deliverer.image || ""}
                    alt={selectedDeliverer.deliverer.name}
                  />
                  <AvatarFallback>
                    {selectedDeliverer.deliverer.name
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-lg">
                    {selectedDeliverer.deliverer.name}
                  </div>
                  <div className="flex items-center">
                    {renderStars(selectedDeliverer.deliverer.rating)}

                    {selectedDeliverer.deliverer.completedDeliveries !==
                      undefined && (
                      <div className="text-xs text-muted-foreground ml-2">
                        {t("completedDeliveries", {
                          count:
                            selectedDeliverer.deliverer.completedDeliveries,
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">
                    {t("proposedPrice")}
                  </Label>
                  <div className="font-medium text-lg">
                    {selectedDeliverer.proposedPrice.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </div>
                  {selectedDeliverer.proposedPrice !== suggestedPrice && (
                    <div
                      className={cn(
                        "text-xs",
                        selectedDeliverer.proposedPrice < suggestedPrice
                          ? "text-yellow-600"
                          : "text-red-600",
                      )}
                    >
                      {selectedDeliverer.proposedPrice < suggestedPrice
                        ? t("priceLowerBy", {
                            amount: (
                              suggestedPrice - selectedDeliverer.proposedPrice
                            ).toLocaleString("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                            }),
                          })
                        : t("priceHigherBy", {
                            amount: (
                              selectedDeliverer.proposedPrice - suggestedPrice
                            ).toLocaleString("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                            }),
                          })}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">
                    {t("estimatedDelivery")}
                  </Label>
                  <div className="font-medium">
                    {selectedDeliverer.estimatedDeliveryTime
                      ? formatDateTime(selectedDeliverer.estimatedDeliveryTime)
                      : t("notSpecified")}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground">{t("message")}</Label>
                <p className="text-sm border rounded-md p-3 bg-muted/50">
                  {selectedDeliverer.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasEquipment"
                    checked={selectedDeliverer.hasRequiredEquipment}
                    disabled
                  />
                  <label
                    htmlFor="hasEquipment"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("hasRequiredEquipment")}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canPickup"
                    checked={selectedDeliverer.canPickupAtScheduledTime}
                    disabled
                  />
                  <label
                    htmlFor="canPickup"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("canPickupAtScheduledTime")}
                  </label>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {t("proposedAt")}: {formatDateTime(selectedDeliverer.createdAt)}
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onSendMessage?.(selectedDeliverer.deliverer.id)
                  }
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t("sendMessage")}
                </Button>
              </div>

              {selectedDeliverer.status === "PENDING" && (
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={processingProposalId === selectedDeliverer.id}
                    onClick={() => handleReject(selectedDeliverer)}
                  >
                    {processingProposalId === selectedDeliverer.id ? (
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsDown className="mr-2 h-4 w-4" />
                    )}
                    {t("reject")}
                  </Button>

                  <Button
                    size="sm"
                    disabled={processingProposalId === selectedDeliverer.id}
                    onClick={() => handleAccept(selectedDeliverer)}
                  >
                    {processingProposalId === selectedDeliverer.id ? (
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="mr-2 h-4 w-4" />
                    )}
                    {t("accept")}
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}
