'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TicketTypeBadge } from './TicketTypeBadge';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { TrackingIdBadge } from './TrackingIdBadge';
import { StatusHistoryTimeline } from './StatusHistoryTimeline';
import { StatusUpdatePanel } from './StatusUpdatePanel';
import { PriorityUpdatePanel } from './PriorityUpdatePanel';
import { AssigneeBadge } from './AssigneeBadge';
import { AssigneePanel } from './AssigneePanel';
import { DangerZoneCard } from './DangerZoneCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FeedbackDetail } from '@/types';

interface TicketDetailViewProps {
  ticket: FeedbackDetail;
}

export function TicketDetailView({ ticket: initialTicket }: TicketDetailViewProps) {
  const [ticket, setTicket] = useState(initialTicket);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/admin/tickets"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to tickets
        </Link>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-2xl font-semibold">{ticket.title}</h1>
          <TrackingIdBadge id={ticket.trackingId} />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main column */}
        <div className="space-y-4">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <TicketTypeBadge type={ticket.type} />
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
            <AssigneeBadge assignee={ticket.assignee} size="sm" />
            <span>
              Submitted by{' '}
              <strong>{ticket.nickname ?? 'Anonymous'}</strong>
            </span>
            <span>{new Date(ticket.createdAt).toLocaleString()}</span>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Contact info if available */}
          {ticket.email && (
            <p className="text-sm text-muted-foreground">
              Contact: <a href={`mailto:${ticket.email}`} className="hover:underline">{ticket.email}</a>
            </p>
          )}

          {/* Status history */}
          <StatusHistoryTimeline history={ticket.statusHistory} />
        </div>

        {/* Sidebar / action column */}
        <div className="space-y-4">
          <StatusUpdatePanel ticket={ticket} onUpdate={setTicket} />
          <PriorityUpdatePanel ticket={ticket} onUpdate={setTicket} />
          <AssigneePanel ticket={ticket} onUpdate={setTicket} />
          <DangerZoneCard ticketId={ticket.id} />
        </div>
      </div>
    </div>
  );
}
