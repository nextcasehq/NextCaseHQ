/**
 * NCHQ Module 6: High-Performance Search Web Worker
 * Offloads command filtering and case lookups to maintain <15ms INP.
 */

self.onmessage = function(e) {
  const { query, dataSet } = e.data;
  const start = performance.now();

  if (!query) {
    self.postMessage({ results: [] });
    return;
  }

  // Simulated Case & Command Logic
  const results = dataSet.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.token?.toLowerCase().includes(query.toLowerCase())
  );

  const end = performance.now();

  self.postMessage({
    results,
    processingTime: end - start
  });
};
