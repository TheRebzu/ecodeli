"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/components/ui/use-toast";
import { 
  CalendarIcon, 
  MapPin, 
  Package, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle,
  Warehouse,
  Key
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StorageBox {
  id: string;
  number: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  monthlyPrice: number;
  warehouse: {
    id: string;
    name: string;
    address: string;
    city: string;
  };
}

interface StorageReservation {
  id: string;
  storageBox: StorageBox;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  totalPrice: number;
  accessCode: string;
}

interface ReservationFormData {
  warehouseId: string;
  boxSize: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  duration: number;
}

export function BoxReservation() {
  const t = useTranslations("client.storage");
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [availableBoxes, setAvailableBoxes] = useState<StorageBox[]>([]);
  const [currentReservations, setCurrentReservations] = useState<StorageReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [formData, setFormData] = useState<ReservationFormData>({
    warehouseId: '',
    boxSize: '',
    startDate: undefined,
    endDate: undefined,
    duration: 1,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer les entrepôts
      const warehousesResponse = await fetch('/api/warehouses');
      if (warehousesResponse.ok) {
        const warehousesData = await warehousesResponse.json();
        setWarehouses(warehousesData.warehouses || []);
      }

      // Récupérer les réservations actuelles
      const reservationsResponse = await fetch('/api/storage/reservations');
      if (reservationsResponse.ok) {
        const reservationsData = await reservationsResponse.json();
        setCurrentReservations(reservationsData.reservations || []);
      }

      // Récupérer les box disponibles
      await fetchAvailableBoxes();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableBoxes = async (warehouseId?: string, boxSize?: string) => {
    try {
      const params = new URLSearchParams();
      if (warehouseId) params.append('warehouseId', warehouseId);
      if (boxSize) params.append('size', boxSize);
      params.append('status', 'AVAILABLE');

      const response = await fetch(`/api/storage/boxes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableBoxes(data.boxes || []);
      }
    } catch (error) {
      console.error('Error fetching available boxes:', error);
    }
  };

  const handleFormChange = (field: keyof ReservationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Mettre à jour les box disponibles quand les filtres changent
    if (field === 'warehouseId' || field === 'boxSize') {
      fetchAvailableBoxes(
        field === 'warehouseId' ? value : formData.warehouseId,
        field === 'boxSize' ? value : formData.boxSize
      );
    }
  };

  const handleReservation = async () => {
    if (!formData.warehouseId || !formData.boxSize || !formData.startDate || !formData.endDate) {
      toast({
        title: t("errors.missing_fields"),
        description: t("errors.please_fill_all"),
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: t("errors.not_authenticated"),
        description: t("errors.please_login"),
        variant: "destructive",
      });
      return;
    }

    setIsReserving(true);
    try {
      const response = await fetch('/api/storage/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouseId: formData.warehouseId,
          boxSize: formData.boxSize,
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate.toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        toast({
          title: t("reservation.success.title"),
          description: t("reservation.success.description"),
        });

        setShowReservationDialog(false);
        setFormData({
          warehouseId: '',
          boxSize: '',
          startDate: undefined,
          endDate: undefined,
          duration: 1,
        });

        // Rafraîchir les données
        await fetchData();
      } else {
        const error = await response.json();
        toast({
          title: t("reservation.error.title"),
          description: error.error || t("reservation.error.description"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: t("reservation.error.title"),
        description: t("reservation.error.network"),
        variant: "destructive",
      });
    } finally {
      setIsReserving(false);
    }
  };

  const getSizeLabel = (size: string) => {
    const labels: Record<string, string> = {
      'SMALL': t("sizes.small"),
      'MEDIUM': t("sizes.medium"),
      'LARGE': t("sizes.large"),
      'EXTRA_LARGE': t("sizes.extra_large"),
    };
    return labels[size] || size;
  };

  const getSizeColor = (size: string) => {
    const colors: Record<string, string> = {
      'SMALL': 'bg-blue-100 text-blue-800',
      'MEDIUM': 'bg-green-100 text-green-800',
      'LARGE': 'bg-orange-100 text-orange-800',
      'EXTRA_LARGE': 'bg-purple-100 text-purple-800',
    };
    return colors[size] || 'bg-gray-100 text-gray-800';
  };

  const calculateTotalPrice = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const days = Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.ceil(days / 30);
    
    // Prix moyen par mois selon la taille
    const monthlyPrices: Record<string, number> = {
      'SMALL': 25,
      'MEDIUM': 45,
      'LARGE': 75,
      'EXTRA_LARGE': 120,
    };
    
    const monthlyPrice = monthlyPrices[formData.boxSize] || 0;
    return monthlyPrice * months;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Réservations actuelles */}
      {currentReservations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-primary" />
              <span>{t("current_reservations")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentReservations.map((reservation) => (
                <Card key={reservation.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getSizeColor(reservation.storageBox.size)}>
                        {getSizeLabel(reservation.storageBox.size)}
                      </Badge>
                      <Badge variant={reservation.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {t(`status.${reservation.status.toLowerCase()}`)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Warehouse className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{reservation.storageBox.warehouse.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{t("box")} {reservation.storageBox.number}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {format(new Date(reservation.startDate), 'dd/MM/yyyy')} - {format(new Date(reservation.endDate), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{reservation.totalPrice}€</span>
                      </div>
                      
                      {reservation.status === 'ACTIVE' && (
                        <div className="flex items-center space-x-2">
                          <Key className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-mono">{reservation.accessCode}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Réserver un box */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-primary" />
            <span>{t("reserve_box")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="warehouse">{t("warehouse")}</Label>
              <Select value={formData.warehouseId} onValueChange={(value) => handleFormChange('warehouseId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("select_warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">{t("box_size")}</Label>
              <Select value={formData.boxSize} onValueChange={(value) => handleFormChange('boxSize', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("select_size")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMALL">{t("sizes.small")} (1m³)</SelectItem>
                  <SelectItem value="MEDIUM">{t("sizes.medium")} (2m³)</SelectItem>
                  <SelectItem value="LARGE">{t("sizes.large")} (4m³)</SelectItem>
                  <SelectItem value="EXTRA_LARGE">{t("sizes.extra_large")} (8m³)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>{t("start_date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? (
                      format(formData.startDate, "PPP", { locale: fr })
                    ) : (
                      <span className="text-muted-foreground">{t("select_start_date")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => handleFormChange('startDate', date)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("end_date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? (
                      format(formData.endDate, "PPP", { locale: fr })
                    ) : (
                      <span className="text-muted-foreground">{t("select_end_date")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => handleFormChange('endDate', date)}
                    disabled={(date) => date <= (formData.startDate || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {formData.startDate && formData.endDate && (
            <Alert className="mb-4">
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span>{t("duration")}: {Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24))} {t("days")}</span>
                  <span className="font-bold">{t("total_price")}: {calculateTotalPrice()}€</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={() => setShowReservationDialog(true)}
            disabled={!formData.warehouseId || !formData.boxSize || !formData.startDate || !formData.endDate}
            className="w-full"
          >
            {t("reserve_now")}
          </Button>
        </CardContent>
      </Card>

      {/* Box disponibles */}
      {availableBoxes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("available_boxes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableBoxes.map((box) => (
                <Card key={box.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getSizeColor(box.size)}>
                        {getSizeLabel(box.size)}
                      </Badge>
                      <Badge variant="secondary">
                        {t("available")}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Warehouse className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{box.warehouse.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{box.warehouse.city}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{t("box")} {box.number}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{box.monthlyPrice}€/{t("month")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmation */}
      <Dialog open={showReservationDialog} onOpenChange={setShowReservationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirm_reservation")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t("reservation.confirm.description")}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t("warehouse")}:</span>
                <span>{warehouses.find(w => w.id === formData.warehouseId)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("box_size")}:</span>
                <span>{getSizeLabel(formData.boxSize)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("duration")}:</span>
                <span>
                  {formData.startDate && formData.endDate && 
                    `${Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24))} ${t("days")}`
                  }
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>{t("total_price")}:</span>
                <span>{calculateTotalPrice()}€</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowReservationDialog(false)}
                disabled={isReserving}
              >
                {t("cancel")}
              </Button>
              <Button 
                onClick={handleReservation}
                disabled={isReserving}
              >
                {isReserving ? t("processing") : t("confirm_reservation")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 