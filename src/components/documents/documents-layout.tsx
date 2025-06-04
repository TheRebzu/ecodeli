'use client';

import { useVerificationUpdate } from '@/hooks/useVerificationUpdate';

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  // Automatically check for verification updates and refresh the session if needed
  useVerificationUpdate();
  
  return children;
}
