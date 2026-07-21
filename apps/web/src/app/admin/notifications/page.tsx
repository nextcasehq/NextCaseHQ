'use client';

import React from 'react';
import { getNotificationTypes, updateNotificationType, type NotificationTypeConfig } from '@/lib/admin/notifications-config';

export default function AdminNotificationsPage() {
  const [types, setTypes] = React.useState<NotificationTypeConfig[]>([]);

  React.useEffect(() => {
    setTypes(getNotificationTypes());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Notifications</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Real notification sending is limited to existing, already-safe production infrastructure — nothing new is sent from this prototype.</p>
      </div>

      <div className="space-y-2">
        {types.map((t) => (
          <div key={t.key} className="bg-white border border-[#111111]/10 rounded-lg p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#111111]">{t.displayName}</p>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${t.severity === 'High' ? 'bg-red-50 text-red-700 border-red-200' : t.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]'}`}>{t.severity}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={t.enabled} onChange={(e) => { updateNotificationType(t.key, { enabled: e.target.checked }, 'Platform Admin'); setTypes(getNotificationTypes()); }} /> Enabled</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={t.inAppDelivery} onChange={(e) => { updateNotificationType(t.key, { inAppDelivery: e.target.checked }, 'Platform Admin'); setTypes(getNotificationTypes()); }} /> In-App</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={t.emailDelivery} onChange={(e) => { updateNotificationType(t.key, { emailDelivery: e.target.checked }, 'Platform Admin'); setTypes(getNotificationTypes()); }} /> Email</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={t.userOptOutAllowed} onChange={(e) => { updateNotificationType(t.key, { userOptOutAllowed: e.target.checked }, 'Platform Admin'); setTypes(getNotificationTypes()); }} /> User Opt-Out</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={t.tenantOverrideAllowed} onChange={(e) => { updateNotificationType(t.key, { tenantOverrideAllowed: e.target.checked }, 'Platform Admin'); setTypes(getNotificationTypes()); }} /> Tenant Override</label>
            </div>
            <p className="text-[10px] text-[#8A7A56]">Lead time: {t.defaultLeadTimeDays ?? 'N/A'} day(s) · Repeat: {t.repeatBehaviour}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
