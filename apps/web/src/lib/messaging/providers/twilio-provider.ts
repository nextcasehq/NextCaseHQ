import Twilio from 'twilio';
import type { SmsProvider, SendSmsParams, MessageSendResult } from '../types';
import { SmsProviderRequestError } from '../errors';

export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';
  private readonly client: ReturnType<typeof Twilio>;
  private readonly fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    // Twilio's own SDK already implements retry (autoRetry/maxRetries) for
    // transient network/5xx failures — wrapping it in a second, ad hoc
    // retry layer would be redundant, same treatment as Stripe.
    this.client = Twilio(accountSid, authToken, { autoRetry: true, maxRetries: 2 });
    this.fromNumber = fromNumber;
  }

  async sendSms(params: SendSmsParams): Promise<MessageSendResult> {
    try {
      const message = await this.client.messages.create({
        to: params.to,
        from: this.fromNumber,
        body: params.body,
      });
      return { id: message.sid };
    } catch (error) {
      throw new SmsProviderRequestError(`Twilio SMS send failed: ${(error as Error).message}`, this.name, error);
    }
  }
}
