import { Resend } from 'resend';
import type { IEmailAdapter, EmailMessage } from '../email.adapter';

export class ResendAdapter implements IEmailAdapter {
  private readonly resend: Resend;
  private readonly fromAddress: string;

  constructor(apiKey: string, fromAddress: string) {
    this.resend = new Resend(apiKey);
    this.fromAddress = fromAddress;
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) {
      throw new Error(`[ResendAdapter] ${error.message}`);
    }
  }
}
