import type { TicketStatus, FeedbackType } from '@prisma/client';
import type { IEmailAdapter } from './email.adapter';
import { statusChangedTemplate } from './templates/status-changed';
import { newFeedbackTemplate } from './templates/new-feedback';

export interface StatusChangedParams {
  to: string;
  trackingId: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  title: string;
  note: string | null;
}

export interface NewFeedbackParams {
  adminEmails: string[];
  trackingId: string;
  type: FeedbackType;
  title: string;
  nickname: string | null;
}

export interface IEmailService {
  notifyStatusChanged(params: StatusChangedParams): Promise<void>;
  notifyAdminNewFeedback(params: NewFeedbackParams): Promise<void>;
}

export class EmailService implements IEmailService {
  constructor(private readonly adapter: IEmailAdapter) {}

  async notifyStatusChanged(params: StatusChangedParams): Promise<void> {
    const template = statusChangedTemplate(params);
    await this.adapter.send({
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async notifyAdminNewFeedback(params: NewFeedbackParams): Promise<void> {
    if (params.adminEmails.length === 0) return;
    const template = newFeedbackTemplate(params);
    await Promise.all(
      params.adminEmails.map((email) =>
        this.adapter.send({
          to: email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })
      )
    );
  }
}
