import { TwilioSmsProvider } from '../twilio-provider';
import { SmsProviderRequestError } from '../../errors';

const mockCreate = jest.fn();

jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

describe('TwilioSmsProvider', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  test('returns the message sid on success', async () => {
    mockCreate.mockResolvedValue({ sid: 'SM123' });

    const provider = new TwilioSmsProvider('AC_test', 'auth_test', '+15551234567');
    const result = await provider.sendSms({ to: '+15559876543', body: 'Hello' });

    expect(result.id).toBe('SM123');
    expect(mockCreate).toHaveBeenCalledWith({ to: '+15559876543', from: '+15551234567', body: 'Hello' });
  });

  test('throws SmsProviderRequestError on a rejected send', async () => {
    mockCreate.mockRejectedValue(new Error('invalid number'));

    const provider = new TwilioSmsProvider('AC_test', 'auth_test', '+15551234567');
    await expect(provider.sendSms({ to: 'not-a-number', body: 'Hello' })).rejects.toBeInstanceOf(
      SmsProviderRequestError
    );
  });
});
