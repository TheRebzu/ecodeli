import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').max(100),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères').max(500),
  fromLocation: z.string().min(3, 'L\'emplacement de départ doit être spécifié'),
  toLocation: z.string().min(3, 'L\'emplacement d\'arrivée doit être spécifié'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'La date n\'est pas valide',
  }),
});