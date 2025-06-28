import { z } from 'zod'

export const baseAnnouncementSchema = z.object({
  title: z.string().min(5, 'Minimum 5 caractères'),
  description: z.string().min(20, 'Minimum 20 caractères'),
  startLocation: z.object({
    address: z.string(),
    city: z.string(),
    postalCode: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
  endLocation: z.object({
    address: z.string(),
    city: z.string(),
    postalCode: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
  desiredDate: z.date(),
  price: z.number().positive('Le prix doit être positif'),
})
