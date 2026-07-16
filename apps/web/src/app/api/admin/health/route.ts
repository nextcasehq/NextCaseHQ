import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: "STABLE",
    timestamp: new Date().toISOString(),
    metrics: {
      activeTenants: 142,
      latencyMs: 1.84,
      systemScore: "100%"
    }
  });
}
