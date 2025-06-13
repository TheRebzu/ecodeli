import { z } from "zod";
import { FinancialTaskCategory, FinancialTaskPriority } from "@prisma/client";

import {
  createFinancialTaskSchema,
  updateFinancialTaskSchema,
  financialTaskFiltersSchema,
  toggleFinancialTaskSchema,
  deleteFinancialTaskSchema,
  financialTaskListOptionsSchema,
} from "@/schemas/payment/financial-task.schema";

// Type pour une tâche financière complète
export interface FinancialTask {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  completed: boolean;
  completedAt?: Date | null;
  priority: FinancialTaskPriority;
  category: FinancialTaskCategory;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// Type pour la création d'une tâche financière
export type CreateFinancialTaskInput = z.infer<
  typeof createFinancialTaskSchema
>;

// Type pour la mise à jour d'une tâche financière
export type UpdateFinancialTaskInput = z.infer<
  typeof updateFinancialTaskSchema
>;

// Type pour les filtres de tâches financières
export type FinancialTaskFilters = z.infer<typeof financialTaskFiltersSchema>;

// Options de tri
export type FinancialTaskSortOptions = {
  field: "title" | "dueDate" | "priority" | "createdAt" | "category";
  direction: "asc" | "desc";
};

// Type pour la pagination
export interface PaginatedFinancialTasks {
  tasks: FinancialTask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Mappage pour les priorités en français
export const priorityLabels: Record<FinancialTaskPriority, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
};

// Mappage pour les catégories en français
export const categoryLabels: Record<FinancialTaskCategory, string> = {
  PAYMENT: "Paiement",
  INVOICE: "Facture",
  WITHDRAWAL: "Retrait",
  OTHER: "Autre",
};

// Mappage des icônes par catégorie
export const categoryIcons: Record<FinancialTaskCategory, string> = {
  PAYMENT: "dollar-sign",
  INVOICE: "calendar-clock",
  WITHDRAWAL: "check-circle-2",
  OTHER: "circle",
};
