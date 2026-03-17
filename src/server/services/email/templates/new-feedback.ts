import type { FeedbackType } from '@prisma/client';

export interface NewFeedbackTemplateParams {
  trackingId: string;
  type: FeedbackType;
  title: string;
  nickname: string | null;
}

function esc(str: string): string {
  return str
    .replace(/[\r\n]/g, '') // SMTP header injection prevention
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const TYPE_LABEL: Record<FeedbackType, string> = {
  BUG: 'Bug Report',
  FEATURE: 'Feature Request',
  GENERAL: 'General',
};

export function newFeedbackTemplate(params: NewFeedbackTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { trackingId, type, title, nickname } = params;
  const typeLabel = TYPE_LABEL[type];
  const from = nickname ? esc(nickname) : 'Anonymous';

  const subject = `[New Feedback] ${typeLabel}: ${esc(title).slice(0, 50)}`;

  const html = `
    <h2>New feedback received</h2>
    <p><strong>Ticket:</strong> ${esc(trackingId)}</p>
    <p><strong>Type:</strong> ${typeLabel}</p>
    <p><strong>Title:</strong> ${esc(title)}</p>
    <p><strong>From:</strong> ${from}</p>
  `.trim();

  const text = `New feedback received.\nTicket: ${trackingId}\nType: ${typeLabel}\nTitle: ${title}\nFrom: ${nickname ?? 'Anonymous'}`;

  return { subject, html, text };
}
