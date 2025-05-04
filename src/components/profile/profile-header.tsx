"use client";

import React from 'react';
import { useProfile } from '@/hooks/use-profile';
import { useProfileStore } from '@/store/use-profile-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EditIcon, UserIcon, FileIcon, HomeIcon, SettingsIcon, ShieldIcon } from 'lucide-react';
import { UserRole } from '@prisma/client';
import { cn } from '@/lib/utils';

const getRoleBadge = (role: UserRole) => {
  const roleColors = {
    CLIENT: 'bg-blue-100 text-blue-800 border-blue-300',
    DELIVERER: 'bg-green-100 text-green-800 border-green-300',
    MERCHANT: 'bg-purple-100 text-purple-800 border-purple-300',
    PROVIDER: 'bg-orange-100 text-orange-800 border-orange-300',
    ADMIN: 'bg-red-100 text-red-800 border-red-300',
  };

  const roleLabels = {
    CLIENT: 'Client',
    DELIVERER: 'Livreur',
    MERCHANT: 'Commerçant',
    PROVIDER: 'Prestataire',
    ADMIN: 'Administrateur',
  };

  return (
    <Badge className={cn('ml-2', roleColors[role])}>
      {roleLabels[role]}
    </Badge>
  );
};

export function ProfileHeader() {
  const { profile, isLoadingProfile } = useProfile();
  const { profileView, setProfileView, getAvailableSections, setIsEditingProfile } = useProfileStore();
  
  const handleEdit = () => {
    setIsEditingProfile(true);
  };
  
  const tabs = profile ? getAvailableSections(profile.role) : [];
  
  const tabIcons = {
    info: <UserIcon className="h-4 w-4 mr-2" />,
    documents: <FileIcon className="h-4 w-4 mr-2" />,
    addresses: <HomeIcon className="h-4 w-4 mr-2" />,
    preferences: <SettingsIcon className="h-4 w-4 mr-2" />,
    security: <ShieldIcon className="h-4 w-4 mr-2" />,
  };
  
  const tabLabels = {
    info: 'Informations',
    documents: 'Documents',
    addresses: 'Adresses',
    preferences: 'Préférences',
    security: 'Sécurité',
  };
  
  if (isLoadingProfile) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="ml-4 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!profile) {
    return null;
  }
  
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.image || ''} alt={profile.name} />
              <AvatarFallback>
                {profile.name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="ml-4">
              <h1 className="text-xl font-semibold flex items-center">
                {profile.name}
                {getRoleBadge(profile.role)}
              </h1>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleEdit} className="flex items-center">
            <EditIcon className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>
        <Separator className="my-4" />
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant={profileView === tab ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setProfileView(tab)}
              className="flex items-center"
            >
              {tabIcons[tab]}
              {tabLabels[tab]}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 