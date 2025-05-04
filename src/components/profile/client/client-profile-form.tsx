"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { SaveIcon, XIcon } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useProfileStore } from '@/store/use-profile-store';
import { updateClientProfileSchema, type UpdateClientProfile } from '@/schemas/profile.schema';

export function ClientProfileForm() {
  const { profile, roleSpecificProfile, updateProfile, isUpdatingProfile } = useProfile();
  const { setIsEditingProfile } = useProfileStore();
  
  const form = useForm<UpdateClientProfile>({
    resolver: zodResolver(updateClientProfileSchema),
    defaultValues: {
      name: profile?.name || '',
      email: profile?.email || '',
      phoneNumber: profile?.phoneNumber || '',
      address: roleSpecificProfile?.address || '',
      city: roleSpecificProfile?.city || '',
      state: roleSpecificProfile?.state || '',
      postalCode: roleSpecificProfile?.postalCode || '',
      country: roleSpecificProfile?.country || '',
      preferredLanguage: roleSpecificProfile?.preferredLanguage || '',
      newsletterOptIn: roleSpecificProfile?.newsletterOptIn || false,
    },
  });
  
  const onSubmit = (data: UpdateClientProfile) => {
    updateProfile(data);
    setIsEditingProfile(false);
  };
  
  const handleCancel = () => {
    setIsEditingProfile(false);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifier mon profil</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Votre nom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="votre.email@exemple.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="+33 6 01 02 03 04" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="123 rue des Lilas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input placeholder="Paris" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code postal</FormLabel>
                    <FormControl>
                      <Input placeholder="75001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Région / État</FormLabel>
                    <FormControl>
                      <Input placeholder="Île-de-France" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays</FormLabel>
                    <FormControl>
                      <Input placeholder="France" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="preferredLanguage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Langue préférée</FormLabel>
                  <FormControl>
                    <Input placeholder="fr" {...field} />
                  </FormControl>
                  <FormDescription>
                    Code langue (ex: fr, en, es)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="newsletterOptIn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Abonnement à la newsletter
                    </FormLabel>
                    <FormDescription>
                      Recevez nos actualités et promotions par email.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              type="button" 
              onClick={handleCancel}
            >
              <XIcon className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button 
              type="submit"
              disabled={isUpdatingProfile}
            >
              <SaveIcon className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 