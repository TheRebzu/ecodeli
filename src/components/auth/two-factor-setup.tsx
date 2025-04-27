'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';

export function TwoFactorSetup() {
  const t = useTranslations('Auth.TwoFactor');
  const { user, setupTwoFactor, disableTwoFactor, verifyTwoFactor } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSetup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await setupTwoFactor();

      if (result.success) {
        setQrCode(result.qrCode);
        setSecret(result.secret);
      } else {
        setError((result.error as string) || t('error.setup'));
      }
    } catch (err) {
      setError(t('error.generic'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyTwoFactor(verificationCode);

      if (result.success) {
        setSuccess(t('success.verified'));
        setQrCode(null);
        setSecret(null);
        setVerificationCode('');
      } else {
        setError((result.error as string) || t('error.verification'));
      }
    } catch (err) {
      setError(t('error.generic'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await disableTwoFactor();

      if (result.success) {
        setSuccess(t('success.disabled'));
      } else {
        setError((result.error as string) || t('error.disable'));
      }
    } catch (err) {
      setError(t('error.generic'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Si l'utilisateur n'a pas encore configuré la 2FA
  if (!user?.twoFactorEnabled && !qrCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('setup.title')}</CardTitle>
          <CardDescription>{t('setup.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
              <span>{t('setup.status')}</span>
            </div>
            <Button onClick={handleSetup} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('setup.loading')}
                </>
              ) : (
                t('setup.enable')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si l'utilisateur est en train de configurer la 2FA
  if (qrCode && secret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('verify.title')}</CardTitle>
          <CardDescription>{t('verify.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <Image
                src={qrCode}
                alt="QR Code for two-factor authentication"
                width={200}
                height={200}
              />
            </div>

            <div className="text-sm text-center">
              <p className="mb-2">{t('verify.scanInstructions')}</p>
              <p className="font-mono bg-gray-100 p-2 rounded">{secret}</p>
            </div>

            <div className="w-full space-y-2">
              <Label htmlFor="verificationCode">{t('verify.codeLabel')}</Label>
              <Input
                id="verificationCode"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="text-center text-xl tracking-widest"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setQrCode(null);
              setSecret(null);
            }}
            disabled={isLoading}
          >
            {t('verify.cancel')}
          </Button>
          <Button onClick={handleVerify} disabled={isLoading || verificationCode.length !== 6}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('verify.loading')}
              </>
            ) : (
              t('verify.confirm')
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Si l'utilisateur a déjà configuré la 2FA
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('manage.title')}</CardTitle>
        <CardDescription>{t('manage.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <span>{t('manage.enabled')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>{t('manage.status')}</span>
            <Switch
              checked={user?.twoFactorEnabled || false}
              onCheckedChange={() => handleDisable()}
              disabled={isLoading}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">{t('manage.warning')}</p>
      </CardFooter>
    </Card>
  );
}
