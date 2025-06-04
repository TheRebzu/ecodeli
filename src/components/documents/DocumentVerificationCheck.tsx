'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useVerificationUpdate } from '@/hooks/useVerificationUpdate';
import { api } from '@/trpc/react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface DocumentVerificationCheckProps {
  userRole: 'DELIVERER' | 'MERCHANT' | 'PROVIDER';
}

/**
 * Component that checks verification status and shows appropriate messages
 * It also implements the verification status refresh when needed
 */
export default function DocumentVerificationCheck({ userRole }: DocumentVerificationCheckProps) {
  const t = useTranslations('verification');
  const { data: session, update } = useSession();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'info' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // Use our hook to detect auto-verification changes
  useVerificationUpdate();

  // API call setup based on role
  const apiEndpoint = {
    DELIVERER: api.verification.checkAndUpdateDelivererVerification,
    MERCHANT: api.verification.checkAndUpdateMerchantVerification,
    PROVIDER: api.verification.checkAndUpdateProviderVerification,
  }[userRole];

  const checkVerificationMutation = apiEndpoint.useMutation({
    onSuccess: (data) => {
      setChecking(false);
      if (data.isVerified) {
        setMessage({
          type: 'success',
          text: t('status.automaticallyVerified'),
        });
        // Force session update to reflect new verification status
        update();
      } else {
        setMessage({
          type: 'info', 
          text: t('status.documentsStillPending')
        });
      }
    },
    onError: (error) => {
      setChecking(false);
      setMessage({
        type: 'error',
        text: error.message || t('errors.verificationCheckFailed'),
      });
    },
  });

  const handleCheckVerification = () => {
    setChecking(true);
    setMessage(null);
    checkVerificationMutation.mutate();
  };

  // Check URL parameters for auto_check flag
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('auto_check') === 'true') {
      handleCheckVerification();
      
      // Clean up the URL by removing the auto_check parameter
      searchParams.delete('auto_check');
      searchParams.delete('verification_required');
      
      const newUrl = window.location.pathname + 
        (searchParams.toString() ? `?${searchParams.toString()}` : '');
      
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // If user is already verified, don't show this component
  if (session?.user?.isVerified) {
    return null;
  }

  return (
    <div className="mb-6">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-4">
          <AlertTitle className="flex items-center gap-2">
            {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
            {message.type === 'error' && <AlertTriangle className="h-4 w-4" />}
            {message.type === 'success' ? t('status.verified') : t('status.documentCheck')}
          </AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleCheckVerification}
          disabled={checking}
          variant="outline"
          size="sm"
        >
          {checking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('actions.checking')}
            </>
          ) : (
            t('actions.checkVerificationStatus')
          )}
        </Button>
      </div>
    </div>
  );
}
