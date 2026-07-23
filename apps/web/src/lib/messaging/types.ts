export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface SendSmsParams {
  to: string;
  body: string;
}

/** A normalized send result — the same shape regardless of vendor. */
export interface MessageSendResult {
  /** Vendor-assigned identifier for the sent message (email or SMS). */
  id: string;
}

/**
 * Provider-agnostic email interface — the same shape regardless of vendor,
 * so callers never import a vendor SDK directly. Concrete implementation:
 * providers/resend-provider.ts (the Product Owner's selected first
 * provider), selected via getEmailProvider() in email-provider.ts.
 */
export interface EmailProvider {
  readonly name: string;
  sendEmail(params: SendEmailParams): Promise<MessageSendResult>;
}

/**
 * Provider-agnostic SMS interface, mirroring EmailProvider. Concrete
 * implementation: providers/twilio-provider.ts (the Product Owner's
 * selected first provider), selected via getSmsProvider() in
 * sms-provider.ts.
 */
export interface SmsProvider {
  readonly name: string;
  sendSms(params: SendSmsParams): Promise<MessageSendResult>;
}
