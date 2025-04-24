import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { useRouter, useParams } from "next/navigation";
import { formatDistance, format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { 
  AnnouncementStatus, 
  ApplicationStatus, 
  PackageSize 
} from "@prisma/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Package, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Shield,
  User,
  MessageSquare,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Send
} from "lucide-react";

export function AnnouncementDetail() {
  const t = useTranslations("announcements");
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const locale = params.locale as string || "fr";
  const dateLocale = locale === "fr" ? fr : enUS;
  
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationPrice, setApplicationPrice] = useState<number | "">("");
  const [message, setMessage] = useState("");
  
  // Récupérer les détails de l'annonce
  const { data: announcement, isLoading, error } = api.announcement.getById.useQuery(
    { id },
    {
      enabled: !!id,
      refetchOnWindowFocus: false,
    }
  );
  
  // Récupérer la session utilisateur
  const { data: session } = api.auth.getSession.useQuery();
  
  // Mutations
  const applyMutation = api.announcement.applyForAnnouncement.useMutation({
    onSuccess: () => {
      toast.success(t("applicationSubmitted"));
      setApplicationMessage("");
      setApplicationPrice("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const acceptApplicationMutation = api.announcement.acceptApplication.useMutation({
    onSuccess: () => {
      toast.success(t("applicationAccepted"));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateStatusMutation = api.announcement.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t("statusUpdated"));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const sendMessageMutation = api.announcement.sendMessage.useMutation({
    onSuccess: () => {
      toast.success(t("messageSent"));
      setMessage("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Récupérer les messages
  const { data: messagesData, refetch: refetchMessages } = api.announcement.getMessages.useQuery(
    { announcementId: id },
    {
      enabled: !!id && !!announcement,
      refetchOnWindowFocus: false,
      onSuccess: () => {
        // Faire défiler vers le bas pour voir les nouveaux messages
        const messagesContainer = document.getElementById("messages-container");
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      },
    }
  );
  
  // Fonctions utilitaires
  const formatDate = (date: Date) => {
    return formatDistance(new Date(date), new Date(), {
      addSuffix: true,
      locale: dateLocale,
    });
  };
  
  const formatExactDate = (date: Date) => {
    return format(new Date(date), "PPP", { locale: dateLocale });
  };
  
  const renderStatusBadge = (status: AnnouncementStatus) => {
    const statusColors = {
      [AnnouncementStatus.OPEN]: "bg-green-500",
      [AnnouncementStatus.ASSIGNED]: "bg-blue-500",
      [AnnouncementStatus.IN_TRANSIT]: "bg-yellow-500",
      [AnnouncementStatus.DELIVERED]: "bg-purple-500",
      [AnnouncementStatus.CANCELLED]: "bg-red-500",
    };

    return (
      <Badge className={`${statusColors[status]}`}>
        {t(`status.${status.toLowerCase()}`)}
      </Badge>
    );
  };
  
  const renderPackageSize = (size: PackageSize) => {
    return t(`size${size.charAt(0) + size.slice(1).toLowerCase()}`);
  };
  
  // Vérifier si l'utilisateur est le client de l'annonce
  const isClient = session?.user?.id === announcement?.clientId;
  
  // Vérifier si l'utilisateur est le livreur assigné à l'annonce
  const isAssignedDeliverer = session?.user?.id === announcement?.delivererId;
  
  // Vérifier si l'utilisateur est un livreur (pour postuler)
  const isDeliverer = session?.user?.role === "DELIVERER";
  
  // Vérifier si l'utilisateur a déjà postulé
  const hasApplied = announcement?.applications.some(
    (app) => app.delivererId === session?.user?.id
  );
  
  // Vérifier si l'annonce est ouverte aux candidatures
  const isOpen = announcement?.status === AnnouncementStatus.OPEN;
  
  // Vérifier si l'annonce est en cours de livraison
  const isInTransit = announcement?.status === AnnouncementStatus.IN_TRANSIT;
  
  // Vérifier si l'annonce est assignée
  const isAssigned = announcement?.status === AnnouncementStatus.ASSIGNED;
  
  // Vérifier si l'annonce est livrée
  const isDelivered = announcement?.status === AnnouncementStatus.DELIVERED;
  
  // Vérifier si l'annonce est annulée
  const isCancelled = announcement?.status === AnnouncementStatus.CANCELLED;
  
  // Gérer la soumission d'une candidature
  const handleApply = () => {
    if (!id) return;
    
    applyMutation.mutate({
      announcementId: id,
      message: applicationMessage,
      price: applicationPrice ? Number(applicationPrice) : undefined,
    });
  };
  
  // Gérer l'acceptation d'une candidature
  const handleAcceptApplication = (applicationId: string) => {
    acceptApplicationMutation.mutate({ applicationId });
  };
  
  // Gérer la mise à jour du statut
  const handleUpdateStatus = (status: AnnouncementStatus) => {
    if (!id) return;
    
    updateStatusMutation.mutate({
      id,
      status,
    });
  };
  
  // Gérer l'envoi d'un message
  const handleSendMessage = () => {
    if (!id || !message.trim()) return;
    
    const receiverId = isClient 
      ? announcement?.delivererId 
      : announcement?.clientId;
    
    if (!receiverId) return;
    
    sendMessageMutation.mutate({
      announcementId: id,
      receiverId,
      content: message,
    }, {
      onSuccess: () => {
        refetchMessages();
      },
    });
  };
  
  // Afficher un état de chargement
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Afficher un message d'erreur
  if (error || !announcement) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-medium">{t("announcementNotFound")}</p>
        <p className="text-gray-500 mt-2">{t("announcementNotFoundDescription")}</p>
        <Button 
          className="mt-4" 
          onClick={() => router.push("/announcements")}
        >
          {t("backToAnnouncements")}
        </Button>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* En-tête de l'annonce */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{announcement.title}</CardTitle>
              <CardDescription>
                {t("postedBy")} {announcement.client.name} • {formatDate(announcement.createdAt)}
              </CardDescription>
            </div>
            {renderStatusBadge(announcement.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">{t("description")}</h3>
              <p className="text-gray-700 whitespace-pre-line">{announcement.description}</p>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{t("pickupAddress")}</p>
                    <p className="text-gray-700">{announcement.pickupAddress}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{t("deliveryAddress")}</p>
                    <p className="text-gray-700">{announcement.deliveryAddress}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{t("deadline")}</p>
                    <p className="text-gray-700">{formatExactDate(announcement.deadline)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{t("packageDetails")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("packageSize")}</span>
                    <span className="font-medium">{renderPackageSize(announcement.packageSize)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("packageWeight")}</span>
                    <span className="font-medium">{announcement.packageWeight} kg</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("packageValue")}</span>
                    <span className="font-medium">{announcement.packageValue.toFixed(2)}€</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("insurance")}</span>
                    <span className="font-medium">
                      {announcement.requiresInsurance ? t("required") : t("notRequired")}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t("price")}</span>
                    <span className="text-xl font-bold text-green-600">{announcement.price.toFixed(2)}€</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Actions selon le rôle et le statut */}
              <div className="mt-4 space-y-3">
                {/* Pour les livreurs qui peuvent postuler */}
                {isDeliverer && isOpen && !hasApplied && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        {t("applyForDelivery")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("applyForDelivery")}</DialogTitle>
                        <DialogDescription>
                          {t("applyDescription")}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("yourMessage")}
                          </label>
                          <Textarea
                            placeholder={t("applicationMessagePlaceholder")}
                            value={applicationMessage}
                            onChange={(e) => setApplicationMessage(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("yourPrice")} (€)
                          </label>
                          <Input
                            type="number"
                            placeholder={announcement.price.toString()}
                            value={applicationPrice}
                            onChange={(e) => setApplicationPrice(e.target.value ? Number(e.target.value) : "")}
                          />
                          <p className="text-xs text-gray-500">
                            {t("priceNegotiationDescription")}
                          </p>
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          onClick={handleApply}
                          disabled={applyMutation.isLoading}
                        >
                          {applyMutation.isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {t("submitApplication")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* Pour les livreurs qui ont déjà postulé */}
                {isDeliverer && hasApplied && (
                  <Button disabled className="w-full">
                    {t("alreadyApplied")}
                  </Button>
                )}
                
                {/* Pour le livreur assigné - mettre à jour le statut */}
                {isAssignedDeliverer && isAssigned && (
                  <Button 
                    className="w-full"
                    onClick={() => handleUpdateStatus(AnnouncementStatus.IN_TRANSIT)}
                    disabled={updateStatusMutation.isLoading}
                  >
                    {updateStatusMutation.isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("startDelivery")}
                  </Button>
                )}
                
                {/* Pour le livreur assigné - marquer comme livré */}
                {isAssignedDeliverer && isInTransit && (
                  <Button 
                    className="w-full"
                    onClick={() => handleUpdateStatus(AnnouncementStatus.DELIVERED)}
                    disabled={updateStatusMutation.isLoading}
                  >
                    {updateStatusMutation.isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("markAsDelivered")}
                  </Button>
                )}
                
                {/* Pour le client - annuler l'annonce */}
                {isClient && (isOpen || isAssigned) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        {t("cancelAnnouncement")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("cancelAnnouncement")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("cancelAnnouncementDescription")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleUpdateStatus(AnnouncementStatus.CANCELLED)}
                          disabled={updateStatusMutation.isLoading}
                        >
                          {updateStatusMutation.isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {t("confirmCancel")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Onglets pour les différentes sections */}
      <Tabs defaultValue="status">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="status">{t("status")}</TabsTrigger>
          {isClient && isOpen && <TabsTrigger value="applications">{t("applications")}</TabsTrigger>}
          {(isClient || isAssignedDeliverer) && (isAssigned || isInTransit) && (
            <TabsTrigger value="messages">{t("messages")}</TabsTrigger>
          )}
        </TabsList>
        
        {/* Onglet Statut */}
        <TabsContent value="status" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("deliveryStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-2 ${announcement.status === AnnouncementStatus.OPEN || announcement.status === AnnouncementStatus.ASSIGNED || announcement.status === AnnouncementStatus.IN_TRANSIT || announcement.status === AnnouncementStatus.DELIVERED ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">{t("announcementCreated")}</p>
                    <p className="text-sm text-gray-500">{formatExactDate(announcement.createdAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-2 ${announcement.status === AnnouncementStatus.ASSIGNED || announcement.status === AnnouncementStatus.IN_TRANSIT || announcement.status === AnnouncementStatus.DELIVERED ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">{t("delivererAssigned")}</p>
                    {announcement.deliverer ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={announcement.deliverer.image || ""} />
                          <AvatarFallback>{announcement.deliverer.name?.charAt(0) || "D"}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm">{announcement.deliverer.name}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">{t("waitingForDeliverer")}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-2 ${announcement.status === AnnouncementStatus.IN_TRANSIT || announcement.status === AnnouncementStatus.DELIVERED ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">{t("inTransit")}</p>
                    <p className="text-sm text-gray-500">
                      {announcement.status === AnnouncementStatus.IN_TRANSIT || announcement.status === AnnouncementStatus.DELIVERED
                        ? t("packageInTransit")
                        : t("waitingForPickup")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-2 ${announcement.status === AnnouncementStatus.DELIVERED ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">{t("delivered")}</p>
                    <p className="text-sm text-gray-500">
                      {announcement.status === AnnouncementStatus.DELIVERED
                        ? t("packageDelivered")
                        : t("waitingForDelivery")}
                    </p>
                  </div>
                </div>
                
                {announcement.status === AnnouncementStatus.CANCELLED && (
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-2 bg-red-100 text-red-600">
                      <XCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium">{t("cancelled")}</p>
                      <p className="text-sm text-gray-500">{t("announcementCancelled")}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Onglet Candidatures (pour le client) */}
        {isClient && isOpen && (
          <TabsContent value="applications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("applications")}</CardTitle>
                <CardDescription>
                  {announcement.applications.length === 0
                    ? t("noApplicationsYet")
                    : t("applicationsCount", { count: announcement.applications.length })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {announcement.applications.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">{t("waitingForApplications")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcement.applications.map((application) => (
                      <Card key={application.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Avatar>
                                <AvatarImage src={application.deliverer.image || ""} />
                                <AvatarFallback>
                                  {application.deliverer.name?.charAt(0) || "D"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{application.deliverer.name}</p>
                                <p className="text-sm text-gray-500">
                                  {formatDate(application.createdAt)}
                                </p>
                              </div>
                            </div>
                            <Badge>
                              {application.price.toFixed(2)}€
                              {application.price !== announcement.price && (
                                <span className="ml-1 text-xs">
                                  ({application.price < announcement.price ? "-" : "+"}
                                  {Math.abs(application.price - announcement.price).toFixed(2)}€)
                                </span>
                              )}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {application.message ? (
                            <p className="text-gray-700">{application.message}</p>
                          ) : (
                            <p className="text-gray-500 italic">{t("noMessage")}</p>
                          )}
                        </CardContent>
                        <CardFooter>
                          <Button 
                            className="w-full"
                            onClick={() => handleAcceptApplication(application.id)}
                            disabled={acceptApplicationMutation.isLoading}
                          >
                            {acceptApplicationMutation.isLoading && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {t("acceptApplication")}
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {/* Onglet Messages */}
        {(isClient || isAssignedDeliverer) && (isAssigned || isInTransit) && (
          <TabsContent value="messages" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("messages")}</CardTitle>
                <CardDescription>
                  {isClient 
                    ? t("messagesWithDeliverer", { name: announcement.deliverer?.name || t("deliverer") })
                    : t("messagesWithClient", { name: announcement.client.name })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  id="messages-container"
                  className="h-80 overflow-y-auto mb-4 space-y-4 p-2"
                >
                  {messagesData?.messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">{t("noMessagesYet")}</p>
                    </div>
                  ) : (
                    messagesData?.messages.map((msg) => {
                      const isCurrentUser = msg.senderId === session?.user?.id;
                      return (
                        <div 
                          key={msg.id}
                          className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                        >
                          <div 
                            className={`max-w-[80%] rounded-lg p-3 ${
                              isCurrentUser 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                              isCurrentUser 
                                ? "text-primary-foreground/70" 
                                : "text-muted-foreground"
                            }`}>
                              {formatDistance(new Date(msg.createdAt), new Date(), {
                                addSuffix: true,
                                locale: dateLocale,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Textarea
                    placeholder={t("typeMessage")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="resize-none"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isLoading}
                  >
                    {sendMessageMutation.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
