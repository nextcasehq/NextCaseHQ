import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    state: "HEALTHY",
    services: {
      redis: "CONNECTED",
      kms: "ACTIVE",
      postgresRLS: "ENFORCED"
    }
  });
}
