import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { SaveIcon, XIcon } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useProfileStore } from '@/store/use-profile-store';
import { updateMerchantProfileSchema, type UpdateMerchantProfile } from '@/schemas/profile.schema';

export function MerchantProfileForm() {
  const { profile, roleSpecificProfile, updateProfile, isUpdatingProfile } = useProfile();
  const { setIsEditingProfile } = useProfileStore();

  const form = useForm<UpdateMerchantProfile>({
    resolver: zodResolver(updateMerchantProfileSchema),
    defaultValues: {
      companyName: roleSpecificProfile?.companyName || '',
      businessAddress: roleSpecificProfile?.businessAddress || '',
      vatNumber: roleSpecificProfile?.vatNumber || '',
    },
  });

  const onSubmit = (data: UpdateMerchantProfile) => {
    updateProfile(data);
    setIsEditingProfile(false);
  };

  const handleCancel = () => {
    setIsEditingProfile(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifier mon profil commerçant</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'entreprise</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom de l'entreprise" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse professionnelle</FormLabel>
                  <FormControl>
                    <Input placeholder="Adresse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vatNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de TVA</FormLabel>
                  <FormControl>
                    <Input placeholder="Numéro de TVA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={handleCancel}>
              <XIcon className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button type="submit" disabled={isUpdatingProfile}>
              <SaveIcon className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
