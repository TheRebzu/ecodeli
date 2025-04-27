import { z } from 'zod';
import { locales } from '@/lib/i18n';

export const userPreferencesSchema = z.object({
  locale: z.enum(locales as [string, ...string[]]),
  timeZone: z.string().optional(),
  dateFormat: z.enum(['short', 'medium', 'long']).default('medium'),
  currencyFormat: z.enum(['EUR', 'USD']).default('EUR'),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const updateUserPreferencesSchema = userPreferencesSchema.partial();

export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
