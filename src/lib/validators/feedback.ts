import { z } from "zod";

export const submitFeedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE", "GENERAL"]),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .trim(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be 5000 characters or less")
    .trim(),
  nickname: z
    .string()
    .min(1, "Nickname is required")
    .max(100, "Nickname must be 100 characters or less")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255)
    .optional()
    .or(z.literal("")),
});

export const trackingIdSchema = z.object({
  trackingId: z
    .string()
    .regex(/^FB-[a-z0-9]{8}$/, "Invalid tracking ID format"),
});

export const updateTicketSchema = z
  .object({
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    note: z.string().max(500).optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.priority !== undefined,
    { message: "At least one field (status or priority) must be provided" }
  );

export const ticketFiltersSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  type: z.enum(["BUG", "FEATURE", "GENERAL"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketFiltersInput = z.infer<typeof ticketFiltersSchema>;
