"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Clock,
  Phone,
  Navigation,
  Truck,
  CheckCircle,
  AlertCircle,
  MapIcon,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { DeliveryTrackingMap } from "@/components/maps/delivery-tracking-map";
import ChatBox from '@/components/chat/ChatBox';

export default function DeliveryTrackingPage() {
  const params = useParams();
  const deliveryId = params.id as string;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Suivi de livraison</h1>
      <DeliveryTrackingMap deliveryId={deliveryId} showDetails={true} height="400px" />
    </div>
  );
}
