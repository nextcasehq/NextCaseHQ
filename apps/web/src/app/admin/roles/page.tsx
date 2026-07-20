'use client';

import React from 'react';
import { ROLE_DEFINITIONS, PERMISSIONS, PERMISSION_LABELS } from '@/lib/admin/roles';

export default function AdminRolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Roles &amp; Access</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">
          Least privilege by design. Confidential legal content access is separately controlled and is not granted to any platform-administration role by default.
        </p>
      </div>

      <div className="overflow-x-auto bg-white border border-[#111111]/10 rounded-lg">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-[#111111]/10">
              <th className="text-left p-3 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Permission</th>
              {ROLE_DEFINITIONS.map((r) => (
                <th key={r.key} className="text-center p-3 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm) => (
              <tr key={perm} className="border-b border-[#F4EEE0] last:border-0">
                <td className="p-3 font-semibold text-[#3A3222] whitespace-nowrap">{PERMISSION_LABELS[perm]}</td>
                {ROLE_DEFINITIONS.map((r) => (
                  <td key={r.key} className="p-3 text-center">
                    {r.permissions.includes(perm) ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-[#E7DFC9]">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLE_DEFINITIONS.map((r) => (
          <div key={r.key} className="bg-white border border-[#111111]/10 rounded-lg p-4">
            <p className="text-sm font-bold text-[#111111]">{r.name}</p>
            <p className="text-[10px] text-[#8A7A56] mt-1">{r.description}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#B0A588]">
        This matrix is the authoritative reference definition. Enforcement of these permissions must happen server-side in a production implementation — the frontend never grants access on its own.
      </p>
    </div>
  );
}
