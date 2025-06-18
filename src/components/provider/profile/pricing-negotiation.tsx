"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DollarSign,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Handshake,
} from "lucide-react";

import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Schéma de validation pour les négociations
const negotiationSchema = z.object({
  proposedPrice: z.number().min(0.01, "Le prix doit être supérieur à 0"),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères"),
  validUntil: z.string().min(1, "La date d'expiration est requise"),
});

interface NegotiationFormData {
  proposedPrice: number;
  message: string;
  validUntil: string;
}

interface PriceNegotiation {
  id: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientAvatar?: string;
  originalPrice: number;
  proposedPrice: number;
  currentPrice: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTER_OFFERED" | "EXPIRED";
  message: string;
  validUntil: Date;
  createdAt: Date;
  lastUpdated: Date;
  negotiationHistory: Array<{
    id: string;
    price: number;
    message: string;
    isFromProvider: boolean;
    createdAt: Date;
  }>;
}

export default function PricingNegotiation() {
  const t = useTranslations("provider.pricing");
  const { toast } = useToast();
  const [selectedNegotiation, setSelectedNegotiation] = useState<PriceNegotiation | null>(null);
  const [isCounterOfferOpen, setIsCounterOfferOpen] = useState(false);

  // Récupérer les négociations actives
  const { data: negotiations, isLoading, refetch } = api.provider.getPriceNegotiations.useQuery();

  // Mutations pour gérer les négociations
  const acceptNegotiationMutation = api.provider.acceptPriceNegotiation.useMutation({
    onSuccess: () => {
      toast({
        title: t("negotiationAccepted"),
        description: t("negotiationAcceptedDescription"),
      });
      refetch();
      setSelectedNegotiation(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const rejectNegotiationMutation = api.provider.rejectPriceNegotiation.useMutation({
    onSuccess: () => {
      toast({
        title: t("negotiationRejected"),
        description: t("negotiationRejectedDescription"),
      });
      refetch();
      setSelectedNegotiation(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const counterOfferMutation = api.provider.counterOfferPrice.useMutation({
    onSuccess: () => {
      toast({
        title: t("counterOfferSent"),
        description: t("counterOfferSentDescription"),
      });
      refetch();
      setIsCounterOfferOpen(false);
      setSelectedNegotiation(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  // Formulaire pour la contre-offre
  const form = useForm<NegotiationFormData>({
    resolver: zodResolver(negotiationSchema),
    defaultValues: {
      proposedPrice: selectedNegotiation?.currentPrice || 0,
      message: "",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  // Gestionnaires d'événements
  const handleAcceptNegotiation = (negotiationId: string) => {
    acceptNegotiationMutation.mutate({ negotiationId });
  };

  const handleRejectNegotiation = (negotiationId: string) => {
    rejectNegotiationMutation.mutate({ negotiationId });
  };

  const handleCounterOffer = (data: NegotiationFormData) => {
    if (!selectedNegotiation) return;

    counterOfferMutation.mutate({
      negotiationId: selectedNegotiation.id,
      proposedPrice: data.proposedPrice,
      message: data.message,
      validUntil: new Date(data.validUntil),
    });
  };

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status: PriceNegotiation['status']) => {
    const statusConfig = {
      PENDING: { variant: "default" as const, icon: Clock, label: t("pending") },
      ACCEPTED: { variant: "default" as const, icon: CheckCircle, label: t("accepted") },
      REJECTED: { variant: "destructive" as const, icon: XCircle, label: t("rejected") },
      COUNTER_OFFERED: { variant: "secondary" as const, icon: MessageSquare, label: t("counterOffered") },
      EXPIRED: { variant: "outline" as const, icon: AlertTriangle, label: t("expired") },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </CardHeader>
      <CardContent>
        {!negotiations || negotiations.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("noNegotiations")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {negotiations.map((negotiation) => (
              <div key={negotiation.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{negotiation.serviceName}</h4>
                    <p className="text-sm text-muted-foreground">
                      Client: {negotiation.clientName}
                    </p>
                  </div>
                  {getStatusBadge(negotiation.status)}
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("originalPrice")}: </span>
                      <span className="line-through">{negotiation.originalPrice}€</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("proposedPrice")}: </span>
                      <span className="font-medium text-primary">{negotiation.currentPrice}€</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("validUntil")}: {new Date(negotiation.validUntil).toLocaleDateString()}
                  </div>
                </div>

                {negotiation.message && (
                  <div className="mb-3 p-3 bg-muted rounded-md">
                    <p className="text-sm">{negotiation.message}</p>
                  </div>
                )}

                {negotiation.status === "PENDING" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptNegotiation(negotiation.id)}
                      disabled={acceptNegotiationMutation.isLoading}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t("accept")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedNegotiation(negotiation);
                        setIsCounterOfferOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {t("counterOffer")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectNegotiation(negotiation.id)}
                      disabled={rejectNegotiationMutation.isLoading}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {t("reject")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dialog pour contre-offre */}
        <Dialog open={isCounterOfferOpen} onOpenChange={setIsCounterOfferOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("makeCounterOffer")}</DialogTitle>
              <DialogDescription>
                {t("counterOfferDescription")}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCounterOffer)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="proposedPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("proposedPrice")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className="pl-10"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("message")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("messagePlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("messageDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("validUntil")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCounterOfferOpen(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={counterOfferMutation.isLoading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {t("sendCounterOffer")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
