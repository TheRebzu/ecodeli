"use client";

import { Suspense, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeliveryTrackingMap } from "@/components/maps/delivery-tracking-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Package,
  User,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  IN_TRANSIT: "En transit",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};
const ALL_STATUS_VALUE = "ALL";

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>(ALL_STATUS_VALUE);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status && status !== ALL_STATUS_VALUE) params.set("status", status);
    params.set("page", String(page));
    params.set("limit", String(limit));
    fetch(`/api/admin/deliveries?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setDeliveries(data.deliveries || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [status, page, limit]);

  return (
    <div className="max-w-7xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Suivi des livraisons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS_VALUE}>
                  Tous les statuts
                </SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">
              {total} livraisons
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Annonce</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Livreur</TableHead>
                  <TableHead>Dernier suivi</TableHead>
                  <TableHead>Localisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="animate-spin inline mr-2" />{" "}
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : deliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Aucune livraison trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">
                        {d.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {STATUS_LABELS[d.status] || d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.announcement?.title}</TableCell>
                      <TableCell>
                        {d.client?.profile
                          ? `${d.client.profile.firstName || ""} ${d.client.profile.lastName || ""}`
                          : d.client?.id}
                      </TableCell>
                      <TableCell>
                        {d.deliverer?.profile
                          ? `${d.deliverer.profile.firstName || ""} ${d.deliverer.profile.lastName || ""}`
                          : d.deliverer?.id}
                      </TableCell>
                      <TableCell>
                        {d.tracking?.[0]?.status ? (
                          <span>
                            {STATUS_LABELS[d.tracking[0].status] ||
                              d.tracking[0].status}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.currentLocation?.address || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="ghost"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </Button>
            <span>
              Page {page} / {Math.max(1, Math.ceil(total / limit))}
            </span>
            <Button
              variant="ghost"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
