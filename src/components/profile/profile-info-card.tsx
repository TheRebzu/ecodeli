"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/hooks/use-profile';
import { useProfileStore } from '@/store/use-profile-store';
import { UserRole } from '@prisma/client';
import { formatDate } from '@/lib/utils';
import { SaveIcon, XIcon } from 'lucide-react';

interface InfoRowProps {
  label: string;
  value: string | number | null | undefined;
  isLoading?: boolean;
}

function InfoRow({ label, value, isLoading = false }: InfoRowProps) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-muted-foreground">{label}</span>
      {isLoading ? (
        <Skeleton className="h-5 w-32" />
      ) : (
        <span className="font-medium">{value || '—'}</span>
      )}
    </div>
  );
}

export function ProfileInfoCard() {
  const { profile, roleSpecificProfile, isLoadingProfile, isLoadingRoleProfile } = useProfile();
  const { isEditingProfile, setIsEditingProfile } = useProfileStore();
  
  const handleCancel = () => {
    setIsEditingProfile(false);
  };
  
  const getProfileFields = () => {
    if (!profile || !roleSpecificProfile) return [];
    
    // Champs communs à tous les rôles
    const commonFields = [
      { label: 'Nom', value: profile.name },
      { label: 'Email', value: profile.email },
      { label: 'Téléphone', value: profile.phoneNumber },
      { label: 'Inscrit depuis', value: formatDate(profile.createdAt) },
      { label: 'Dernière connexion', value: profile.lastLoginAt ? formatDate(profile.lastLoginAt) : 'Jamais' },
    ];
    
    // Champs spécifiques au rôle
    let roleFields: { label: string; value: any }[] = [];
    
    switch (profile.role) {
      case UserRole.CLIENT:
        const client = roleSpecificProfile;
        roleFields = [
          { label: 'Adresse', value: client.address },
          { label: 'Ville', value: client.city },
          { label: 'Code postal', value: client.postalCode },
          { label: 'Pays', value: client.country },
          { label: 'Langue préférée', value: client.preferredLanguage },
          { label: 'Newsletter', value: client.newsletterOptIn ? 'Oui' : 'Non' },
        ];
        break;
      
      case UserRole.DELIVERER:
        const deliverer = roleSpecificProfile;
        roleFields = [
          { label: 'Adresse', value: deliverer.address },
          { label: 'Type de véhicule', value: deliverer.vehicleType },
          { label: 'Plaque d\'immatriculation', value: deliverer.licensePlate },
          { label: 'Capacité maximale', value: deliverer.maxCapacity ? `${deliverer.maxCapacity} kg` : undefined },
          { label: 'Années d\'expérience', value: deliverer.yearsOfExperience },
          { label: 'Actif', value: deliverer.isActive ? 'Oui' : 'Non' },
          { label: 'Note', value: deliverer.rating ? `${deliverer.rating}/5` : 'Aucune note' },
        ];
        break;
      
      case UserRole.MERCHANT:
        const merchant = roleSpecificProfile;
        roleFields = [
          { label: 'Nom de l\'entreprise', value: merchant.companyName },
          { label: 'Adresse professionnelle', value: merchant.businessAddress },
          { label: 'Ville', value: merchant.businessCity },
          { label: 'Code postal', value: merchant.businessPostal },
          { label: 'Type d\'activité', value: merchant.businessType },
          { label: 'Numéro de TVA', value: merchant.vatNumber },
          { label: 'Site web', value: merchant.websiteUrl },
          { label: 'Description', value: merchant.description },
          { label: 'Année de fondation', value: merchant.foundingYear },
          { label: 'Nombre d\'employés', value: merchant.employeeCount },
        ];
        break;
      
      case UserRole.PROVIDER:
        const provider = roleSpecificProfile;
        roleFields = [
          { label: 'Nom de l\'entreprise', value: provider.companyName },
          { label: 'Adresse', value: provider.address },
          { label: 'Type de service', value: provider.serviceType },
          { label: 'Description', value: provider.description },
          { label: 'Disponibilité', value: provider.availability },
          { label: 'Rayon de service', value: provider.serviceRadius ? `${provider.serviceRadius} km` : undefined },
          { label: 'Années d\'activité', value: provider.yearsInBusiness },
          { label: 'Note', value: provider.rating ? `${provider.rating}/5` : 'Aucune note' },
        ];
        break;
      
      default:
        break;
    }
    
    return [...commonFields, ...roleFields];
  };
  
  if (isLoadingProfile || isLoadingRoleProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-7 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <InfoRow key={i} label={`Champ ${i}`} value="" isLoading={true} />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (!profile || !roleSpecificProfile) {
    return null;
  }
  
  const fields = getProfileFields();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {fields.map((field, index) => (
            <React.Fragment key={field.label}>
              <InfoRow label={field.label} value={field.value} />
              {index < fields.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
      {isEditingProfile && (
        <CardFooter className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            <XIcon className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button size="sm">
            <SaveIcon className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 