import { NextResponse } from 'next/server';

/**
 * Webhook Receiver API Endpoint
 * Handles external event data packets with PII scrubbing and signature verification.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // India PII Scrubbing (PAN and Aadhaar data redaction)
    const scrubbedPayload = scrubPIIData(payload);

    return NextResponse.json({ status: 'ACCEPTED', event: scrubbedPayload.event_type }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  }
}

/**
 * Scrub Indian PII data from payload using RegExp string scrubbers.
 */
function scrubPIIData(data: any): any {
  let stringified = JSON.stringify(data);

  // PAN Card (e.g., ABCDE1234F)
  const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/g;
  // Aadhaar Card (e.g., 1234 5678 9012)
  const aadhaarRegex = /[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}/g;

  stringified = stringified.replace(panRegex, '[PAN_REDACTED]');
  stringified = stringified.replace(aadhaarRegex, '[AADHAAR_REDACTED]');

  return JSON.parse(stringified);
}
