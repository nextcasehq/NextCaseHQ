'use client';

import React, { useState, useEffect } from 'react';
import { saveRecordLocally, startSyncEngine } from '@/lib/sync/offline-db';

/**
 * NCHQ Module 8: Tactical Mobile Court Mode
 * Triggers below 768px with expanded typography and touch targets.
 */
export const MobileCourtMode = () => {
  const [note, setNote] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    startSyncEngine();

    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    updateOnlineStatus();
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleSaveNote = async () => {
    const record = {
      id: crypto.randomUUID(),
      type: 'NOTE' as const,
      payload: { content: note },
      timestamp: Date.now()
    };

    if (isOffline) {
      await saveRecordLocally(record);
      alert('Network unavailable. Note saved to offline ledger.');
    } else {
      // Direct push to API if online
      console.log('[CourtMode] Online. Pushing note to cloud...');
      // Simulated: await fetch('/api/notes', { ... });
    }
    setNote('');
  };

  return (
    <div className="md:hidden flex flex-col min-h-screen bg-bg-base p-6">
      {/* 20% Typography Expansion (text-lg instead of base) */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-brand">Court Mode</h1>
        <div className={`mt-2 text-sm font-mono ${isOffline ? 'text-red-500' : 'text-green-500'}`}>
          {isOffline ? 'OFFLINE LEDGER ACTIVE' : 'SECURE SYNC ONLINE'}
        </div>
      </header>

      <main className="flex-1 space-y-6">
        <div className="space-y-2">
          <label className="text-lg font-medium text-text-primary">Court Notes</label>
          <textarea
            className="w-full h-48 p-4 bg-bg-surface border border-brand/20 rounded-md text-lg outline-none focus:border-brand"
            placeholder="Type or dictate notes..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* 48px Minimum Touch Target (h-12 or py-3) */}
        <button
          onClick={handleSaveNote}
          className="w-full h-14 bg-brand text-white font-bold text-lg rounded-md shadow-lg active:scale-[0.98] transition-transform"
        >
          Record Transaction
        </button>
      </main>

      <footer className="mt-auto pt-6 border-t border-brand/10 text-center">
        <p className="text-xs text-text-primary/40 uppercase tracking-widest">
          Section 37 Tactical Interface
        </p>
      </footer>
    </div>
  );
};
