'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { auth, signOut } from '@/auth';

export default function DebugJWTPage() {
  const [token, setToken] = useState<string | null>(null);
  const [decodedPayload, setDecodedPayload] = useState<any>(null);
  const [cookieInfo, setCookieInfo] = useState<string[]>([]);
  const [localStorageInfo, setLocalStorageInfo] = useState<string[]>([]);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getDebugInfo = async () => {
      try {
        // Check session
        const sessionData = await auth();
        setSession(sessionData);

        // Check cookies 
        const cookies = document.cookie.split(';').map(c => c.trim());
        setCookieInfo(cookies.filter(c => c.toLowerCase().includes('next-auth') || c.toLowerCase().includes('session')));

        // Check localStorage for any auth tokens
        const authKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth'))) {
            authKeys.push(`${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
          }
        }
        setLocalStorageInfo(authKeys);

        // Try to extract token from cookies (this depends on how your app stores the token)
        const nextAuthSession = cookies.find(c => c.startsWith('next-auth.session-token='));
        if (nextAuthSession) {
          const tokenValue = nextAuthSession.split('=')[1];
          setToken(tokenValue);
          
          // Try to decode JWT
          try {
            if (tokenValue && tokenValue.split('.').length === 3) {
              const base64Url = tokenValue.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              setDecodedPayload(JSON.parse(jsonPayload));
            }
          } catch (decodeError) {
            console.error('Error decoding JWT:', decodeError);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching debug info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    getDebugInfo();
  }, []);

  const handleClearSession = async () => {
    try {
      // Clear cookies
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
      
      // Clear localStorage
      localStorage.clear();

      // Sign out
      await signOut({ redirectTo: '/' });
      
      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>JWT Debug Tool</CardTitle>
          <CardDescription>
            This tool helps diagnose authentication issues by examining your JWT token and session data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Session Info */}
            <div>
              <h2 className="text-xl font-semibold mb-2">Session Status</h2>
              <div className="bg-gray-100 p-4 rounded-md">
                <pre className="whitespace-pre-wrap overflow-auto max-h-48">
                  {session ? JSON.stringify(session, null, 2) : 'No active session found'}
                </pre>
              </div>
            </div>

            {/* JWT Token */}
            <div>
              <h2 className="text-xl font-semibold mb-2">JWT Token</h2>
              <div className="bg-gray-100 p-4 rounded-md">
                {token ? (
                  <div className="overflow-auto max-h-24">
                    <div className="font-mono text-xs break-all">{token}</div>
                  </div>
                ) : (
                  <p>No JWT token found in cookies</p>
                )}
              </div>
            </div>

            {/* Decoded Payload */}
            <div>
              <h2 className="text-xl font-semibold mb-2">Decoded Payload</h2>
              <div className="bg-gray-100 p-4 rounded-md">
                <pre className="whitespace-pre-wrap overflow-auto max-h-48">
                  {decodedPayload ? JSON.stringify(decodedPayload, null, 2) : 'No decoded payload available'}
                </pre>
              </div>
            </div>

            {/* Cookies */}
            <div>
              <h2 className="text-xl font-semibold mb-2">Authentication Cookies</h2>
              <div className="bg-gray-100 p-4 rounded-md">
                {cookieInfo.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {cookieInfo.map((cookie, index) => (
                      <li key={index} className="font-mono text-xs break-all">{cookie}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No authentication-related cookies found</p>
                )}
              </div>
            </div>

            {/* localStorage */}
            <div>
              <h2 className="text-xl font-semibold mb-2">LocalStorage Auth Data</h2>
              <div className="bg-gray-100 p-4 rounded-md">
                {localStorageInfo.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {localStorageInfo.map((item, index) => (
                      <li key={index} className="font-mono text-xs break-all">{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No authentication-related localStorage items found</p>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
                <h3 className="font-semibold mb-1">Error</h3>
                <p>{error}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Data
          </Button>
          <Button variant="destructive" onClick={handleClearSession}>
            Clear Session & Cookies
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li>Verify that your token is in valid JWT format (header.payload.signature)</li>
            <li>Check if the session data contains the expected user information</li>
            <li>Ensure the cookie is being properly set and not expired</li>
            <li>Confirm that the NEXTAUTH_SECRET environment variable is correctly set</li>
            <li>Try clearing all cookies and signing in again</li>
            <li>Check server logs for any JWT encoding/decoding errors</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
} 