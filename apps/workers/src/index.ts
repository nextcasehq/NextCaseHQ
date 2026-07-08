import { EventEmitter } from 'events';

/**
 * NCHQ Module 5: Asynchronous Document Ingestion Worker
 */

const ingestionQueue = new EventEmitter();

ingestionQueue.on('process_document', async (data) => {
  console.log(`[Worker] Starting ingestion for document: ${data.id}`);

  // 1. Simulate OCR Parsing
  await simulateTask('OCR Parsing', 1000);

  // 2. Simulate Translation Extraction
  await simulateTask('Translation Extraction', 500);

  // 3. Simulate Vector Chunking
  await simulateTask('Vector Chunking', 800);

  console.log(`[Worker] Completed ingestion for document: ${data.id}`);
  // In a real system, we'd update the database status here to 'COMPLETED'.
});

async function simulateTask(name: string, duration: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      console.log(`[Worker] Task finished: ${name}`);
      resolve(true);
    }, duration);
  });
}

// In-process export for simulation within the same runtime if needed
export const queue = ingestionQueue;

console.log('[Worker] Ingestion worker initialized and listening for events...');
