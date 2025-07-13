import { z } from "zod";

export const serviceAnnouncementSchema = z.object({
  type: z.literal("SERVICE"),
  serviceType: z.enum([
    "PERSON_TRANSPORT",
    "AIRPORT_TRANSFER",
    "SHOPPING",
    "INTERNATIONAL_PURCHASE",
    "PET_CARE",
    "HOME_SERVICE",
  ]),
  serviceDetails: z.object({
    duration: z.number().positive(),
    numberOfPeople: z.number().positive().optional(),
    specialRequirements: z.string().optional(),
    recurringService: z.boolean().default(false),
  }),
  preferredProviderId: z.string().optional(),
});

export type ServiceAnnouncementInput = z.infer<
  typeof serviceAnnouncementSchema
>;
