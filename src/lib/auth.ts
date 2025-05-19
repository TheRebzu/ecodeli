/**
 * Export centralisé des options d'authentification pour NextAuth
 */

import { authOptions as nextAuthOptions } from '@/server/auth/next-auth';

export const authOptions = nextAuthOptions;
