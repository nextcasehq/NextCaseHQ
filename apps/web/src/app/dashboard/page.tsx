import React from 'react';
import { TriPaneChamber } from '@/components/TriPaneChamber';

export default function DashboardPage() {
  return (
    <div className="w-full h-full">
      <h1 className="sr-only">Dashboard</h1>
      <TriPaneChamber />
    </div>
  );
}
