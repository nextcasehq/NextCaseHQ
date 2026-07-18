import React from 'react';

export default function TenantManagement() {
  const tenants = [
    { id: "1a8f9411", name: "India Practice Group", region: "AP-South", status: "ACTIVE", type: "Enterprise" },
    { id: "e88d4041", name: "Burges Salmon LLC", region: "EU-West", status: "ACTIVE", type: "Premium" },
    { id: "98d41a0e", name: "Allen & Overy LLP", region: "US-East", status: "SUSPENDED", type: "Enterprise" }
  ];

  return (
    <div className="space-y-6 bg-white border border-[#F4EEE0] p-6 rounded-2xl shadow-sm">
      <div>
        <h3 className="text-xl font-black text-[#111111]">Tenant Workspace Directory</h3>
        <p className="text-sm text-[#B0A588] font-serif italic mt-0.5">Authorize, isolate, or migrate multi-tenant databases with Row-Level Security rules.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#F4EEE0] text-[#B0A588] font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Region</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t, idx) => (
              <tr key={idx} className="border-b border-[#FBF8F1] hover:bg-[#FBF8F1]/50 transition-colors font-semibold">
                <td className="py-4 px-4 font-mono text-xs text-[#8A7A56]">{t.id}</td>
                <td className="py-4 px-4 text-[#111111]">{t.name}</td>
                <td className="py-4 px-4 text-[#8A7A56]">{t.region}</td>
                <td className="py-4 px-4 text-[#8A7A56]">{t.type}</td>
                <td className="py-4 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${t.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
