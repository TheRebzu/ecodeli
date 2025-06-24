import { z } from 'zod'
import { baseAnnouncementSchema } from './base-announcement.schema'

export const packageAnnouncementSchema = baseAnnouncementSchema.extend({
  type: z.literal('PACKAGE'),
  packageDetails: z.object({
    weight: z.number().positive(),
    dimensions: z.object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    }),
    fragile: z.boolean(),
    value: z.number().positive().optional(),
    insurance: z.boolean().default(false),
  }),
})

export type PackageAnnouncementInput = z.infer<typeof packageAnnouncementSchema>
