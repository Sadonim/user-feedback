import type { IEmailAdapter, EmailMessage } from '../email.adapter';

export class NullAdapter implements IEmailAdapter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(_message: EmailMessage): Promise<void> {
    // intentional no-op for dev/test
  }
}
