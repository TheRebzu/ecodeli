import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

// Générer un token CSRF
export const generateCsrfToken = () => {
  const token = randomBytes(32).toString('hex');
  const cookieStore = cookies();

  // Stocker le token dans un cookie
  cookieStore.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60, // 1 heure
  });

  return token;
};

// Valider un token CSRF
export const validateCsrfToken = (token: string) => {
  const cookieStore = cookies();
  const storedToken = cookieStore.get('csrf-token')?.value;

  if (!storedToken || storedToken !== token) {
    return false;
  }

  // Révoquer le token après utilisation
  cookieStore.delete('csrf-token');

  return true;
};
