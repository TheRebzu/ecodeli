"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { SaveIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import { useProfile } from '@/hooks/use-profile';
import { UpdateUserPreferences } from '@/schemas/user-preferences.schema';

export function ProfilePreferences() {
  const { profile, isLoadingProfile } = useProfile();
  
  // État local pour stocker les préférences
  const [formState, setFormState] = useState({
    locale: 'fr',
    theme: 'system',
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    contactlessDelivery: false,
    deliveryInstructions: '',
  });
  
  // Initialiser les préférences à partir du profil
  useEffect(() => {
    if (profile) {
      setFormState({
        locale: profile.locale || 'fr',
        theme: profile.theme || 'system',
        emailNotifications: profile.emailNotifications !== false,
        pushNotifications: profile.pushNotifications !== false,
        smsNotifications: profile.smsNotifications === true,
        contactlessDelivery: profile.contactlessDelivery === true,
        deliveryInstructions: profile.deliveryInstructions || '',
      });
    }
  }, [profile]);
  
  // Mutation pour mettre à jour les préférences
  const updatePreferencesMutation = api.userPreferences.updateUserPreferences.useMutation({
    onSuccess: () => {
      toast.success('Préférences mises à jour avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour des préférences: ${error.message}`);
    }
  });
  
  // Mise à jour de l'état du formulaire
  const updateFormState = (key: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Convertir les préférences au format attendu par l'API
    const apiPrefs: Partial<UpdateUserPreferences> = {};
    
    if (key === 'locale') {
      apiPrefs.locale = value;
    }
    
    // Envoyer immédiatement la mise à jour
    if (Object.keys(apiPrefs).length > 0) {
      updatePreferencesMutation.mutate(apiPrefs);
    }
  };
  
  if (isLoadingProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-7 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Apparence</h3>
          
          <div className="grid gap-2">
            <Label htmlFor="theme">Thème</Label>
            <Select 
              value={formState.theme} 
              onValueChange={(value) => updateFormState('theme', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un thème" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Clair</SelectItem>
                <SelectItem value="dark">Sombre</SelectItem>
                <SelectItem value="system">Système</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="font-medium">Notifications</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="emailNotifications">Notifications par email</Label>
            <Switch 
              id="emailNotifications" 
              checked={formState.emailNotifications}
              onCheckedChange={(checked) => updateFormState('emailNotifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="pushNotifications">Notifications push</Label>
            <Switch 
              id="pushNotifications" 
              checked={formState.pushNotifications}
              onCheckedChange={(checked) => updateFormState('pushNotifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="smsNotifications">Notifications SMS</Label>
            <Switch 
              id="smsNotifications" 
              checked={formState.smsNotifications}
              onCheckedChange={(checked) => updateFormState('smsNotifications', checked)}
            />
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="font-medium">Langue</h3>
          
          <RadioGroup 
            value={formState.locale} 
            onValueChange={(value) => updateFormState('locale', value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fr" id="fr" />
              <Label htmlFor="fr">Français</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="en" />
              <Label htmlFor="en">English</Label>
            </div>
          </RadioGroup>
        </div>
        
        {profile?.role === 'CLIENT' && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <h3 className="font-medium">Préférences de livraison</h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="contactlessDelivery">Livraison sans contact</Label>
                <Switch 
                  id="contactlessDelivery" 
                  checked={formState.contactlessDelivery}
                  onCheckedChange={(checked) => updateFormState('contactlessDelivery', checked)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="deliveryInstructions">Instructions de livraison par défaut</Label>
                <textarea 
                  id="deliveryInstructions"
                  className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Instructions pour le livreur..."
                  value={formState.deliveryInstructions}
                  onChange={(e) => updateFormState('deliveryInstructions', e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
      {updatePreferencesMutation.isPending && (
        <CardFooter>
          <div className="text-sm text-muted-foreground">Enregistrement des préférences...</div>
        </CardFooter>
      )}
    </Card>
  );
} 