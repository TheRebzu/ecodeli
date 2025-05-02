import { z } from 'zod';
import { locales } from '@/lib/i18n';

export const userPreferencesSchema = z.object({
  locale: z.enum(locales as [string, ...string[]]),
  timeZone: z.string().optional(),
  dateFormat: z.enum(['short', 'medium', 'long']).default('medium'),
  currencyFormat: z.enum(['EUR', 'USD']).default('EUR'),
  hasCompletedOnboarding: z.boolean().default(false),
  lastOnboardingStep: z.number().default(0),
  onboardingCompletionDate: z.string().datetime().optional(),
  tutorialSkipped: z.boolean().default(false),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const updateUserPreferencesSchema = userPreferencesSchema.partial();

export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;

export const updateOnboardingStatusSchema = z.object({
  hasCompletedOnboarding: z.boolean().optional(),
  lastOnboardingStep: z.number().optional(),
  onboardingCompletionDate: z.string().datetime().optional(),
  tutorialSkipped: z.boolean().optional(),
});

export type UpdateOnboardingStatus = z.infer<typeof updateOnboardingStatusSchema>;
