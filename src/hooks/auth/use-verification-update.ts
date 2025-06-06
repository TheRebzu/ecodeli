import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCookie, deleteCookie } from 'cookies-next';

/**
 * Hook to automatically refresh the session when verification status changes
 * This hook detects the verification_updated cookie that's set by the middleware
 * when a user is automatically verified, and refreshes their session to update
 * the verification status in the client-side session data.
 */
export function useVerificationUpdate() {
  const { update } = useSession();

  useEffect(() => {
    // Check for the special cookie that indicates a verification status update
    const verificationUpdated = getCookie('verification_updated');

    if (verificationUpdated === 'true') {
      console.log('Verification status updated, refreshing session...');

      // Remove the cookie to prevent repeated refreshes
      deleteCookie('verification_updated');

      // Call the NextAuth update method to refresh the session
      update()
        .then(() => {
          console.log('Session refreshed successfully');
        })
        .catch(error => {
          console.error('Failed to refresh session after verification update:', error);
        });
    }
  }, [update]);
}
