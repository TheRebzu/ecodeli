"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  Plus, 
  Settings, 
  TrendingUp, 
  Package,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ZoneManagerProps {
  merchantId: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  centerLatitude: number;
  centerLongitude: number;
  radius: number;
  color: string;
  isActive: boolean;
  maxDeliveryTime?: number;
  additionalFee?: number;
  deliveryCount: number;
  averageDeliveryTime?: number;
  successRate?: number;
  createdAt: string;
}

interface ZoneStats {
  totalZones: number;
  activeZones: number;
  deliveriesThisMonth: number;
  deliveriesChange: number;
  topZone?: {
    name: string;
    deliveries: number;
  };
  averageCoverage: number;
}

export default function ZoneManager({ merchantId }: ZoneManagerProps) {
  const t = useTranslations("merchant.zones");
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [stats, setStats] = useState<ZoneStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  const [newZone, setNewZone] = useState({
    name: "",
    centerLatitude: 0,
    centerLongitude: 0,
    radius: 5,
    color: "#3B82F6",
    maxDeliveryTime: 60,
    additionalFee: 0,
  });

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/merchant/zones?merchantId=${merchantId}`);
      if (response.ok) {
        const data = await response.json();
        setZones(data.zones || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching zones:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const createZone = async () => {
    try {
      const response = await fetch("/api/merchant/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          ...newZone,
        }),
      });

      if (response.ok) {
        toast.success(t("success.zone_created"));
        fetchZones();
        setShowCreateDialog(false);
        setNewZone({
          name: "",
          centerLatitude: 0,
          centerLongitude: 0,
          radius: 5,
          color: "#3B82F6",
          maxDeliveryTime: 60,
          additionalFee: 0,
        });
      } else {
        toast.error(t("error.create_failed"));
      }
    } catch (error) {
      console.error("Error creating zone:", error);
      toast.error(t("error.create_failed"));
    }
  };

  const updateZone = async () => {
    if (!editingZone) return;

    try {
      const response = await fetch(`/api/merchant/zones/${editingZone.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingZone),
      });

      if (response.ok) {
        toast.success(t("success.zone_updated"));
        fetchZones();
        setEditingZone(null);
      } else {
        toast.error(t("error.update_failed"));
      }
    } catch (error) {
      console.error("Error updating zone:", error);
      toast.error(t("error.update_failed"));
    }
  };

  const deleteZone = async (zoneId: string) => {
    if (!confirm(t("confirm_delete"))) return;

    try {
      const response = await fetch(`/api/merchant/zones/${zoneId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("success.zone_deleted"));
        fetchZones();
      } else {
        toast.error(t("error.delete_failed"));
      }
    } catch (error) {
      console.error("Error deleting zone:", error);
      toast.error(t("error.delete_failed"));
    }
  };

  const toggleZoneStatus = async (zoneId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/merchant/zones/${zoneId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        toast.success(t("success.status_updated"));
        fetchZones();
      } else {
        toast.error(t("error.status_failed"));
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(t("error.status_failed"));
    }
  };

  useEffect(() => {
    fetchZones();
  }, [merchantId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zone Management Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("actions.add_zone")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("create_dialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("create_dialog.description")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">{t("create_dialog.name")}</Label>
                  <Input
                    id="name"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    placeholder={t("create_dialog.name_placeholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lat">{t("create_dialog.latitude")}</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="0.000001"
                      value={newZone.centerLatitude}
                      onChange={(e) => setNewZone({ ...newZone, centerLatitude: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lng">{t("create_dialog.longitude")}</Label>
                    <Input
                      id="lng"
                      type="number"
                      step="0.000001"
                      value={newZone.centerLongitude}
                      onChange={(e) => setNewZone({ ...newZone, centerLongitude: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="radius">{t("create_dialog.radius")}</Label>
                    <Input
                      id="radius"
                      type="number"
                      value={newZone.radius}
                      onChange={(e) => setNewZone({ ...newZone, radius: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">{t("create_dialog.color")}</Label>
                    <Input
                      id="color"
                      type="color"
                      value={newZone.color}
                      onChange={(e) => setNewZone({ ...newZone, color: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxTime">{t("create_dialog.max_time")}</Label>
                    <Input
                      id="maxTime"
                      type="number"
                      value={newZone.maxDeliveryTime}
                      onChange={(e) => setNewZone({ ...newZone, maxDeliveryTime: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fee">{t("create_dialog.additional_fee")}</Label>
                    <Input
                      id="fee"
                      type="number"
                      step="0.01"
                      value={newZone.additionalFee}
                      onChange={(e) => setNewZone({ ...newZone, additionalFee: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createZone}>
                  {t("create_dialog.create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            {t("actions.settings")}
          </Button>
        </div>
        <Badge variant="outline">
          {zones.length} {t("zone_count", { count: zones.length })}
        </Badge>
      </div>

      {/* Zone Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.active_zones")}</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeZones}</div>
              <p className="text-xs text-muted-foreground">
                {t("stats.total_configured", { total: stats.totalZones })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.deliveries_month")}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.deliveriesThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                {stats.deliveriesChange > 0 ? '+' : ''}{stats.deliveriesChange}% {t("stats.vs_last_month")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.top_zone")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.topZone?.name || '-'}</div>
              <p className="text-xs text-muted-foreground">
                {stats.topZone?.deliveries || 0} {t("stats.deliveries")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.average_coverage")}</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageCoverage}km</div>
              <p className="text-xs text-muted-foreground">
                {t("stats.average_radius")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Zones List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("empty.title")}
              </h3>
              <p className="text-gray-600 mb-4">
                {t("empty.description")}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("empty.create_first")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          zones.map((zone) => (
            <Card key={zone.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: zone.color }}
                    />
                    <CardTitle className="text-base">{zone.name}</CardTitle>
                  </div>
                  <Badge variant={zone.isActive ? 'default' : 'secondary'}>
                    {zone.isActive ? t("status.active") : t("status.inactive")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t("zone.radius")}:</span>
                    <span>{zone.radius} km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t("zone.deliveries")}:</span>
                    <span>{zone.deliveryCount}</span>
                  </div>
                  {zone.maxDeliveryTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t("zone.max_time")}:</span>
                      <span>{zone.maxDeliveryTime}min</span>
                    </div>
                  )}
                  {zone.additionalFee && zone.additionalFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t("zone.additional_fee")}:</span>
                      <span>{zone.additionalFee}€</span>
                    </div>
                  )}
                  {zone.averageDeliveryTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t("zone.avg_time")}:</span>
                      <span>{zone.averageDeliveryTime}min</span>
                    </div>
                  )}
                  {zone.successRate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t("zone.success_rate")}:</span>
                      <span>{zone.successRate}%</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingZone(zone)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {t("actions.edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleZoneStatus(zone.id, !zone.isActive)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {zone.isActive ? t("actions.deactivate") : t("actions.activate")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteZone(zone.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Zone Dialog */}
      {editingZone && (
        <Dialog open={!!editingZone} onOpenChange={() => setEditingZone(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("edit_dialog.title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">{t("edit_dialog.name")}</Label>
                <Input
                  id="editName"
                  value={editingZone.name}
                  onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editRadius">{t("edit_dialog.radius")}</Label>
                  <Input
                    id="editRadius"
                    type="number"
                    value={editingZone.radius}
                    onChange={(e) => setEditingZone({ ...editingZone, radius: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="editColor">{t("edit_dialog.color")}</Label>
                  <Input
                    id="editColor"
                    type="color"
                    value={editingZone.color}
                    onChange={(e) => setEditingZone({ ...editingZone, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editMaxTime">{t("edit_dialog.max_time")}</Label>
                  <Input
                    id="editMaxTime"
                    type="number"
                    value={editingZone.maxDeliveryTime || ''}
                    onChange={(e) => setEditingZone({ ...editingZone, maxDeliveryTime: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="editFee">{t("edit_dialog.additional_fee")}</Label>
                  <Input
                    id="editFee"
                    type="number"
                    step="0.01"
                    value={editingZone.additionalFee || ''}
                    onChange={(e) => setEditingZone({ ...editingZone, additionalFee: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={updateZone}>
                {t("edit_dialog.update")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}