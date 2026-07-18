import React from 'react';

export default function UserManagement() {
  const users = [
    { email: "advocate.sharma@delhi-bar.org", role: "Senior Partner", tenant: "India Practice Group", joined: "12 hours ago" },
    { email: "solicitor.burges@salmon.co.uk", role: "Managing Director", tenant: "Burges Salmon LLC", joined: "2 days ago" },
    { email: "associate.singh@delhi-bar.org", role: "Junior Counsel", tenant: "India Practice Group", joined: "1 week ago" }
  ];

  return (
    <div className="space-y-6 bg-white border border-[#F4EEE0] p-6 rounded-2xl shadow-sm">
      <div>
        <h3 className="text-xl font-black text-[#111111]">Active Practitioner Directory</h3>
        <p className="text-sm text-[#B0A588] font-serif italic mt-0.5">Manage session tokens, assign role access levels, and audit credential usage.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#F4EEE0] text-[#B0A588] font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Workspace Context</th>
              <th className="py-3 px-4">Last Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={idx} className="border-b border-[#FBF8F1] hover:bg-[#FBF8F1]/50 transition-colors font-semibold">
                <td className="py-4 px-4 text-[#111111]">{u.email}</td>
                <td className="py-4 px-4 text-[#8A6D2F] font-bold">{u.role}</td>
                <td className="py-4 px-4 text-[#5C5340]">{u.tenant}</td>
                <td className="py-4 px-4 text-[#B0A588]">{u.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
