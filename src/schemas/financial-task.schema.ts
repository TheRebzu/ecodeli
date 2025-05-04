import { z } from 'zod';
import { FinancialTaskCategory, FinancialTaskPriority } from '@prisma/client';

// Schéma pour la création d'une tâche financière
export const createFinancialTaskSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  description: z.string().max(500, 'La description ne peut pas dépasser 500 caractères').nullable().optional(),
  dueDate: z.date().nullable().optional(),
  priority: z.nativeEnum(FinancialTaskPriority, {
    errorMap: () => ({ message: 'Priorité invalide' }),
  }),
  category: z.nativeEnum(FinancialTaskCategory, {
    errorMap: () => ({ message: 'Catégorie invalide' }),
  }),
});

// Schéma pour la mise à jour d'une tâche financière
export const updateFinancialTaskSchema = z.object({
  id: z.string().cuid('ID de tâche invalide'),
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').max(100, 'Le titre ne peut pas dépasser 100 caractères').optional(),
  description: z.string().max(500, 'La description ne peut pas dépasser 500 caractères').nullable().optional(),
  dueDate: z.date().nullable().optional(),
  completed: z.boolean().optional(),
  priority: z.nativeEnum(FinancialTaskPriority, {
    errorMap: () => ({ message: 'Priorité invalide' }),
  }).optional(),
  category: z.nativeEnum(FinancialTaskCategory, {
    errorMap: () => ({ message: 'Catégorie invalide' }),
  }).optional(),
});

// Schéma pour les filtres de tâches financières
export const financialTaskFiltersSchema = z.object({
  search: z.string().optional(),
  priority: z.nativeEnum(FinancialTaskPriority).optional(),
  category: z.nativeEnum(FinancialTaskCategory).optional(),
  completed: z.boolean().optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
  userId: z.string().cuid().optional(),
});

// Schéma pour le toggle du statut d'une tâche
export const toggleFinancialTaskSchema = z.object({
  id: z.string().cuid('ID de tâche invalide'),
  completed: z.boolean(),
});

// Schéma pour la suppression d'une tâche
export const deleteFinancialTaskSchema = z.object({
  id: z.string().cuid('ID de tâche invalide'),
});

// Schéma pour les options de pagination et tri
export const financialTaskListOptionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortField: z.enum(['title', 'dueDate', 'priority', 'createdAt', 'category']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  filters: financialTaskFiltersSchema.optional(),
}); 