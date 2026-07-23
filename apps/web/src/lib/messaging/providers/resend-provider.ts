import { Resend } from 'resend';
import type { EmailProvider, SendEmailParams, MessageSendResult } from '../types';
import { EmailProviderRequestError } from '../errors';
import { withRetry, isRetryableStatus } from '../retry';

const RESEND_ERROR_STATUS: Record<string, number> = {
  missing_required_field: 422,
  invalid_idempotency_key: 400,
  invalid_idempotent_request: 409,
  concurrent_idempotent_requests: 409,
  invalid_access: 422,
  invalid_parameter: 422,
  invalid_region: 422,
  rate_limit_exceeded: 429,
  missing_api_key: 401,
  invalid_api_Key: 403,
  invalid_from_address: 403,
  validation_error: 403,
  not_found: 404,
  method_not_allowed: 405,
  application_error: 500,
  internal_server_error: 500,
};

/**
 * The Resend SDK doesn't implement its own retry (unlike Stripe/Twilio) and
 * reports failures as a `{ error }` result rather than throwing — this
 * wraps that result in a real thrown error carrying the mapped HTTP status,
 * so withRetry's shouldRetry predicate has something to inspect.
 */
class ResendSendError extends Error {
  constructor(message: string, public readonly status: number | undefined) {
    super(message);
    Object.setPrototypeOf(this, ResendSendError.prototype);
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly client: Resend;
  private readonly fromAddress: string;

  constructor(apiKey: string, fromAddress: string) {
    this.client = new Resend(apiKey);
    this.fromAddress = fromAddress;
  }

  async sendEmail(params: SendEmailParams): Promise<MessageSendResult> {
    try {
      const data = await withRetry(
        async () => {
          const { data, error } = await this.client.emails.send({
            from: this.fromAddress,
            to: params.to,
            subject: params.subject,
            html: params.html,
          });
          if (error) {
            throw new ResendSendError(`${error.name}: ${error.message}`, RESEND_ERROR_STATUS[error.name]);
          }
          if (!data) {
            throw new ResendSendError('Resend returned no data and no error.', undefined);
          }
          return data;
        },
        (error) => error instanceof ResendSendError && isRetryableStatus(error.status)
      );
      return { id: data.id };
    } catch (error) {
      throw new EmailProviderRequestError(`Resend email send failed: ${(error as Error).message}`, this.name, error);
    }
  }
}
