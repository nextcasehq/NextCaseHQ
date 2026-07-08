'use client';

import React, { useEffect, useState } from 'react';

/**
 * NCHQ Module 6: Global AI Command Palette (CTRL + K)
 *
 * NOTE: UI Layer temporarily isolated for Task 1 Recovery.
 */
export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  // Use 'any' temporarily to bypass strict Worker type-check if it persists in environment
  const [worker, setWorker] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize Web Worker
    try {
      const searchWorker = new Worker('/workers/search-worker.js');
      searchWorker.onmessage = (e) => {
        setResults(e.data.results);
      };
      setWorker(searchWorker);

      // Keyboard Shortcut Handler
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        searchWorker.terminate();
      };
    } catch (e) {
      console.error('CommandPalette worker failed to initialize');
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // Dispatch to Web Worker for filtering
    if (worker) {
      worker.postMessage({
        query: val,
        dataSet: [
          { label: 'Open WP 132/2026', type: 'NAV', token: 'WP_132_2026' },
          { label: 'Draft writ petition', type: 'ACTION', token: 'DRAFT_WRIT' },
          { label: 'Find limitation date', type: 'QUERY', token: 'LIMITATION' },
        ],
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden bg-bg-surface rounded-md shadow-2xl border border-brand/20">
        <div className="flex items-center px-4 border-b border-brand/10">
          <input
            autoFocus
            type="text"
            className="w-full h-14 bg-transparent outline-none text-text-primary placeholder-text-primary/50"
            placeholder="Type a command or case reference..."
            value={query}
            onChange={handleInputChange}
          />
          <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-text-primary bg-bg-base border rounded">ESC</kbd>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2">
          {results.length > 0 ? (
            results.map((res, i) => (
              <div
                key={i}
                className="flex items-center px-3 py-3 rounded-md hover:bg-brand/10 cursor-pointer text-text-primary"
              >
                <span className="flex-1 font-medium">{res.label}</span>
                <span className="text-xs text-text-primary/40 uppercase tracking-wider">{res.type}</span>
              </div>
            ))
          ) : query && (
            <div className="px-4 py-8 text-center text-text-primary/50">
              No results found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
