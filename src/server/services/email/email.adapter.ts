export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailAdapter {
  send(message: EmailMessage): Promise<void>;
}
