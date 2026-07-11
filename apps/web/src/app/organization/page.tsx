'use client';

import React from 'react';

interface Tenant {
  id: string;
  name: string;
}

const mockTenants: Tenant[] = [
  { id: '1', name: 'Standard Tenant' },
  { id: '2', name: 'Premium Tenant' },
];

export default function OrganizationPage() {
  return (
    <div className="p-8 bg-bg-base min-h-screen text-text-primary">
      <h1 className="text-2xl font-bold text-brand mb-6">Select Organization</h1>
      <div className="grid gap-4 max-w-md">
        {mockTenants.map((tenant) => (
          <button
            key={tenant.id}
            className="p-4 bg-bg-surface border border-brand/10 rounded-md hover:border-brand transition-colors text-left"
          >
            <div className="font-medium">{tenant.name}</div>
            <div className="text-xs text-text-primary/40 font-mono uppercase tracking-tighter">
              ID: {tenant.id}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
