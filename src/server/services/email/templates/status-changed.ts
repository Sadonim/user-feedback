import type { TicketStatus } from '@prisma/client';

export interface StatusChangedTemplateParams {
  trackingId: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  title: string;
  note: string | null;
}

function esc(str: string): string {
  return str
    .replace(/[\r\n]/g, '') // SMTP header injection prevention
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export function statusChangedTemplate(params: StatusChangedTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { trackingId, fromStatus, toStatus, title, note } = params;
  const fromLabel = fromStatus ? STATUS_LABEL[fromStatus] : 'New';
  const toLabel = STATUS_LABEL[toStatus];

  const subject = `[${esc(trackingId)}] Status updated: ${toLabel}`;

  const noteSection = note
    ? `<p><strong>Note:</strong> ${esc(note)}</p>`
    : '';

  const html = `
    <h2>Your feedback status has been updated</h2>
    <p><strong>Ticket:</strong> ${esc(trackingId)}</p>
    <p><strong>Title:</strong> ${esc(title)}</p>
    <p><strong>Status:</strong> ${fromLabel} → ${toLabel}</p>
    ${noteSection}
  `.trim();

  const textNote = note ? `\nNote: ${note}` : '';
  const text = `Your feedback status has been updated.\nTicket: ${trackingId}\nTitle: ${title}\nStatus: ${fromLabel} → ${toLabel}${textNote}`;

  return { subject, html, text };
}
