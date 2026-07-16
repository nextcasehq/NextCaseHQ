import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    branch: "main",
    synced: true,
    lastDeployment: new Date().toISOString(),
    commit: "4dfb9999e925a75c9695a48fc4baea461cbe5cf0"
  });
}
