import { NextResponse } from 'next/server';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/security/admin-session';

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
  }

  const response = NextResponse.json({ loggedOut: true }, { status: 200 });
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
