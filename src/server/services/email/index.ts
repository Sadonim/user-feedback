import { EmailService } from './email.service';
import { ResendAdapter } from './adapters/resend.adapter';
import { NullAdapter } from './adapters/null.adapter';
import type { IEmailService } from './email.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter((e) => {
      const valid = EMAIL_REGEX.test(e);
      if (!valid) console.warn(`[EmailService] Invalid admin email skipped: ${e}`);
      return valid;
    });
}

function createEmailService(): IEmailService {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;

  if (!apiKey) {
    console.warn('[EmailService] RESEND_API_KEY not set — using NullAdapter (emails will be silently dropped)');
    return new EmailService(new NullAdapter());
  }

  if (!fromAddress) {
    console.error('[EmailService] EMAIL_FROM not set — emails will fail delivery even with a valid API key');
  }

  return new EmailService(new ResendAdapter(apiKey, fromAddress ?? 'noreply@example.com'));
}

export const emailService: IEmailService = createEmailService();
export type { IEmailService } from './email.service';
export type { StatusChangedParams, NewFeedbackParams } from './email.service';
