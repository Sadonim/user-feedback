import type { FeedbackType, TicketStatus, Priority, UserRole } from "@prisma/client";

export type { FeedbackType, TicketStatus, Priority, UserRole };

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

export interface FeedbackDetail extends FeedbackSummary {
  description: string;
  email: string | null;
  priority: Priority | null;
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
}

export interface TicketFilters {
  status?: TicketStatus;
  type?: FeedbackType;
  priority?: Priority;
  page?: number;
  limit?: number;
  sort?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}
