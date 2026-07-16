'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Import all sub-panel components
import Dashboard from './components/Dashboard';
import TenantManagement from './components/TenantManagement';
import UserManagement from './components/UserManagement';
import AIGateway from './components/AIGateway';
import SystemOperations from './components/SystemOperations';
import Observability from './components/Observability';
import Deployment from './components/Deployment';
import Performance from './components/Performance';
import Settings from './components/Settings';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', component: <Dashboard /> },
    { id: 'tenants', label: 'Tenant Management', component: <TenantManagement /> },
    { id: 'users', label: 'User Management', component: <UserManagement /> },
    { id: 'ai-gateway', label: 'AI Gateway', component: <AIGateway /> },
    { id: 'operations', label: 'System Operations', component: <SystemOperations /> },
    { id: 'observability', label: 'Observability', component: <Observability /> },
    { id: 'deployment', label: 'Deployment', component: <Deployment /> },
    { id: 'performance', label: 'Performance', component: <Performance /> },
    { id: 'settings', label: 'Settings', component: <Settings /> }
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans">

      {/* Header Panel */}
      <header className="w-full h-16 bg-white border-b border-neutral-100 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            <svg
              className="w-6 h-6 text-[#111111]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-bold text-base text-[#111111] tracking-tight">
              NextCase<span className="text-indigo-600">HQ</span>
            </span>
          </Link>
          <span className="text-neutral-200 select-none">•</span>
          <span className="font-bold text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Platform System Console
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-neutral-400 hover:text-[#111111] transition-colors"
          >
            Chamber View
          </Link>
          <div className="h-4 w-px bg-neutral-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold text-[#111111]">Platform Healthy</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">

        {/* Sidebar Nav */}
        <aside className="w-64 bg-white border-r border-neutral-100 p-6 flex flex-col gap-1 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-3 mb-4">SYSTEM CONSOLE</p>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-[#111111]'
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
            </button>
          ))}
        </aside>

        {/* Dynamic Content Frame */}
        <main className="flex-1 p-8 max-w-5xl mx-auto w-full animate-fade-in">
          {currentTab.component}
        </main>

      </div>
    </div>
  );
}
