"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Repeat
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { TimePickerDemo } from "@/components/ui/time-picker";

interface AvailabilitySlot {
  id?: string;
  date: Date;
  startTime: string;
  endTime: string;
  maxCapacity?: number;
  location?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringType?: "weekly" | "monthly";
  recurringEndDate?: Date;
}

const DAYS_OF_WEEK = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

export default function AvailabilityCalendar() {
  const t = useTranslations("deliverer.planning.availability");
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  
  const [newSlot, setNewSlot] = useState<AvailabilitySlot>({
    date: new Date(),
    startTime: "09:00",
    endTime: "17:00",
    maxCapacity: 5,
    location: "",
    notes: "",
    isRecurring: false,
    recurringType: "weekly"
  });

  // Récupération des disponibilités du mois courant
  const { 
    data: availabilities, 
    isLoading, 
    refetch 
  } = trpc.deliverer.availability.getMonthlyAvailability.useQuery({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1
  });

  // Mutations
  const createAvailabilityMutation = trpc.deliverer.availability.createAvailability.useMutation({
    onSuccess: () => {
      toast({ title: t("success.created"), description: t("success.createdDesc") });
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({
        title: t("error.create"),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateAvailabilityMutation = trpc.deliverer.availability.updateAvailability.useMutation({
    onSuccess: () => {
      toast({ title: t("success.updated"), description: t("success.updatedDesc") });
      setIsDialogOpen(false);
      setEditingSlot(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({
        title: t("error.update"),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteAvailabilityMutation = trpc.deliverer.availability.deleteAvailability.useMutation({
    onSuccess: () => {
      toast({ title: t("success.deleted"), description: t("success.deletedDesc") });
      refetch();
    },
    onError: (error) => {
      toast({
        title: t("error.delete"),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setNewSlot({
      date: selectedDate || new Date(),
      startTime: "09:00",
      endTime: "17:00",
      maxCapacity: 5,
      location: "",
      notes: "",
      isRecurring: false,
      recurringType: "weekly"
    });
  };

  const getCalendarDays = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
    
    const days = [];
    let currentDay = new Date(startDate);
    
    // Génération de 42 jours (6 semaines)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  const getAvailabilitiesForDate = (date: Date) => {
    if (!availabilities) return [];
    
    return availabilities.filter(availability => {
      const availDate = new Date(availability.date);
      return availDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setNewSlot(prev => ({ ...prev, date }));
  };

  const handleCreateAvailability = () => {
    createAvailabilityMutation.mutate({
      date: newSlot.date,
      startTime: newSlot.startTime,
      endTime: newSlot.endTime,
      maxCapacity: newSlot.maxCapacity || 5,
      location: newSlot.location || undefined,
      notes: newSlot.notes || undefined,
      isRecurring: newSlot.isRecurring || false,
      recurringType: newSlot.recurringType,
      recurringEndDate: newSlot.recurringEndDate
    });
  };

  const handleEditAvailability = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setNewSlot(slot);
    setIsDialogOpen(true);
  };

  const handleUpdateAvailability = () => {
    if (!editingSlot?.id) return;
    
    updateAvailabilityMutation.mutate({
      id: editingSlot.id,
      date: newSlot.date,
      startTime: newSlot.startTime,
      endTime: newSlot.endTime,
      maxCapacity: newSlot.maxCapacity || 5,
      location: newSlot.location || undefined,
      notes: newSlot.notes || undefined
    });
  };

  const handleDeleteAvailability = (slotId: string) => {
    if (confirm(t("confirmDelete"))) {
      deleteAvailabilityMutation.mutate({ id: slotId });
    }
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getDayStatusColor = (date: Date) => {
    const availabilitiesForDay = getAvailabilitiesForDate(date);
    if (availabilitiesForDay.length === 0) return "";
    
    const totalCapacity = availabilitiesForDay.reduce((sum, avail) => sum + (avail.maxCapacity || 0), 0);
    const bookedSlots = availabilitiesForDay.reduce((sum, avail) => sum + (avail.bookedCount || 0), 0);
    
    const utilizationRate = totalCapacity > 0 ? bookedSlots / totalCapacity : 0;
    
    if (utilizationRate >= 0.8) return "bg-red-100 border-red-300";
    if (utilizationRate >= 0.5) return "bg-yellow-100 border-yellow-300";
    return "bg-green-100 border-green-300";
  };

  return (
    <div className="space-y-6">
      {/* En-tête du calendrier */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>{t("title")}</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-lg font-semibold min-w-[200px] text-center">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => {
                    resetForm();
                    setEditingSlot(null);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addAvailability")}
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSlot ? t("editAvailability") : t("addAvailability")}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">{t("form.date")}</label>
                      <Input
                        type="date"
                        value={newSlot.date.toISOString().split('T')[0]}
                        onChange={(e) => 
                          setNewSlot(prev => ({ ...prev, date: new Date(e.target.value) }))
                        }
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">{t("form.startTime")}</label>
                        <Input
                          type="time"
                          value={newSlot.startTime}
                          onChange={(e) => 
                            setNewSlot(prev => ({ ...prev, startTime: e.target.value }))
                          }
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">{t("form.endTime")}</label>
                        <Input
                          type="time"
                          value={newSlot.endTime}
                          onChange={(e) => 
                            setNewSlot(prev => ({ ...prev, endTime: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">{t("form.maxCapacity")}</label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={newSlot.maxCapacity}
                        onChange={(e) => 
                          setNewSlot(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) }))
                        }
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">{t("form.location")}</label>
                      <Input
                        placeholder={t("form.locationPlaceholder")}
                        value={newSlot.location}
                        onChange={(e) => 
                          setNewSlot(prev => ({ ...prev, location: e.target.value }))
                        }
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">{t("form.notes")}</label>
                      <Textarea
                        placeholder={t("form.notesPlaceholder")}
                        value={newSlot.notes}
                        onChange={(e) => 
                          setNewSlot(prev => ({ ...prev, notes: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>
                    
                    {!editingSlot && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="recurring"
                            checked={newSlot.isRecurring}
                            onCheckedChange={(checked) => 
                              setNewSlot(prev => ({ ...prev, isRecurring: checked as boolean }))
                            }
                          />
                          <label htmlFor="recurring" className="text-sm font-medium">
                            {t("form.recurring")}
                          </label>
                        </div>
                        
                        {newSlot.isRecurring && (
                          <div className="space-y-3 pl-6">
                            <div>
                              <label className="text-sm font-medium">{t("form.recurringType")}</label>
                              <Select
                                value={newSlot.recurringType}
                                onValueChange={(value: "weekly" | "monthly") => 
                                  setNewSlot(prev => ({ ...prev, recurringType: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weekly">{t("form.weekly")}</SelectItem>
                                  <SelectItem value="monthly">{t("form.monthly")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">{t("form.recurringEndDate")}</label>
                              <Input
                                type="date"
                                value={newSlot.recurringEndDate?.toISOString().split('T')[0] || ""}
                                onChange={(e) => 
                                  setNewSlot(prev => ({ 
                                    ...prev, 
                                    recurringEndDate: e.target.value ? new Date(e.target.value) : undefined 
                                  }))
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        {t("cancel")}
                      </Button>
                      <Button
                        onClick={editingSlot ? handleUpdateAvailability : handleCreateAvailability}
                        disabled={createAvailabilityMutation.isLoading || updateAvailabilityMutation.isLoading}
                      >
                        {editingSlot ? t("update") : t("create")}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Vue calendrier */}
      <Card>
        <CardContent className="p-6">
          {/* En-têtes des jours */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {DAYS_OF_WEEK.map((day) => (
              <div 
                key={day} 
                className="p-2 text-center text-sm font-medium text-gray-500 uppercase"
              >
                {t(`days.${day}`)}
              </div>
            ))}
          </div>
          
          {/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-1">
            {getCalendarDays().map((date, index) => {
              const availabilitiesForDay = getAvailabilitiesForDate(date);
              const dayStatusColor = getDayStatusColor(date);
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors
                    ${!isCurrentMonth(date) ? "text-gray-400 bg-gray-50" : ""}
                    ${isToday(date) ? "ring-2 ring-blue-500" : ""}
                    ${selectedDate?.toDateString() === date.toDateString() ? "bg-blue-50 border-blue-300" : ""}
                    ${dayStatusColor}
                    hover:bg-gray-50
                  `}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-medium ${
                      isToday(date) ? "text-blue-600" : ""
                    }`}>
                      {date.getDate()}
                    </span>
                    
                    {availabilitiesForDay.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {availabilitiesForDay.length}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {availabilitiesForDay.slice(0, 2).map((availability) => (
                      <div
                        key={availability.id}
                        className="group relative"
                      >
                        <div className="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {availability.startTime}-{availability.endTime}
                            </span>
                          </div>
                          {availability.location && (
                            <div className="flex items-center space-x-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{availability.location}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions au survol */}
                        <div className="absolute right-0 top-0 hidden group-hover:flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAvailability(availability);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAvailability(availability.id!);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {availabilitiesForDay.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{availabilitiesForDay.length - 2} {t("more")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Légende */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>{t("legend.available")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>{t("legend.partiallyBooked")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span>{t("legend.fullyBooked")}</span>
              </div>
            </div>
            
            <div className="text-gray-500">
              {t("clickToAddAvailability")}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
