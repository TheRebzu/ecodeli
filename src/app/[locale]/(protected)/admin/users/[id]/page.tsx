'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole, UserStatus } from '@prisma/client';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  Shield,
  User as UserIcon,
  MapPin,
  Check,
  X,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ForceActivateDelivererButton from '@/components/admin/users/force-activate-deliverer-button';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [dialogAction, setDialogAction] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  const { data: user, isLoading } = api.adminUser.getUserDetail.useQuery({ userId });
  const updateUserStatusMutation = api.adminUser.updateUserStatus.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  // Helper functions to show status/role badges
  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return <Badge className="bg-green-500">Active</Badge>;
      case UserStatus.PENDING_VERIFICATION:
        return <Badge className="bg-yellow-500">Pending Verification</Badge>;
      case UserStatus.SUSPENDED:
        return <Badge className="bg-red-500">Suspended</Badge>;
      case UserStatus.INACTIVE:
        return <Badge className="bg-gray-500">Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Badge className="bg-purple-500">Administrator</Badge>;
      case UserRole.CLIENT:
        return <Badge className="bg-blue-500">Client</Badge>;
      case UserRole.DELIVERER:
        return <Badge className="bg-green-500">Deliverer</Badge>;
      case UserRole.MERCHANT:
        return <Badge className="bg-orange-500">Merchant</Badge>;
      case UserRole.PROVIDER:
        return <Badge className="bg-teal-500">Provider</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  // Functions to handle user actions
  const handleActivateUser = () => {
    setDialogAction({
      title: 'Activate User Account',
      description: 'Are you sure you want to activate this user account?',
      action: () => {
        updateUserStatusMutation.mutate({
          userId,
          status: UserStatus.ACTIVE,
        });
        setIsDialogOpen(false);
      },
    });
    setIsDialogOpen(true);
  };

  const handleSuspendUser = () => {
    setDialogAction({
      title: 'Suspend User Account',
      description:
        'Are you sure you want to suspend this user account? The user will lose access to the platform.',
      action: () => {
        updateUserStatusMutation.mutate({
          userId,
          status: UserStatus.SUSPENDED,
        });
        setIsDialogOpen(false);
      },
    });
    setIsDialogOpen(true);
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
          <h1 className="text-3xl font-bold tracking-tight">User Not Found</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <h2 className="text-xl font-semibold mb-4">The requested user could not be found</h2>
            <Button asChild>
              <Link href="/admin/users">Back to User Management</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isVerified =
    user.role === UserRole.CLIENT || user.role === UserRole.ADMIN
      ? true
      : user.role === UserRole.DELIVERER && user.deliverer
        ? user.deliverer.isVerified
        : user.role === UserRole.MERCHANT && user.merchant
          ? user.merchant.isVerified
          : user.role === UserRole.PROVIDER && user.provider
            ? user.provider.isVerified
            : false;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{user.name}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2 text-base">
                {getRoleBadge(user.role)}
                {getStatusBadge(user.status)}
                {isVerified ? (
                  <Badge variant="outline" className="border-green-500 text-green-500">
                    <Check className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                    <X className="mr-1 h-3 w-3" />
                    Not Verified
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {user.status !== UserStatus.ACTIVE && (
                <Button onClick={handleActivateUser} className="bg-green-500 hover:bg-green-600">
                  Activate
                </Button>
              )}
              {user.status !== UserStatus.SUSPENDED && (
                <Button onClick={handleSuspendUser} variant="destructive">
                  Suspend
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href={`/admin/users/${userId}/edit`}>Edit</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <Tabs defaultValue="information" className="w-full">
            <TabsList>
              <TabsTrigger value="information">Information</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              {user.role === UserRole.ADMIN && (
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              )}
              {user.role === UserRole.DELIVERER && (
                <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
              )}
              {user.role === UserRole.MERCHANT && (
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
              )}
              {user.role === UserRole.PROVIDER && (
                <TabsTrigger value="services">Services</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="information" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">User Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Name:</span>
                      <span>{user.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Email:</span>
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Phone:</span>
                      <span>{user.phoneNumber || 'Not provided'}</span>
                    </div>
                    {user.client?.address ||
                    user.deliverer?.address ||
                    user.merchant?.address ||
                    user.provider?.address ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">Address:</span>
                        <span>
                          {user.client?.address ||
                            user.deliverer?.address ||
                            user.merchant?.address ||
                            user.provider?.address}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">2FA:</span>
                      <span>{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Account Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Created:</span>
                      <span>{format(new Date(user.createdAt), 'PPP')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Last Updated:</span>
                      <span>{format(new Date(user.updatedAt), 'PPP')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Last Login:</span>
                      <span>
                        {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'PPP') : 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Email Verified:</span>
                      <span>
                        {user.emailVerified
                          ? format(new Date(user.emailVerified), 'PPP')
                          : 'Not verified'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Role-specific information */}
              {user.role === UserRole.DELIVERER && user.deliverer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Deliverer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="font-semibold">Vehicle Type:</span>
                      <span className="ml-2">{user.deliverer.vehicleType || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="font-semibold">License Plate:</span>
                      <span className="ml-2">{user.deliverer.licensePlate || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Max Capacity:</span>
                      <span className="ml-2">
                        {user.deliverer.maxCapacity
                          ? `${user.deliverer.maxCapacity} kg`
                          : 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold">Status:</span>
                      <Badge
                        className={`ml-2 ${user.deliverer.isActive ? 'bg-green-500' : 'bg-gray-500'}`}
                      >
                        {user.deliverer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-semibold">Verification Date:</span>
                      <span className="ml-2">
                        {user.deliverer.verificationDate
                          ? format(new Date(user.deliverer.verificationDate), 'PPP')
                          : 'Not verified yet'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold">Rating:</span>
                      <span className="ml-2">
                        {user.deliverer.rating ? `${user.deliverer.rating} / 5` : 'No ratings yet'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {user.role === UserRole.MERCHANT && user.merchant && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Merchant Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="font-semibold">Company Name:</span>
                      <span className="ml-2">{user.merchant.companyName}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Business Type:</span>
                      <span className="ml-2">{user.merchant.businessType || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="font-semibold">VAT Number:</span>
                      <span className="ml-2">{user.merchant.vatNumber || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Verification Status:</span>
                      <Badge
                        className={`ml-2 ${user.merchant.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}
                      >
                        {user.merchant.isVerified ? 'Verified' : 'Pending Verification'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-semibold">Verification Date:</span>
                      <span className="ml-2">
                        {user.merchant.verificationDate
                          ? format(new Date(user.merchant.verificationDate), 'PPP')
                          : 'Not verified yet'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {user.role === UserRole.PROVIDER && user.provider && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Provider Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="font-semibold">Company Name:</span>
                      <span className="ml-2">{user.provider.companyName || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Service Type:</span>
                      <span className="ml-2">{user.provider.serviceType || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Offered Services:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user.provider.services.length > 0
                          ? user.provider.services.map((service, index) => (
                              <Badge key={index} variant="secondary">
                                {service}
                              </Badge>
                            ))
                          : 'No services listed'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold">Verification Status:</span>
                      <Badge
                        className={`ml-2 ${user.provider.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}
                      >
                        {user.provider.isVerified ? 'Verified' : 'Pending Verification'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-semibold">Rating:</span>
                      <span className="ml-2">
                        {user.provider.rating ? `${user.provider.rating} / 5` : 'No ratings yet'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {user.role === UserRole.ADMIN && user.admin && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Administrator Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="font-semibold">Department:</span>
                      <span className="ml-2">{user.admin.department || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="font-semibold">2FA Status:</span>
                      <Badge
                        className={`ml-2 ${user.admin.twoFactorEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                      >
                        {user.admin.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-semibold">Permissions:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user.admin.permissions.length > 0
                          ? user.admin.permissions.map((permission, index) => (
                              <Badge key={index} variant="secondary">
                                {permission}
                              </Badge>
                            ))
                          : 'No specific permissions'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Recent login and system activity for this user</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-green-500/20 rounded-full p-3">
                          <UserIcon className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <h3 className="font-medium">Login</h3>
                          <p className="text-sm text-muted-foreground">
                            User logged in successfully
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {user.lastLoginAt
                          ? format(new Date(user.lastLoginAt), 'PPP p')
                          : format(new Date(), 'PPP p')}
                      </span>
                    </div>
                    <Separator />

                    <div className="text-center text-muted-foreground py-8">
                      Activity log functionality to be implemented with ActivityLog model
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {user.role === UserRole.ADMIN && (
              <TabsContent value="permissions" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Admin Permissions</CardTitle>
                    <CardDescription>
                      Manage permissions for this administrator account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                      Permission management UI to be implemented
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {dialogAction && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialogAction.title}</AlertDialogTitle>
              <AlertDialogDescription>{dialogAction.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={dialogAction.action}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {user.role === UserRole.DELIVERER && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Actions spéciales</h3>
          <ForceActivateDelivererButton userId={user.id} />
        </div>
      )}
    </div>
  );
}
