import { ResendEmailProvider } from '../resend-provider';
import { EmailProviderRequestError } from '../../errors';

const mockSend = jest.fn();

jest.mock('resend', () => ({
  __esModule: true,
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('ResendEmailProvider', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  test('returns the email id on success', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });

    const provider = new ResendEmailProvider('re_test', 'noreply@nextcasehq.com');
    const result = await provider.sendEmail({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(result.id).toBe('email_123');
    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@nextcasehq.com',
      to: 'user@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
    });
  });

  test('retries on a rate_limit_exceeded error and succeeds on the second attempt', async () => {
    mockSend
      .mockResolvedValueOnce({ data: null, error: { name: 'rate_limit_exceeded', message: 'slow down' } })
      .mockResolvedValue({ data: { id: 'email_456' }, error: null });

    const provider = new ResendEmailProvider('re_test', 'noreply@nextcasehq.com');
    const result = await provider.sendEmail({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(result.id).toBe('email_456');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  test('throws EmailProviderRequestError without retrying on a non-retryable error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { name: 'invalid_from_address', message: 'bad from' } });

    const provider = new ResendEmailProvider('re_test', 'noreply@nextcasehq.com');
    await expect(
      provider.sendEmail({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' })
    ).rejects.toBeInstanceOf(EmailProviderRequestError);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('throws EmailProviderRequestError after exhausting retries on repeated rate limits', async () => {
    mockSend.mockResolvedValue({ data: null, error: { name: 'rate_limit_exceeded', message: 'slow down' } });

    const provider = new ResendEmailProvider('re_test', 'noreply@nextcasehq.com');
    await expect(
      provider.sendEmail({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' })
    ).rejects.toBeInstanceOf(EmailProviderRequestError);
  });
});
