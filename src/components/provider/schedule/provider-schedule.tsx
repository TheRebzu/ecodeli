"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Save,
  CheckCircle,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type TimeSlot = {
  day: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  zones: string[];
};

type AvailabilityPreset = {
  id: string;
  name: string;
  schedule: TimeSlot[];
};

export function ProviderSchedule() {
  const t = useTranslations();
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);
  
  // Récupération des données depuis l'API
  const {
    data: scheduleData,
    isLoading,
    error,
    refetch,
  } = api.provider.getSchedule.useQuery();

  // Mutation pour sauvegarder le planning
  const updateScheduleMutation = api.provider.updateSchedule.useMutation({
    onSuccess: () => {
      toast({
        title: "Planning sauvegardé",
        description: "Vos disponibilités ont été mises à jour avec succès",
      });
      setHasChanges(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder le planning",
        variant: "destructive",
      });
    },
  });

  // États locaux initialisés à partir des données API
  const [weeklySchedule, setWeeklySchedule] = useState<TimeSlot[]>([
    { day: "Lundi", startTime: "09:00", endTime: "17:00", isAvailable: true, zones: [] },
    { day: "Mardi", startTime: "09:00", endTime: "17:00", isAvailable: true, zones: [] },
    { day: "Mercredi", startTime: "09:00", endTime: "17:00", isAvailable: true, zones: [] },
    { day: "Jeudi", startTime: "09:00", endTime: "17:00", isAvailable: true, zones: [] },
    { day: "Vendredi", startTime: "09:00", endTime: "17:00", isAvailable: true, zones: [] },
    { day: "Samedi", startTime: "10:00", endTime: "16:00", isAvailable: false, zones: [] },
    { day: "Dimanche", startTime: "10:00", endTime: "16:00", isAvailable: false, zones: [] }
  ]);

  const [selectedZones, setSelectedZones] = useState<string[]>([]);

  // Mise à jour des états quand les données arrivent
  useEffect(() => {
    if (scheduleData?.availability && scheduleData.availability.length > 0) {
      const apiSchedule = scheduleData.availability.map((slot: any) => ({
        day: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable,
        zones: scheduleData.zones || [],
      }));
      
      // Merger avec les jours manquants
      const allDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
      const completeSchedule = allDays.map(day => {
        const existing = apiSchedule.find((slot: TimeSlot) => slot.day === day);
        return existing || { 
          day, 
          startTime: "09:00", 
          endTime: "17:00", 
          isAvailable: false, 
          zones: [] 
        };
      });
      
      setWeeklySchedule(completeSchedule);
    }
    
    if (scheduleData?.zones) {
      setSelectedZones(scheduleData.zones);
    }
  }, [scheduleData]);

  const availabilityPresets: AvailabilityPreset[] = [
    {
      id: "standard",
      name: "Horaires standards (9h-17h)",
      schedule: [
        { day: "Lundi", startTime: "09:00", endTime: "17:00", isAvailable: true, zones: selectedZones },
        { day: "Mardi", startTime: "09:00", endTime: "17:00", isAvailable: true, zones: selectedZones },
        { day: "Mercredi", startTime: "09:00", endTime: "17:00", isAvailable: true, zones: selectedZones },
        { day: "Jeudi", startTime: "09:00", endTime: "17:00", isAvailable: true, zones: selectedZones },
        { day: "Vendredi", startTime: "09:00", endTime: "17:00", isAvailable: true, zones: selectedZones },
        { day: "Samedi", startTime: "10:00", endTime: "16:00", isAvailable: false, zones: [] },
        { day: "Dimanche", startTime: "10:00", endTime: "16:00", isAvailable: false, zones: [] }
      ]
    },
    {
      id: "flexible",
      name: "Horaires flexibles (8h-20h)",
      schedule: [
        { day: "Lundi", startTime: "08:00", endTime: "20:00", isAvailable: true, zones: selectedZones },
        { day: "Mardi", startTime: "08:00", endTime: "20:00", isAvailable: true, zones: selectedZones },
        { day: "Mercredi", startTime: "08:00", endTime: "20:00", isAvailable: true, zones: selectedZones },
        { day: "Jeudi", startTime: "08:00", endTime: "20:00", isAvailable: true, zones: selectedZones },
        { day: "Vendredi", startTime: "08:00", endTime: "20:00", isAvailable: true, zones: selectedZones },
        { day: "Samedi", startTime: "09:00", endTime: "18:00", isAvailable: true, zones: selectedZones },
        { day: "Dimanche", startTime: "10:00", endTime: "16:00", isAvailable: false, zones: [] }
      ]
    },
    {
      id: "weekend",
      name: "Week-ends uniquement",
      schedule: [
        { day: "Lundi", startTime: "09:00", endTime: "17:00", isAvailable: false, zones: [] },
        { day: "Mardi", startTime: "09:00", endTime: "17:00", isAvailable: false, zones: [] },
        { day: "Mercredi", startTime: "09:00", endTime: "17:00", isAvailable: false, zones: [] },
        { day: "Jeudi", startTime: "09:00", endTime: "17:00", isAvailable: false, zones: [] },
        { day: "Vendredi", startTime: "09:00", endTime: "17:00", isAvailable: false, zones: [] },
        { day: "Samedi", startTime: "09:00", endTime: "18:00", isAvailable: true, zones: selectedZones },
        { day: "Dimanche", startTime: "10:00", endTime: "17:00", isAvailable: true, zones: selectedZones }
      ]
    }
  ];

  const availableZones = [
    "Paris", "Lyon", "Marseille", "Toulouse", "Nice", 
    "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"
  ];

  const updateTimeSlot = (day: string, updates: Partial<Omit<TimeSlot, 'day'>>) => {
    setWeeklySchedule(prev => 
      prev.map(slot => 
        slot.day === day ? { ...slot, ...updates } : slot
      )
    );
    setHasChanges(true);
  };

  const applyPreset = (presetId: string) => {
    const preset = availabilityPresets.find(p => p.id === presetId);
    if (preset) {
      setWeeklySchedule(preset.schedule);
      setHasChanges(true);
      toast({
        title: "Modèle appliqué",
        description: `Le modèle "${preset.name}" a été appliqué à votre planning`,
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateScheduleMutation.mutateAsync({
        schedule: weeklySchedule,
      });
    } catch (error) {
      // L'erreur est gérée dans onError
    }
  };

  const getStatusBadge = (isAvailable: boolean) => {
    return (
      <Badge variant={isAvailable ? "default" : "secondary"}>
        {isAvailable ? "Disponible" : "Indisponible"}
      </Badge>
    );
  };

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
          <p className="text-muted-foreground text-center mb-4">
            Impossible de charger votre planning
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ Vous avez des modifications non sauvegardées
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateScheduleMutation.isPending}
        >
          {updateScheduleMutation.isPending ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Sauvegarder
        </Button>
      </div>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Planning hebdomadaire
          </TabsTrigger>
          <TabsTrigger value="zones" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Zones de service
          </TabsTrigger>
          <TabsTrigger value="presets" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Modèles prédéfinis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>Planning Hebdomadaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {weeklySchedule.map((slot) => (
                <div key={slot.day} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="min-w-[100px]">
                      <Label className="font-medium">{slot.day}</Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={slot.isAvailable}
                        onCheckedChange={(checked) => 
                          updateTimeSlot(slot.day, { isAvailable: checked, zones: checked ? selectedZones : [] })
                        }
                      />
                      {getStatusBadge(slot.isAvailable)}
                    </div>
                  </div>

                  {slot.isAvailable && (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">De</Label>
                        <Select 
                          value={slot.startTime} 
                          onValueChange={(value) => 
                            updateTimeSlot(slot.day, { startTime: value })
                          }
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                {`${i.toString().padStart(2, '0')}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm">À</Label>
                        <Select 
                          value={slot.endTime} 
                          onValueChange={(value) => 
                            updateTimeSlot(slot.day, { endTime: value })
                          }
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                {`${i.toString().padStart(2, '0')}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Zones</Label>
                        <div className="flex gap-1">
                          {slot.zones.length > 0 ? (
                            slot.zones.slice(0, 2).map(zone => (
                              <Badge key={zone} variant="outline" className="text-xs">
                                {zone}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Aucune
                            </Badge>
                          )}
                          {slot.zones.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{slot.zones.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones">
          <Card>
            <CardHeader>
              <CardTitle>Zones de Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableZones.map(zone => (
                  <div key={zone} className="flex items-center space-x-2">
                    <Switch
                      checked={selectedZones.includes(zone)}
                      onCheckedChange={(checked) => {
                        let newZones;
                        if (checked) {
                          newZones = [...selectedZones, zone];
                        } else {
                          newZones = selectedZones.filter(z => z !== zone);
                        }
                        setSelectedZones(newZones);
                        
                        // Mettre à jour toutes les créneaux disponibles
                        setWeeklySchedule(prev => 
                          prev.map(slot => 
                            slot.isAvailable ? { ...slot, zones: newZones } : slot
                          )
                        );
                        setHasChanges(true);
                      }}
                    />
                    <Label className="text-sm">{zone}</Label>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <h4 className="font-medium mb-2">Zones sélectionnées :</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedZones.length > 0 ? (
                    selectedZones.map(zone => (
                      <Badge key={zone} variant="default">
                        {zone}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">Aucune zone sélectionnée</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presets">
          <Card>
            <CardHeader>
              <CardTitle>Modèles Prédéfinis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {availabilityPresets.map(preset => (
                  <div key={preset.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{preset.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {preset.schedule.filter(s => s.isAvailable).length} jours disponibles
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => applyPreset(preset.id)}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Appliquer
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array(7).fill(0).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}