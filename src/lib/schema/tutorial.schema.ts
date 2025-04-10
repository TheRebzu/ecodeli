import { z } from 'zod';

export const TutorialStepSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  targetElementId: z.string().optional(),
  position: z.enum(['top', 'right', 'bottom', 'left', 'center']).optional(),
  order: z.number().int().min(0),
  isCompleted: z.boolean()
});

export const TutorialProgressSchema = z.object({
  userId: z.string(),
  currentStepId: z.string().nullable(),
  completedSteps: z.array(z.string()),
  isCompleted: z.boolean(),
  lastUpdated: z.date()
});

export const UpdateTutorialProgressSchema = z.object({
  userId: z.string(),
  currentStepId: z.string().nullable(),
  completedStepId: z.string().optional(),
  isCompleted: z.boolean().optional()
}); 