'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const session = await auth();
        if (session?.user) {
          setUser(session.user);
        } else {
          setError('Not authenticated');
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await signOut({ redirectTo: '/login' });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <p className="mt-4">Redirecting to login page...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="font-semibold">ID:</div>
            <div>{user.id}</div>
            
            <div className="font-semibold">Name:</div>
            <div>{user.name}</div>
            
            <div className="font-semibold">Email:</div>
            <div>{user.email}</div>
            
            <div className="font-semibold">Role:</div>
            <div className="bg-green-100 text-green-800 px-2 py-1 rounded">
              {user.role}
            </div>
          </div>
          
          <div className="pt-4">
            <Button onClick={handleLogout} variant="destructive">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 