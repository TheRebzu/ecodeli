import { z } from 'zod';

export const validationPatterns = {
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  phone: /^\+?[0-9]{10,15}$/,
  siret: /^[0-9]{14}$/,
};

export const isValidEmail = (email: string) => validationPatterns.email.test(email);
export const isValidPhone = (phone: string) => validationPatterns.phone.test(phone);
export const isValidSiret = (siret: string) => validationPatterns.siret.test(siret);
