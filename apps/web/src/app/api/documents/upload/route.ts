import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * NCHQ Module 17: Advanced File Ingestion Controller
 */

const MAX_DOCUMENT_SIZE = 128 * 1024 * 1024; // 128MB

export async function POST(request: Request) {
  const start = performance.now();

  try {
    const headerList = await headers();
    const tenantId = headerList.get('x-nextcase-tenant-id') || headerList.get('X-Tenant-ID');
    const keyVersion = headerList.get('X-Tenant-Key-Version');

    if (performance.now() - start > 5) console.warn('[INGEST] Header extraction exceeded 5ms budget');

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!tenantId || !uuidRegex.test(tenantId) || !keyVersion) {
      return NextResponse.json({ error: 'SECURE_ACCESS_DENIED' }, { status: 401 });
    }

    if (!request.body) return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });

    const reader = request.body.getReader();
    let totalBytesReceived = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytesReceived += value.length;
      if (totalBytesReceived > MAX_DOCUMENT_SIZE) {
        return NextResponse.json({ error: 'INGESTION_FAILURE', reason: 'SIZE_EXCEEDED', status: 'ABORTED' }, { status: 413 });
      }
    }

    const duration = performance.now() - start;
    if (duration > 50) console.warn(`[PERFORMANCE] Intake API took ${duration.toFixed(2)}ms`);

    return NextResponse.json({ status: 'ACCEPTED', id: crypto.randomUUID(), bytes_received: totalBytesReceived }, { status: 202 });

  } catch (error) {
    return NextResponse.json({ error: 'INGESTION_FAILURE', status: 'ABORTED' }, { status: 500 });
  }
}
