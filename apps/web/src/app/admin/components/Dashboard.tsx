import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, isPositive }) => (
  <div className="bg-white border border-[#F4EEE0] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
    <p className="text-xs font-semibold text-[#B0A588] uppercase tracking-wider mb-2">{title}</p>
    <p className="text-3xl font-black text-[#111111] mb-1">{value}</p>
    <p className={`text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>{change}</p>
  </div>
);

export default function Dashboard() {
  const metrics = [
    { title: "Total Active Tenants", value: "142", change: "+12.4% vs last month", isPositive: true },
    { title: "AI Tokens Transumed", value: "48.2M", change: "+18.9% vs last week", isPositive: true },
    { title: "Average Latency Gate", value: "1.84ms", change: "-8.4% improvement", isPositive: true },
    { title: "System Operational Score", value: "100%", change: "Stable state certified", isPositive: true }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-[#111111]">Console Executive Summary</h2>
        <p className="text-sm text-[#8A7A56] font-serif italic mt-1">Live metrics across multi-tenant clusters, cryptographic ledgers, and inference nodes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {metrics.map((m, i) => (
          <MetricCard key={i} {...m} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#F4EEE0] p-6 rounded-2xl shadow-sm">
          <h3 className="font-black text-lg text-[#111111] mb-4">Latest Platform Activity</h3>
          <div className="space-y-4">
            {[
              "Tenant 'India Practice Group' bound cryptographic DB session",
              "Database client validated Row-Level Security for 142 records",
              "AI Conversation pipeline scrubbed regional PAN card logs",
              "Completed full automated Sentinel Certification audit"
            ].map((act, idx) => (
              <div key={idx} className="flex gap-3 text-sm font-medium">
                <span className="text-emerald-500 select-none">✔</span>
                <span className="text-[#5C5340]">{act}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#F4EEE0] p-6 rounded-2xl shadow-sm">
          <h3 className="font-black text-lg text-[#111111] mb-4">Sentinel Health Matrix</h3>
          <div className="space-y-4">
            {[
              { name: "Architecture Sentinel", status: "PASS" },
              { name: "Build Sentinel", status: "PASS" },
              { name: "UI Sentinel", status: "PASS" },
              { name: "Release Certification Sentinel", status: "PASS" }
            ].map((sent, idx) => (
              <div key={idx} className="flex justify-between text-sm font-semibold">
                <span className="text-[#4A4130]">{sent.name}</span>
                <span className="text-emerald-600 font-black">{sent.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
