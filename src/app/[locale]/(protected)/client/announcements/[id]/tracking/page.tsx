"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, MapPin, Clock, RefreshCw } from "lucide-react";

export default function AnnouncementTrackingPage() {
  const params = useParams();
  const t = useTranslations("tracking");
  const [isClient, setIsClient] = useState(false);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && params.id) {
      // Simuler le chargement des données
      setTimeout(() => {
        setAnnouncement({
          id: params.id,
          title: "Livraison Paris → Lyon",
          status: "IN_PROGRESS",
          deliverer: {
            name: "Jean Dupont",
            phone: "06 12 34 56 78"
          }
        });
        setLoading(false);
      }, 1000);
    }
  }, [isClient, params.id]);

  if (!isClient) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-3xl mx-auto">
          <div className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Chargement du suivi...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/client/announcements" passHref>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux annonces
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Suivi de l'annonce
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{announcement?.title}</h3>
                <Badge variant="outline" className="mt-2">
                  {announcement?.status}
                </Badge>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Informations du livreur</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{announcement?.deliverer?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{announcement?.deliverer?.phone}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Le suivi détaillé avec carte sera disponible prochainement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
