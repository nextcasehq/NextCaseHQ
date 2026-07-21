import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { isTrustedOrigin } from '@/lib/security/origin-check';

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
  }

  // success: true matches the Phone OTP Authentication spec's logout
  // contract; loggedOut: true is kept alongside it for backward
  // compatibility with anything already reading that field.
  const response = NextResponse.json({ success: true, loggedOut: true }, { status: 200 });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
