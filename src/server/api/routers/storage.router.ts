import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const storageRouter = router({
  getAllItems: protectedProcedure
    .query(async ({ ctx }) => {
      // Récupération des articles stockés
      return [
        // Données fictives
        { id: '1', name: 'Item 1', quantity: 5, location: 'A1' },
        { id: '2', name: 'Item 2', quantity: 10, location: 'B2' },
      ];
    }),
  
  getItemById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Récupération d'un article spécifique
      return {
        id: input.id,
        name: `Item ${input.id}`,
        quantity: Math.floor(Math.random() * 20),
        location: `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}${Math.floor(Math.random() * 5)}`,
      };
    }),
  
  addItem: protectedProcedure
    .input(z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      location: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Ajout d'un nouvel article en stock
      return {
        id: Date.now().toString(),
        ...input,
      };
    }),
  
  updateItem: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      quantity: z.number().int().positive().optional(),
      location: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Mise à jour d'un article en stock
      return {
        id: input.id,
        name: input.name || `Item ${input.id}`,
        quantity: input.quantity || Math.floor(Math.random() * 20),
        location: input.location || `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}${Math.floor(Math.random() * 5)}`,
      };
    }),
  
  removeItem: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Suppression d'un article du stock
      return { success: true, id: input.id };
    }),
}); 