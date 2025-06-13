"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Save,
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Calendar,
} from "lucide-react";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
// import { UserPermissionsForm } from '@/components/admin/users/user-permissions-form';
import { useToast } from "@/components/ui/use-toast";

// Schema de validation pour l'édition d'utilisateur
const editUserSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100, "Le nom est trop long"),
  email: z.string().email("Email invalide"),
  phoneNumber: z.string().optional(),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  notes: z.string().optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

export default function UserEditPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();

  // API réelle pour récupérer les détails utilisateur
  const {
    data: user,
    isLoading,
    error,
  } = api.admin.users.getUserDetail.useQuery({
    userId,
    includeDocuments: true,
    includeVerificationHistory: true,
    includeActivityLogs: false,
    includeLoginHistory: false,
    includeNotes: false,
    includePermissions: false,
    includeSubscriptions: false,
    includePaymentMethods: false,
    includeNotificationSettings: false,
  });

  // Debug: Afficher l'erreur dans la console
  if (error) {
    console.error("❌ Erreur getUserDetail:", error);
  }

  const updateUserStatusMutation = api.admin.users.updateUserStatus.useMutation(
    {
      onSuccess: () => {
        toast({
          title: "Statut mis à jour",
          description:
            "Le statut de l'utilisateur a été mis à jour avec succès.",
        });
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description:
            "Erreur lors de la mise à jour du statut: " + error.message,
          variant: "destructive",
        });
      },
    },
  );

  const updateUserRoleMutation = api.admin.users.updateUserRole.useMutation({
    onSuccess: () => {
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle de l'utilisateur a été mis à jour avec succès.",
      });
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du rôle: " + error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      role: user?.role || UserRole.CLIENT,
      status: user?.status || UserStatus.PENDING_VERIFICATION,
      notes: "",
    },
  });

  // Update form when user data loads
  if (user && !form.getValues().name) {
    form.reset({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      role: user.role,
      status: user.status,
      notes: "",
    });
  }

  const onSubmit = async (data: EditUserFormData) => {
    try {
      // Update status if changed
      if (data.status !== user?.status) {
        await updateUserStatusMutation.mutateAsync({
          userId,
          status: data.status,
          reason: data.notes || "Status updated by admin",
        });
      }

      // Update role if changed
      if (data.role !== user?.role) {
        await updateUserRoleMutation.mutateAsync({
          userId,
          role: data.role,
          reason: data.notes || "Role updated by admin",
        });
      }

      toast({
        title: "Utilisateur mis à jour",
        description:
          "Les informations de l'utilisateur ont été mises à jour avec succès.",
      });

      router.push(`/admin/users/${userId}`);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
    }
  };

  // Helper functions for badges
  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return <Badge className="bg-green-500">Actif</Badge>;
      case UserStatus.PENDING_VERIFICATION:
        return (
          <Badge className="bg-yellow-500">En attente de vérification</Badge>
        );
      case UserStatus.SUSPENDED:
        return <Badge className="bg-red-500">Suspendu</Badge>;
      case UserStatus.INACTIVE:
        return <Badge className="bg-gray-500">Inactif</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Badge className="bg-purple-500">Administrateur</Badge>;
      case UserRole.CLIENT:
        return <Badge className="bg-blue-500">Client</Badge>;
      case UserRole.DELIVERER:
        return <Badge className="bg-green-500">Livreur</Badge>;
      case UserRole.MERCHANT:
        return <Badge className="bg-orange-500">Commerçant</Badge>;
      case UserRole.PROVIDER:
        return <Badge className="bg-teal-500">Prestataire</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-72" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Utilisateur introuvable
          </h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <h2 className="text-xl font-semibold mb-4">
              L'utilisateur demandé est introuvable
            </h2>
            {/* Debug: Afficher les détails de l'erreur */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 font-medium">
                  Erreur technique:
                </p>
                <p className="text-sm text-red-500">{error.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Code: {error.data?.code}
                </p>
              </div>
            )}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">
                Debugging info:
              </p>
              <p className="text-xs text-gray-600">User ID: {userId}</p>
              <p className="text-xs text-gray-600">
                Loading: {isLoading ? "Oui" : "Non"}
              </p>
              <p className="text-xs text-gray-600">
                Error: {error ? "Oui" : "Non"}
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/users">
                Retour à la gestion des utilisateurs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          Éditer l'utilisateur
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{user.name}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2 text-base">
                {getRoleBadge(user.role)}
                {getStatusBadge(user.status)}
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-600 border-yellow-200"
                >
                  🧪 Mode Test
                </Badge>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/admin/users/${userId}`}>Voir les détails</Link>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Informations générales</TabsTrigger>
              <TabsTrigger
                value="permissions"
                disabled={user.role !== UserRole.ADMIN}
              >
                Permissions
              </TabsTrigger>
              <TabsTrigger value="activity">Activité</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom complet</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numéro de téléphone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rôle</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un rôle" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(UserRole).map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Statut</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un statut" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(UserStatus).map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status.replace("_", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes administratives</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes internes concernant cette modification..."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Ces notes seront enregistrées dans l'historique des
                          modifications.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        updateUserStatusMutation.isPending ||
                        updateUserRoleMutation.isPending
                      }
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateUserStatusMutation.isPending ||
                      updateUserRoleMutation.isPending
                        ? "Sauvegarde..."
                        : "Sauvegarder"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <Shield className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Permissions</h3>
                    <p>La gestion des permissions sera bientôt disponible.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Historique d'activité</CardTitle>
                  <CardDescription>
                    Dernières actions et modifications de l'utilisateur
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-8">
                    <Calendar className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Historique d'activité
                    </h3>
                    <p>Cette fonctionnalité sera bientôt disponible.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
