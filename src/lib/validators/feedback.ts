import { z } from "zod";

export const submitFeedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE", "GENERAL"]),
  content: z
    .string()
    .trim()
    .min(1, "내용을 입력해주세요")
    .max(5000, "5000자 이하로 입력해주세요"),
  nickname: z
    .string()
    .trim()
    .min(1, "닉네임을 입력해주세요")
    .max(100, "닉네임은 100자 이하로 입력해주세요"),
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
  assigneeId: z
    .union([z.string().cuid(), z.literal("unassigned")])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// Phase 5-2: assign/unassign a ticket
export const assignTicketSchema = z.object({
  assigneeId: z.string().cuid("Invalid assignee ID").nullable(),
});

// Phase 5-4: analytics query parameters
export const analyticsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
  granularity: z.enum(["day", "week"]).default("day"),
});

// Phase 5-4: timeseries query parameters
export const timeseriesQuerySchema = z.object({
  days: z.coerce.number().int().refine((v) => [7, 14, 30, 90].includes(v), {
    message: "days must be 7, 14, 30, or 90",
  }).default(30),
  type: z.enum(["BUG", "FEATURE", "GENERAL"]).optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketFiltersInput = z.infer<typeof ticketFiltersSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type TimeseriesQueryInput = z.infer<typeof timeseriesQuerySchema>;
