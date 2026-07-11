import { openDB, IDBPDatabase } from 'idb';

/**
 * NCHQ Module 8: Offline Ledger Sync (IndexedDB Wrapper)
 */

const DB_NAME = 'nextcase_offline_ledger';
const STORE_NAME = 'pending_sync';

export interface SyncRecord {
  id: string;
  type: 'NOTE' | 'CASE_UPDATE' | 'DICTATION';
  payload: any;
  timestamp: number;
}

export async function getOfflineDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveRecordLocally(record: SyncRecord) {
  const db = await getOfflineDB();
  await db.put(STORE_NAME, record);
  console.log(`[OfflineDB] Saved record locally: ${record.id}`);
}

export async function getPendingRecords(): Promise<SyncRecord[]> {
  const db = await getOfflineDB();
  return db.getAll(STORE_NAME);
}

export async function clearRecord(id: string) {
  const db = await getOfflineDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Sync Engine: Tracks network reconnection and pushes data to PostgreSQL.
 */
export async function startSyncEngine() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', async () => {
    console.log('[SyncEngine] Network back online. Starting sync...');
    const pending = await getPendingRecords();

    for (const record of pending) {
      try {
        // Idempotent push to cloud API
        const response = await fetch('/api/sync/push', {
          method: 'POST',
          body: JSON.stringify(record),
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          await clearRecord(record.id);
          console.log(`[SyncEngine] Successfully synced: ${record.id}`);
        }
      } catch (err) {
        console.error(`[SyncEngine] Failed to sync ${record.id}:`, err);
      }
    }
  });
}
