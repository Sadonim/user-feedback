import type { FeedbackType, TicketStatus, Priority, UserRole } from "@prisma/client";

export type { FeedbackType, TicketStatus, Priority, UserRole };

// Phase 5-1
export type PriorityColor = "destructive" | "orange" | "yellow" | "muted";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: ApiMeta;
}

export interface ApiMeta {
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

export interface TicketStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byType: Record<FeedbackType, number>;
  recent: {
    today: number;
    thisWeek: number;
  };
}

export interface AdminSessionUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
}

export interface FeedbackSummary {
  id: string;
  trackingId: string;
  type: FeedbackType;
  status: TicketStatus;
  title: string;
  nickname: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Phase 5-2: safe subset of AdminUser for display (no passwordHash)
export interface AssigneeInfo {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface FeedbackDetail extends FeedbackSummary {
  description: string;
  email: string | null;
  priority: Priority | null;
  assigneeId?: string | null;     // Phase 5-2: aligns type with Prisma runtime data
  assignee?: AssigneeInfo | null; // Phase 5-2: full assignee object for display
  statusHistory: StatusHistoryEntry[];
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  note: string | null;
  createdAt: Date;
}

export interface TicketListItem extends FeedbackSummary {
  priority: Priority | null;
  assigneeId: string | null;
  assigneeUsername?: string | null; // Phase 5-2: for list column display
}

export interface TicketFilters {
  status?: TicketStatus;
  type?: FeedbackType;
  priority?: Priority;
  assigneeId?: string; // Phase 5-2: supports cuid or literal "unassigned"
  page?: number;
  limit?: number;
  sort?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}

// Phase 5-3: SSE types
// ticket.deleted is intentionally omitted — deleted rows are undetectable via updatedAt polling
export type SSEEventType = "init" | "ticket.created" | "ticket.updated";

export interface TicketStreamItem {
  id: string;
  trackingId: string;
  title: string;
  type: FeedbackType;
  status: TicketStatus;
  priority: Priority | null;
  assigneeId: string | null;
  updatedAt: string; // ISO string
}

export interface SSEInitPayload {
  total: number;
  open: number;
}

// Phase 5-4: Analytics types
export interface TrendDataPoint {
  date: string;   // "YYYY-MM-DD"
  count: number;
}

export interface AnalyticsData {
  period: "7d" | "30d" | "90d";
  granularity: "day" | "week";
  startDate: string;
  total: number;
  trend: TrendDataPoint[];
  avgResponseTimeHours: number | null;
  avgResponseTimeByType: Record<FeedbackType, number | null>;
  statusFunnel: Record<TicketStatus, number>;
  typeBreakdown: Record<FeedbackType, number>;
  openRate: number;        // 0–100
  resolutionRate: number;  // 0–100
}

export interface TimeseriesDataPoint {
  date: string;   // "YYYY-MM-DD"
  count: number;
}
