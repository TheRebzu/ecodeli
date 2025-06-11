'use client';

import { PropsWithChildren } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function SessionCheckRedirect({ children }: PropsWithChildren) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push(`/${locale}/dashboard`);
    }
  }, [session, status, router, locale]);

  return <>{children}</>;
}
