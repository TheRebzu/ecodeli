"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Package, Plus, Eye, Edit, Trash2, Upload, Download, MapPin, Clock, Euro, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface MerchantAnnouncementManagerProps {
  merchantId: string;
}

interface Announcement {
  id: string;
  title: string;
  description: string;
  type: "package" | "bulk" | "recurring" | "express";
  status: "draft" | "published" | "paused" | "completed" | "cancelled";
  pickupAddress: string;
  deliveryAddress: string;
  weight: number;
  dimensions: string;
  fragile: boolean;
  urgent: boolean;
  estimatedPrice: number;
  maxPrice?: number;
  scheduledDate?: string;
  pickupTimeSlot?: string;
  deliveryTimeSlot?: string;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
  acceptedBids: number;
  totalViews: number;
  assignedDeliverer?: string;
}

interface BulkImportData {
  file: File | null;
  template: "standard" | "express" | "custom";
  mapping: Record<string, string>;
}

export default function AnnouncementManager({ merchantId }: MerchantAnnouncementManagerProps) {
  const t = useTranslations("merchant.announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    title: "",
    description: "",
    type: "package",
    pickupAddress: "",
    deliveryAddress: "",
    weight: 0,
    dimensions: "",
    fragile: false,
    urgent: false,
    estimatedPrice: 0,
    specialInstructions: ""
  });

  const [bulkImport, setBulkImport] = useState<BulkImportData>({
    file: null,
    template: "standard",
    mapping: {}
  });

  useEffect(() => {
    fetchAnnouncements();
  }, [merchantId]);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`/api/merchant/announcements?merchantId=${merchantId}`);
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    try {
      const response = await fetch("/api/merchant/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          ...newAnnouncement,
          status: "draft"
        })
      });

      if (response.ok) {
        await fetchAnnouncements();
        setShowCreateDialog(false);
        setNewAnnouncement({
          title: "",
          description: "",
          type: "package",
          pickupAddress: "",
          deliveryAddress: "",
          weight: 0,
          dimensions: "",
          fragile: false,
          urgent: false,
          estimatedPrice: 0,
          specialInstructions: ""
        });
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;

    try {
      const response = await fetch(`/api/merchant/announcements/${editingAnnouncement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAnnouncement)
      });

      if (response.ok) {
        await fetchAnnouncements();
        setEditingAnnouncement(null);
      }
    } catch (error) {
      console.error("Error updating announcement:", error);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm(t("confirm_delete"))) return;

    try {
      const response = await fetch(`/api/merchant/announcements/${announcementId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        await fetchAnnouncements();
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  const handleStatusChange = async (announcementId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/merchant/announcements/${announcementId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchAnnouncements();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImport.file) return;

    try {
      const formData = new FormData();
      formData.append("file", bulkImport.file);
      formData.append("merchantId", merchantId);
      formData.append("template", bulkImport.template);
      formData.append("mapping", JSON.stringify(bulkImport.mapping));

      const response = await fetch("/api/merchant/announcements/bulk", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        await fetchAnnouncements();
        setShowBulkDialog(false);
        setBulkImport({ file: null, template: "standard", mapping: {} });
      }
    } catch (error) {
      console.error("Error importing announcements:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", label: t("status.draft") },
      published: { color: "bg-green-100 text-green-800", label: t("status.published") },
      paused: { color: "bg-yellow-100 text-yellow-800", label: t("status.paused") },
      completed: { color: "bg-blue-100 text-blue-800", label: t("status.completed") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      package: { color: "bg-blue-100 text-blue-800", label: t("types.package") },
      bulk: { color: "bg-purple-100 text-purple-800", label: t("types.bulk") },
      recurring: { color: "bg-orange-100 text-orange-800", label: t("types.recurring") },
      express: { color: "bg-red-100 text-red-800", label: t("types.express") }
    };

    const config = typeConfig[type as keyof typeof typeConfig];
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    if (filterStatus !== "all" && announcement.status !== filterStatus) return false;
    if (filterType !== "all" && announcement.type !== filterType) return false;
    return true;
  });

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
            <p className="text-gray-600">{t("description")}</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  {t("actions.bulk_import")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("bulk_dialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("bulk_dialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template">{t("bulk_dialog.template")}</Label>
                    <Select value={bulkImport.template} onValueChange={(value) => setBulkImport({...bulkImport, template: value as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">{t("templates.standard")}</SelectItem>
                        <SelectItem value="express">{t("templates.express")}</SelectItem>
                        <SelectItem value="custom">{t("templates.custom")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="file">{t("bulk_dialog.file")}</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setBulkImport({...bulkImport, file: e.target.files?.[0] || null})}
                    />
                  </div>
                  <div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="/templates/announcement-template.xlsx" download>
                        <Download className="h-3 w-3 mr-1" />
                        {t("bulk_dialog.download_template")}
                      </a>
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleBulkImport} disabled={!bulkImport.file}>
                    {t("bulk_dialog.import")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("actions.create")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("create_dialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("create_dialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">{t("create_dialog.title_field")}</Label>
                      <Input
                        id="title"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">{t("create_dialog.type")}</Label>
                      <Select value={newAnnouncement.type} onValueChange={(value) => setNewAnnouncement({...newAnnouncement, type: value as any})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="package">{t("types.package")}</SelectItem>
                          <SelectItem value="bulk">{t("types.bulk")}</SelectItem>
                          <SelectItem value="recurring">{t("types.recurring")}</SelectItem>
                          <SelectItem value="express">{t("types.express")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">{t("create_dialog.description")}</Label>
                    <Textarea
                      id="description"
                      value={newAnnouncement.description}
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pickupAddress">{t("create_dialog.pickup_address")}</Label>
                      <Input
                        id="pickupAddress"
                        value={newAnnouncement.pickupAddress}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, pickupAddress: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryAddress">{t("create_dialog.delivery_address")}</Label>
                      <Input
                        id="deliveryAddress"
                        value={newAnnouncement.deliveryAddress}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, deliveryAddress: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="weight">{t("create_dialog.weight")}</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={newAnnouncement.weight}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, weight: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dimensions">{t("create_dialog.dimensions")}</Label>
                      <Input
                        id="dimensions"
                        value={newAnnouncement.dimensions}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, dimensions: e.target.value})}
                        placeholder="L x l x H"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">{t("create_dialog.price")}</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={newAnnouncement.estimatedPrice}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, estimatedPrice: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="fragile"
                        checked={newAnnouncement.fragile}
                        onCheckedChange={(checked) => setNewAnnouncement({...newAnnouncement, fragile: checked})}
                      />
                      <Label htmlFor="fragile">{t("create_dialog.fragile")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="urgent"
                        checked={newAnnouncement.urgent}
                        onCheckedChange={(checked) => setNewAnnouncement({...newAnnouncement, urgent: checked})}
                      />
                      <Label htmlFor="urgent">{t("create_dialog.urgent")}</Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="instructions">{t("create_dialog.instructions")}</Label>
                    <Textarea
                      id="instructions"
                      value={newAnnouncement.specialInstructions}
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, specialInstructions: e.target.value})}
                      placeholder={t("create_dialog.instructions_placeholder")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateAnnouncement}>
                    {t("create_dialog.create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            <SelectItem value="draft">{t("status.draft")}</SelectItem>
            <SelectItem value="published">{t("status.published")}</SelectItem>
            <SelectItem value="paused">{t("status.paused")}</SelectItem>
            <SelectItem value="completed">{t("status.completed")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            <SelectItem value="package">{t("types.package")}</SelectItem>
            <SelectItem value="bulk">{t("types.bulk")}</SelectItem>
            <SelectItem value="recurring">{t("types.recurring")}</SelectItem>
            <SelectItem value="express">{t("types.express")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">{t("tabs.active")}</TabsTrigger>
          <TabsTrigger value="drafts">{t("tabs.drafts")}</TabsTrigger>
          <TabsTrigger value="completed">{t("tabs.completed")}</TabsTrigger>
          <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {filteredAnnouncements.filter(a => ["published", "paused"].includes(a.status)).map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {announcement.title}
                      {announcement.urgent && <Badge variant="destructive">{t("urgent")}</Badge>}
                      {announcement.fragile && <Badge variant="outline">{t("fragile")}</Badge>}
                    </CardTitle>
                    <CardDescription>{announcement.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(announcement.type)}
                    {getStatusBadge(announcement.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{announcement.pickupAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-600" />
                    <span className="text-sm">{announcement.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    <span className="text-sm">€{announcement.estimatedPrice}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{t("accepted_bids")}: {announcement.acceptedBids}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">{t("total_views")}: {announcement.totalViews}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {announcement.weight}kg • {announcement.dimensions}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {t("created_at")}: {new Date(announcement.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      {t("actions.view")}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingAnnouncement(announcement)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {t("actions.edit")}
                    </Button>
                    <Select onValueChange={(value) => handleStatusChange(announcement.id, value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder={t("actions.change_status")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">{t("status.published")}</SelectItem>
                        <SelectItem value="paused">{t("status.paused")}</SelectItem>
                        <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {t("actions.delete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {filteredAnnouncements.filter(a => a.status === "draft").map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{announcement.title}</CardTitle>
                  {getStatusBadge(announcement.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{announcement.description}</span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingAnnouncement(announcement)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {t("actions.edit")}
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleStatusChange(announcement.id, "published")}
                    >
                      {t("actions.publish")}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {t("actions.delete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {filteredAnnouncements.filter(a => a.status === "completed").map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{announcement.title}</CardTitle>
                  {getStatusBadge(announcement.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{announcement.pickupAddress} → {announcement.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    <span className="text-sm">€{announcement.estimatedPrice}</span>
                  </div>
                </div>
                {announcement.assignedDeliverer && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">
                      {t("assigned_to")}: {announcement.assignedDeliverer}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{announcement.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(announcement.type)}
                    {getStatusBadge(announcement.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{announcement.pickupAddress} → {announcement.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    <span className="text-sm">€{announcement.estimatedPrice}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {filteredAnnouncements.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
            <p className="text-gray-600 text-center mb-4">{t("empty.description")}</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              {t("actions.create_first")}
            </Button>
          </CardContent>
        </Card>
      )}

      {editingAnnouncement && (
        <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("edit_dialog.title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <Label htmlFor="editTitle">{t("edit_dialog.title_field")}</Label>
                <Input
                  id="editTitle"
                  value={editingAnnouncement.title}
                  onChange={(e) => setEditingAnnouncement({...editingAnnouncement, title: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editDescription">{t("edit_dialog.description")}</Label>
                <Textarea
                  id="editDescription"
                  value={editingAnnouncement.description}
                  onChange={(e) => setEditingAnnouncement({...editingAnnouncement, description: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editPrice">{t("edit_dialog.price")}</Label>
                <Input
                  id="editPrice"
                  type="number"
                  step="0.01"
                  value={editingAnnouncement.estimatedPrice}
                  onChange={(e) => setEditingAnnouncement({...editingAnnouncement, estimatedPrice: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateAnnouncement}>
                {t("edit_dialog.update")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}