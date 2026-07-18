'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// Mock Initial Data
const INITIAL_ORGANIZATIONS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'India Practice Group (BNS & BNSS Compliance)', jurisdiction: 'IN', status: 'ACTIVE', subscription: 'ENTERPRISE', storage: 250 },
  { id: '22222222-2222-2222-2222-222222222222', name: 'US Federal Litigation (FRCP Compliance)', jurisdiction: 'US', status: 'ACTIVE', subscription: 'ENTERPRISE', storage: 500 },
  { id: '33333333-3333-3333-3333-333333333333', name: 'UK High Court Practice (CPR Compliance)', jurisdiction: 'SUSPENDED', subscription: 'BUSINESS', storage: 100 },
];

const INITIAL_USERS = [
  { id: 'usr-001', email: 'owner@nextcasehq.com', name: 'Platform Admin Owner', role: 'PLATFORM_ADMIN', organization: 'NextCaseHQ Platform Ops', status: 'ACTIVE' },
  { id: 'usr-002', email: 'sharma@delhi-bar.org', name: 'Senior Advocate Sharma', role: 'ADVOCATE', organization: 'India Practice Group', status: 'ACTIVE' },
  { id: 'usr-003', email: 'smith@uslitigation.com', name: 'Sarah Smith', role: 'ORG_ADMIN', organization: 'US Federal Litigation', status: 'ACTIVE' },
  { id: 'usr-004', email: 'jones@uklawyers.co.uk', name: 'David Jones', role: 'ADVOCATE', organization: 'UK High Court Practice', status: 'DISABLED' },
];

const INITIAL_LOGS = [
  { timestamp: '2026-03-31T14:45:12Z', type: 'SECURITY', message: 'Platform Administrator session initialized for owner@nextcasehq.com', ip: '10.0.4.89' },
  { timestamp: '2026-03-31T14:42:05Z', type: 'AUDIT', message: 'Organization US Federal Litigation storage quota increased to 500GB', ip: '10.0.4.89' },
  { timestamp: '2026-03-31T14:38:50Z', type: 'ERROR', message: 'Failed to stream AI response: token context limit reached', ip: '192.168.1.44' },
  { timestamp: '2026-03-31T14:30:11Z', type: 'AUTH', message: 'Failed login attempt from unauthorized domain user@unapproved.com', ip: '198.51.100.12' },
  { timestamp: '2026-03-31T14:15:22Z', type: 'PERFORMANCE', message: 'Slow request: GET /api/documents/upload took 182ms (limit: 50ms)', ip: '10.0.2.15' },
];

const INITIAL_JOBS = [
  { id: 'job-101', name: 'PostgreSQL Full Incremental Backup', schedule: 'Every 6 hours', lastRun: '2026-03-31T12:00:00Z', status: 'SUCCESS' },
  { id: 'job-102', name: 'OCR Ingestion Pipeline Queue Worker', schedule: 'Continuous', lastRun: '2026-03-31T14:45:00Z', status: 'RUNNING' },
  { id: 'job-103', name: 'Indian PII Scrubbing Audit', schedule: 'Hourly', lastRun: '2026-03-31T14:00:00Z', status: 'SUCCESS' },
  { id: 'job-104', name: 'Inference Cost Analytics Compiler', schedule: 'Daily 00:00', lastRun: '2026-03-30T00:00:00Z', status: 'FAILED' },
];

const INITIAL_AI_LOGS = [
  { timestamp: '2026-03-31T14:44:02Z', model: 'GPT-4-Turbo', tokens: 1240, cost: '$0.0372', status: 'SUCCESS' },
  { timestamp: '2026-03-31T14:43:10Z', model: 'Claude-3.5-Sonnet', tokens: 4890, cost: '$0.1467', status: 'SUCCESS' },
  { timestamp: '2026-03-31T14:40:15Z', model: 'Llama-3-70B-Litigation', tokens: 2048, cost: '$0.0041', status: 'SUCCESS' },
];

export default function AdminConsolePage() {
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // States for Dynamic Custom Admin Operations
  const [organizations, setOrganizations] = useState(INITIAL_ORGANIZATIONS);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [aiLogs, setAiLogs] = useState(INITIAL_AI_LOGS);

  // Form Inputs
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgJurisdiction, setNewOrgJurisdiction] = useState('IN');
  const [newOrgStorage, setNewOrgStorage] = useState(100);
  const [newOrgSubscription, setNewOrgSubscription] = useState('ENTERPRISE');

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('ADVOCATE');
  const [newUserOrg, setNewUserOrg] = useState('India Practice Group');

  // AI Selector
  const [selectedAiModel, setSelectedAiModel] = useState('Claude-3.5-Sonnet');
  const [aiToggles, setAiToggles] = useState({
    indiaPiiScrubbing: true,
    walletTokenEnforcement: true,
    edgeCaching: false,
    promptVersioning: true
  });

  // System Flags
  const [systemFlags, setSystemFlags] = useState({
    offlineDbSync: true,
    courtroomV1Live: true,
    betaSearchEngine: false,
    maintenanceLock: false
  });

  // Sentinel Governance Data (dynamic state loaded from API)
  const [sentinelState, setSentinelState] = useState({
    architecture: { status: 'PASS', duration: '0.04s', lastRun: '2026-03-31 14:12', commit: 'e28f321' },
    build: { status: 'PASS', duration: '9.88s', lastRun: '2026-03-31 14:13', commit: 'e28f321' },
    ui: { status: 'PASS', duration: '35.60s', lastRun: '2026-03-31 14:14', commit: 'e28f321' },
    release: { status: 'PASS', duration: '12.42s', lastRun: '2026-03-31 14:15', commit: 'e28f321' },
    bevs: { status: 'PASS', duration: '1.20s', lastRun: '2026-03-31 14:15', commit: 'e28f321' }
  });

  // Ask the server whether a valid admin session already exists. The
  // session cookie is httpOnly (server-verified, PR: Server-Verified Admin
  // Authentication) so the client can no longer read or forge it directly.
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const res = await fetch('/api/admin/session');
        if (res.ok) {
          const data = await res.json();
          setIsAdminAuthorized(Boolean(data.authorized));
        }
      } catch (e) {
        // Network failure: stay on the login gate.
      }
    };
    checkAdminSession();
    // Fetch real sentinel statuses dynamically
    fetchSentinelStatuses();
  }, []);

  const fetchSentinelStatuses = async () => {
    try {
      const res = await fetch('/api/admin/sentinels');
      if (res.ok) {
        const data = await res.json();
        setSentinelState(data);
      }
    } catch (e) {
      // Graceful fallback to initial mockup data
    }
  };

  // Secure Sign In handler — verified server-side against ADMIN_ACCESS_TOKEN
  // by POST /api/admin/session, which mints the (httpOnly) session cookie.
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey: accessKeyInput }),
      });
      if (res.ok) {
        setIsAdminAuthorized(true);
        setAuthError('');
        // Log event
        const newAuditLog = {
          timestamp: new Date().toISOString(),
          type: 'SECURITY',
          message: 'Platform Operator logged in with valid master authentication keys.',
          ip: '127.0.0.1'
        };
        setLogs([newAuditLog, ...logs]);
      } else {
        setAuthError('INVALID_ADMINISTRATIVE_SECRET_KEY. INCIDENT RECORDED IN AUDIT LOG.');
        const newAuditLog = {
          timestamp: new Date().toISOString(),
          type: 'AUTH',
          message: `Failed admin sign in attempt with invalid key: "${accessKeyInput}"`,
          ip: '127.0.0.1'
        };
        setLogs([newAuditLog, ...logs]);
      }
    } catch (err) {
      setAuthError('ADMIN_AUTH_SERVICE_UNAVAILABLE. TRY AGAIN.');
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      // Cookie is short-lived (24h) even if this call fails; proceed to
      // clear local UI state regardless.
    }
    setIsAdminAuthorized(false);
    setAccessKeyInput('');
  };

  // Handlers for Tenant CRUD
  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName) return;
    const newOrg = {
      id: `${Math.random().toString(36).substr(2, 8)}-${Math.random().toString(36).substr(2, 4)}-4321-8888-${Math.random().toString(36).substr(2, 12)}`,
      name: newOrgName,
      jurisdiction: newOrgJurisdiction,
      status: 'ACTIVE',
      subscription: newOrgSubscription,
      storage: Number(newOrgStorage)
    };
    setOrganizations([newOrg, ...organizations]);
    setNewOrgName('');
    // Append to audit logs
    const newAuditLog = {
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      message: `Organization "${newOrgName}" successfully created. Subscription: ${newOrgSubscription}. Storage: ${newOrgStorage}GB.`,
      ip: '127.0.0.1'
    };
    setLogs([newAuditLog, ...logs]);
  };

  const handleToggleOrgStatus = (id: string) => {
    setOrganizations(organizations.map(org => {
      if (org.id === id) {
        const nextStatus = org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        // Add log
        const newLog = {
          timestamp: new Date().toISOString(),
          type: 'SECURITY',
          message: `Organization "${org.name}" status modified to ${nextStatus}.`,
          ip: '127.0.0.1'
        };
        setLogs([newLog, ...logs]);
        return { ...org, status: nextStatus };
      }
      return org;
    }));
  };

  const handleDeleteOrg = (id: string) => {
    const org = organizations.find(o => o.id === id);
    if (!org) return;
    setOrganizations(organizations.filter(o => o.id !== id));
    const newLog = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY',
      message: `Organization "${org.name}" permanently purged from multi-tenant PostgreSQL registry.`,
      ip: '127.0.0.1'
    };
    setLogs([newLog, ...logs]);
  };

  // Handlers for User CRUD
  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserName) return;
    const newUser = {
      id: `usr-${Math.random().toString(36).substr(2, 3)}`,
      email: newUserEmail,
      name: newUserName,
      role: newUserRole,
      organization: newUserOrg,
      status: 'ACTIVE'
    };
    setUsers([newUser, ...users]);
    setNewUserEmail('');
    setNewUserName('');
    const newLog = {
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      message: `User "${newUserName}" invited to role "${newUserRole}" inside tenant "${newUserOrg}".`,
      ip: '127.0.0.1'
    };
    setLogs([newLog, ...logs]);
  };

  const handleToggleUserStatus = (id: string) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        const newLog = {
          timestamp: new Date().toISOString(),
          type: 'SECURITY',
          message: `User "${u.name}" account set to ${nextStatus}.`,
          ip: '127.0.0.1'
        };
        setLogs([newLog, ...logs]);
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleResetUserAccess = (id: string) => {
    const u = users.find(user => user.id === id);
    if (!u) return;
    const newLog = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY',
      message: `Security credentials and RSA envelope sessions reset for User "${u.name}".`,
      ip: '127.0.0.1'
    };
    setLogs([newLog, ...logs]);
    alert(`Access security key and authorization token cycle triggered for ${u.name}.`);
  };

  // System Operations Action Simulators
  const triggerSystemBackup = () => {
    const newBackupJob = {
      id: `job-${Math.random().toString(36).substr(2, 3)}`,
      name: 'Ad-hoc Production Registry Snapshot',
      schedule: 'Manual Trigger',
      lastRun: new Date().toISOString(),
      status: 'SUCCESS'
    };
    setJobs([newBackupJob, ...jobs]);
    const newLog = {
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      message: 'Platform Owner triggered hot manual system snapshot. Database status: 100% HEALTHY.',
      ip: '127.0.0.1'
    };
    setLogs([newLog, ...logs]);
  };

  const purgeSystemCache = () => {
    const newLog = {
      timestamp: new Date().toISOString(),
      type: 'PERFORMANCE',
      message: 'Next.js rendering and Turborepo compilation cache cleared from redis/memory-ledger.',
      ip: '127.0.0.1'
    };
    setLogs([newLog, ...logs]);
    alert('System cache purged successfully.');
  };

  // Derived metrics
  const totalOrgs = organizations.length;
  const activeLawFirms = organizations.filter(o => o.status === 'ACTIVE').length;
  const totalUsers = users.length;
  const activeSessionsCount = users.filter(u => u.status === 'ACTIVE').length + 1; // plus current admin
  const totalAdvocates = users.filter(u => u.role === 'ADVOCATE').length;
  const storageAllocated = organizations.reduce((acc, curr) => acc + curr.storage, 0);

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-[#111111] text-[#FDFBF7]' : 'bg-[#FDFBF7] text-[#111111]'} transition-colors duration-200 selection:bg-[#111111] selection:text-[#FDFBF7]`}>

      {/* Top Banner (Platform Owner Authority Gate) */}
      <div className="bg-[#111111] text-[#FDFBF7] border-b border-[#FDFBF7]/15 py-3 px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 bg-indigo-600 text-[10px] tracking-wider uppercase font-extrabold rounded text-white animate-pulse">
            ADMINSEC_V1.0
          </div>
          <span className="text-xs font-mono tracking-widest uppercase">
            NEXTCASEHQ — CENTRALIZED PLATFORM ADMINISTRATION CONSOLE
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-neutral-400">
            Current Operator: <span className="text-[#FDFBF7] font-mono">owner@nextcasehq.com</span>
          </span>
          {isAdminAuthorized && (
            <button
              onClick={handleAdminLogout}
              className="px-2.5 py-1 rounded text-[10px] bg-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-700 transition-all"
            >
              Lock Console
            </button>
          )}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1 rounded border border-[#FDFBF7]/20 hover:bg-[#FDFBF7]/10 transition-all text-[11px]"
            title="Toggle theme mode"
          >
            {isDarkMode ? '☀️ LIGHT' : '🌙 DARK'}
          </button>
        </div>
      </div>

      {!isAdminAuthorized ? (
        /* Zero-Trust Authenticated Authorization Login/Gate Screen */
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-12 font-sans">
          <div className="w-full max-w-md bg-white dark:bg-[#111111] border border-[#111111]/10 dark:border-[#FDFBF7]/10 rounded shadow-sm p-8 space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-600 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold uppercase tracking-wider text-[#111111] dark:text-[#FDFBF7]">
                Admin Console Gate
              </h2>
              <p className="mt-1 text-xs text-neutral-500 font-serif italic">
                Input Platform Master Access Secret Key to verify authorization.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 text-[10px] font-mono font-bold rounded">
                {authError}
              </div>
            )}

            <form onSubmit={handleAdminSignIn} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Platform Operator Secret Key
                </label>
                <input
                  type="password"
                  value={accessKeyInput}
                  onChange={(e) => setAccessKeyInput(e.target.value)}
                  placeholder="e.g. nchq-admin-ops-2026"
                  required
                  className="w-full px-4 py-3 bg-[#111111]/5 dark:bg-[#FDFBF7]/5 border border-[#111111]/10 dark:border-[#FDFBF7]/10 rounded outline-none focus:border-indigo-600 dark:focus:border-indigo-600 font-mono text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#111111] dark:bg-[#FDFBF7] text-[#FDFBF7] dark:text-[#111111] font-bold uppercase tracking-wider text-xs rounded hover:opacity-90 active:scale-[0.99] transition-all"
              >
                Verify Secure Access
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Authorized Admin Console Main Workspace */
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-45px)]">

          {/* Admin Navigation Sidebar */}
          <aside className={`w-full lg:w-64 border-b lg:border-b-0 lg:border-r ${isDarkMode ? 'border-[#FDFBF7]/10 bg-[#111111]' : 'border-[#111111]/10 bg-white'} flex-shrink-0`}>
            {/* Admin Header Info */}
            <div className="p-6 border-b border-inherit">
              <Link href="/" className="flex items-center gap-2 group">
                <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-bold text-base tracking-tight">
                  NextCase<span className="text-indigo-600 font-black">OPS</span>
                </span>
              </Link>
              <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Litigation OS Operator
              </div>
            </div>

            {/* Sidebar Tab Selectors */}
            <nav className="p-4 space-y-1">
              {[
                { id: 'dashboard', label: 'Operational Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z' },
                { id: 'tenants', label: 'Tenant Management', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                { id: 'users', label: 'User & Access Security', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m12-14a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 11-6 0 3 3 0 016 0zm3 10v-2a4 4 0 00-3-3.87m-1.12 1.13A5.002 5.002 0 0119 16v3h5z' },
                { id: 'ai', label: 'AI Engines & Prompt Registry', icon: 'M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
                { id: 'systems', label: 'System Operations & Flags', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                { id: 'observability', label: 'Streaming Observability Logs', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { id: 'validation', label: 'Sentinel DoD Governance', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                { id: 'deployment', label: 'Deployment & CI/CD', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { id: 'analytics', label: 'Growth & Usage Analytics', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-3 transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-600/10 text-neutral-500'}`}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Quick Access to Main App */}
            <div className="p-6 border-t border-inherit mt-auto">
              <Link
                href="/dashboard"
                className={`w-full py-2.5 text-center block bg-[#111111] dark:bg-[#FDFBF7] text-[#FDFBF7] dark:text-[#111111] text-xs font-bold uppercase tracking-widest rounded shadow hover:opacity-95 transition-all`}
              >
                ← Back to Workspace
              </Link>
            </div>
          </aside>

          {/* Admin Main Workspace Pane */}
          <main className="flex-1 p-6 md:p-10 max-w-7xl overflow-x-hidden">

            {/* TAB 1: OPERATIONAL PLATFORM DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-wider mb-2">Operational Dashboard</h1>
                  <p className="text-sm font-serif italic text-neutral-500">
                    Real-time operational health, telemetry tracking, and resource saturation across NextCaseHQ Litigation OS.
                  </p>
                </div>

                {/* Key Status Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`p-5 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} flex items-center justify-between`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Platform Health</div>
                      <div className="text-lg font-extrabold text-green-600 mt-1 flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
                        STABLE // ACTIVE
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-green-600/10 text-green-600 text-[10px] font-mono font-bold rounded ml-2">100%</div>
                  </div>

                  <div className={`p-5 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} flex items-center justify-between`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Inference Gateway Status</div>
                      <div className="text-lg font-extrabold text-indigo-600 mt-1 flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        ONLINE ({selectedAiModel})
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-indigo-600/10 text-indigo-600 text-[10px] font-mono font-bold rounded ml-2">&lt;14ms</div>
                  </div>

                  <div className={`p-5 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} flex items-center justify-between`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">GitHub Actions Status</div>
                      <div className="text-lg font-extrabold text-green-600 mt-1 flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-green-600"></span>
                        WORKFLOW_PASS
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-green-600/10 text-green-600 text-[10px] font-mono font-bold rounded ml-2">CI/CD OK</div>
                  </div>
                </div>

                {/* Main operational count grids */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Organizations', value: totalOrgs },
                    { label: 'Active Law Firms', value: activeLawFirms },
                    { label: 'Total Advocates', value: totalAdvocates },
                    { label: 'Active Sessions', value: activeSessionsCount },
                    { label: 'Cases / Matters', value: '48 / 16' },
                    { label: 'Registered Evidence', value: '112 Exhibits' },
                    { label: 'Drafts Created', value: '89 Documents' },
                    { label: 'Storage Used', value: `${storageAllocated} GB / 5.0 TB` },
                  ].map((metric, i) => (
                    <div key={i} className={`p-5 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'}`}>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2">{metric.label}</div>
                      <div className="text-2xl font-black">{metric.value}</div>
                    </div>
                  ))}
                </div>

                {/* Real-Time Telemetries & Health details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* API Health metrics */}
                  <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                    <h3 className="text-sm font-black uppercase tracking-wider border-b border-inherit pb-3 flex justify-between">
                      <span>API Router Health & Latency</span>
                      <span className="text-[10px] font-mono text-indigo-600">Active Monitoring</span>
                    </h3>
                    <div className="space-y-3 text-xs font-mono">
                      {[
                        { route: '/api/health', method: 'GET', status: '200 OK', latency: '2.44ms', budget: '10ms' },
                        { route: '/api/documents/upload', method: 'POST', status: '202 Accepted', latency: '44.80ms', budget: '50ms' },
                        { route: '/api/webhooks', method: 'POST', status: '202 Accepted', latency: '35.10ms', budget: '50ms' },
                        { route: '/api/auth/session', method: 'POST', status: '200 OK', latency: '12.45ms', budget: '20ms' },
                      ].map((r, i) => (
                        <div key={i} className="flex justify-between items-center py-1 border-b border-inherit last:border-0">
                          <div>
                            <span className="font-extrabold text-indigo-600 mr-2">{r.method}</span>
                            <span className="text-neutral-500">{r.route}</span>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-green-600 font-bold">{r.status}</span>
                            <span className="text-right w-16">{r.latency}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sentinel & BEVS Summary Statuses */}
                  <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                    <h3 className="text-sm font-black uppercase tracking-wider border-b border-inherit pb-3">
                      Sentinel Framework Verifications
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: 'Architecture Sentinel', status: sentinelState.architecture.status, color: 'text-green-600' },
                        { name: 'Build Sentinel', status: sentinelState.build.status, color: 'text-green-600' },
                        { name: 'UI Sentinel', status: sentinelState.ui.status, color: 'text-green-600' },
                        { name: 'Release Sentinel', status: sentinelState.release.status, color: 'text-green-600' },
                        { name: 'BEVS Validation Status', status: sentinelState.bevs.status, color: 'text-green-600' },
                      ].map((item, i) => (
                        <div key={i} className="p-3 border border-inherit rounded flex justify-between items-center">
                          <span className="text-xs font-bold tracking-wider uppercase text-neutral-400">{item.name}</span>
                          <span className={`text-xs font-mono font-black ${item.color}`}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Platform Errors display */}
                <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                  <h3 className="text-sm font-black uppercase tracking-wider text-red-600 flex justify-between">
                    <span>Recent Platform Errors & Incidents</span>
                    <span className="text-xs font-mono">Real-time Catch</span>
                  </h3>
                  <div className="space-y-3">
                    {logs.filter(l => l.type === 'ERROR').map((err, i) => (
                      <div key={i} className="p-3 bg-red-600/5 border border-red-600/15 rounded flex flex-col md:flex-row justify-between gap-2 text-xs font-mono">
                        <div>
                          <span className="text-red-600 font-extrabold uppercase mr-3">[{err.type}]</span>
                          <span>{err.message}</span>
                        </div>
                        <div className="text-right text-neutral-400 text-[10px]">
                          {err.timestamp} // IP: {err.ip}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TENANT MANAGEMENT */}
            {activeTab === 'tenants' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-wider mb-2">Tenant Management Console</h1>
                  <p className="text-sm font-serif italic text-neutral-500">
                    Register, configure, allocate resources, and oversee the subscription status of Litigation Groups.
                  </p>
                </div>

                {/* Create New Tenant Form */}
                <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                  <h3 className="text-sm font-black uppercase tracking-wider">Provision New Organization Tenant</h3>
                  <form onSubmit={handleCreateOrg} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Org Name</label>
                      <input
                        type="text"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="e.g. Apex Court Chambers"
                        className="w-full px-3 py-2 text-xs bg-[#111111]/5 dark:bg-[#FDFBF7]/5 border border-[#111111]/10 dark:border-[#FDFBF7]/10 rounded outline-none focus:border-[#111111] dark:focus:border-[#FDFBF7]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Jurisdiction Pack</label>
                      <select
                        value={newOrgJurisdiction}
                        onChange={(e) => setNewOrgJurisdiction(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#111111]/5 dark:bg-[#FDFBF7]/5 border border-[#111111]/10 dark:border-[#FDFBF7]/10 rounded outline-none"
                      >
                        <option value="IN">IN (Section 12 BNSS Compliant)</option>
                        <option value="US">US (FRCP Compliant)</option>
                        <option value="UK">UK (CPR Compliant)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Storage Allocation (GB)</label>
                      <input
                        type="number"
                        value={newOrgStorage}
                        onChange={(e) => setNewOrgStorage(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-[#111111]/5 dark:bg-[#FDFBF7]/5 border border-[#111111]/10 dark:border-[#FDFBF7]/10 rounded outline-none focus:border-[#111111]"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="py-2 px-4 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider rounded transition-all h-[34px]"
                    >
                      Provision Tenant
                    </button>
                  </form>
                </div>

                {/* Organization Tenants List Table */}
                <div className={`border ${isDarkMode ? 'border-[#FDFBF7]/10' : 'border-[#111111]/10'} rounded overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`text-[10px] font-mono uppercase tracking-wider border-b ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10 text-neutral-400' : 'bg-neutral-50 border-[#111111]/10 text-neutral-500'}`}>
                          <th className="p-4">Organization Detail</th>
                          <th className="p-4">Jurisdiction</th>
                          <th className="p-4">Subscription Plan</th>
                          <th className="p-4">Storage Allocation</th>
                          <th className="p-4">Operational Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit text-xs">
                        {organizations.map((org) => (
                          <tr key={org.id} className="hover:bg-indigo-600/5">
                            <td className="p-4">
                              <div className="font-bold">{org.name}</div>
                              <div className="text-[10px] font-mono text-neutral-400 mt-0.5">ID: {org.id}</div>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded font-mono font-bold">{org.jurisdiction}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-bold">{org.subscription}</span>
                            </td>
                            <td className="p-4 font-mono">
                              {org.storage} GB Allocated
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${org.status === 'ACTIVE' ? 'bg-green-600/10 text-green-600' : 'bg-red-600/10 text-red-600'}`}>
                                {org.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => handleToggleOrgStatus(org.id)}
                                className={`px-2 py-1 border rounded text-[10px] font-mono uppercase font-bold transition-all ${org.status === 'ACTIVE' ? 'border-red-600/30 hover:bg-red-600/10 text-red-600' : 'border-green-600/30 hover:bg-green-600/10 text-green-600'}`}
                              >
                                {org.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                              </button>
                              <button
                                onClick={() => handleDeleteOrg(org.id)}
                                className="px-2 py-1 border border-neutral-600/30 hover:bg-red-600 hover:text-white hover:border-red-600 rounded text-[10px] font-mono uppercase font-bold transition-all"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: USER & ACCESS SECURITY */}
            {activeTab === 'users' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-wider mb-2">User & Access Security</h1>
                  <p className="text-sm font-serif italic text-neutral-500">
                    Oversee administrative permissions, invite advocates, reset RSA security context envelopes, or disable access.
                  </p>
                </div>

                {/* Invite User Form */}
                <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                  <h3 className="text-sm font-black uppercase tracking-wider">Invite/Provision Secure User</h3>
                  <form onSubmit={handleInviteUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">User Email</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="advocate@firm.com"
                        className="w-full px-3 py-2 text-xs bg-[#111111]/5 dark:bg-[#FDFBF7]/5 border border-[#111111]/10 dark:border-[#FDFBF7]/10 rounded outline-none focus:border-[#111111]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">User Full Name</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 text-xs bg-[#111111]/5 dark:bg-[#FDFBF7]/5 border border-[#111111]/10 dark:border-[#FDFBF7]/10 rounded outline-none focus:border-[#111111]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">User Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#111111]/5 dark:bg-[#FDFBF7]/5 border border-[#111111]/10 dark:border-[#FDFBF7]/10 rounded outline-none"
                      >
                        <option value="ADVOCATE">Advocate (Litigation Counsel)</option>
                        <option value="ORG_ADMIN">Organization Administrator</option>
                        <option value="PLATFORM_ADMIN">Platform Administrator</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="py-2 px-4 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider rounded transition-all h-[34px]"
                    >
                      Invite User
                    </button>
                  </form>
                </div>

                {/* Users List Table */}
                <div className={`border ${isDarkMode ? 'border-[#FDFBF7]/10' : 'border-[#111111]/10'} rounded overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`text-[10px] font-mono uppercase tracking-wider border-b ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10 text-neutral-400' : 'bg-neutral-50 border-[#111111]/10 text-neutral-500'}`}>
                          <th className="p-4">User Detail</th>
                          <th className="p-4">Platform / Tenant Role</th>
                          <th className="p-4">Organization Context</th>
                          <th className="p-4">Auth Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit text-xs">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-indigo-600/5">
                            <td className="p-4">
                              <div className="font-bold">{user.name}</div>
                              <div className="text-[10px] font-mono text-neutral-400 mt-0.5">{user.email} // ID: {user.id}</div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${user.role === 'PLATFORM_ADMIN' ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-800'}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-neutral-500">
                              {user.organization}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono ${user.status === 'ACTIVE' ? 'bg-green-600/10 text-green-600' : 'bg-red-600/10 text-red-600'}`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => handleToggleUserStatus(user.id)}
                                className={`px-2 py-1 border rounded text-[10px] font-mono uppercase font-bold transition-all ${user.status === 'ACTIVE' ? 'border-red-600/30 hover:bg-red-600/10 text-red-600' : 'border-green-600/30 hover:bg-green-600/10 text-green-600'}`}
                              >
                                {user.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => handleResetUserAccess(user.id)}
                                className="px-2 py-1 border border-neutral-600/30 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 rounded text-[10px] font-mono uppercase font-bold transition-all"
                              >
                                Reset Access
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AI MANAGEMENT */}
            {activeTab === 'ai' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-wider mb-2">AI Engines & Prompt Registry</h1>
                  <p className="text-sm font-serif italic text-neutral-500">
                    Configure inference models, monitor provider status, track cost analytics, and inspect logs.
                  </p>
                  <div className="mt-2 p-3 bg-indigo-600/5 border border-indigo-600/10 rounded text-xs text-indigo-600 font-mono font-bold">
                    🛡️ SECURITY MANDATE: Plain API keys are never exposed. Telemetry displays health and configuration status only.
                  </div>
                </div>

                {/* AI Configuration Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Model & Feature Controls */}
                  <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-6`}>
                    <h3 className="text-sm font-black uppercase tracking-wider border-b border-inherit pb-3">Active Inference Model Selection</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Default Legal Model</label>
                        <select
                          value={selectedAiModel}
                          onChange={(e) => {
                            setSelectedAiModel(e.target.value);
                            const newLog = {
                              timestamp: new Date().toISOString(),
                              type: 'AUDIT',
                              message: `Primary AI Model swapped to: ${e.target.value}. Latency budget: 14ms.`,
                              ip: '127.0.0.1'
                            };
                            setLogs([newLog, ...logs]);
                          }}
                          className="w-full px-3 py-2 bg-[#111111]/5 dark:bg-[#FDFBF7]/5 border border-[#111111]/10 dark:border-[#FDFBF7]/10 rounded text-sm font-bold outline-none"
                        >
                          <option value="Claude-3.5-Sonnet">Claude-3.5-Sonnet (Premium Drafting)</option>
                          <option value="GPT-4-Turbo">GPT-4-Turbo (High Logic Reasoning)</option>
                          <option value="Llama-3-70B-Litigation">Llama-3-70B-Litigation (On-Premise Fine-Tuned)</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">AI Gateway Feature Toggles</label>
                        {Object.entries(aiToggles).map(([key, val]) => (
                          <div key={key} className="flex justify-between items-center py-1.5 border-b border-inherit last:border-0 text-xs">
                            <span className="font-bold uppercase tracking-wider font-mono text-neutral-400">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <button
                              onClick={() => {
                                const nextToggles = { ...aiToggles, [key]: !val };
                                setAiToggles(nextToggles);
                                const newLog = {
                                  timestamp: new Date().toISOString(),
                                  type: 'AUDIT',
                                  message: `AI Feature toggle "${key}" modified to ${!val}.`,
                                  ip: '127.0.0.1'
                                };
                                setLogs([newLog, ...logs]);
                              }}
                              className={`px-3 py-1 text-[10px] font-mono font-black rounded uppercase ${val ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'}`}
                            >
                              {val ? 'ENABLED' : 'DISABLED'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Provider Health Monitor */}
                  <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                    <h3 className="text-sm font-black uppercase tracking-wider border-b border-inherit pb-3">API Providers & Costs</h3>
                    <div className="space-y-3 font-mono text-xs">
                      {[
                        { provider: 'Anthropic AI Engine', apiStatus: 'ONLINE', costMetric: '$0.03 / 1k tokens', p95Latency: '11.8ms' },
                        { provider: 'OpenAI API Gateway', apiStatus: 'ONLINE', costMetric: '$0.015 / 1k tokens', p95Latency: '15.4ms' },
                        { provider: 'Local Llama GPU Stack', apiStatus: 'STABLE', costMetric: 'N/A (Bare Metal Infrastructure)', p95Latency: '8.1ms' },
                      ].map((prov, i) => (
                        <div key={i} className="p-3 border border-inherit rounded space-y-1">
                          <div className="flex justify-between font-bold">
                            <span>{prov.provider}</span>
                            <span className="text-green-600">{prov.apiStatus}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-neutral-400">
                            <span>Rates: {prov.costMetric}</span>
                            <span>Latency: {prov.p95Latency}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-indigo-600/5 rounded text-xs space-y-1 font-mono">
                      <div className="font-bold uppercase tracking-wider">Prompt Version Registry</div>
                      <div className="text-[11px] text-neutral-400">Active Registry: <span className="font-bold text-indigo-600">v1.2.4-stable (Indian Law compliant)</span></div>
                      <div className="text-[11px] text-neutral-400">Total Preloaded Templates: <span className="font-bold">42 regional writs / plaints</span></div>
                    </div>
                  </div>
                </div>

                {/* AI Request Logs */}
                <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                  <h3 className="text-sm font-black uppercase tracking-wider">Live AI Request Logging</h3>
                  <div className="space-y-2">
                    {aiLogs.map((logItem, i) => (
                      <div key={i} className="p-3 border border-inherit rounded flex flex-col md:flex-row justify-between text-xs font-mono">
                        <div>
                          <span className="font-bold text-indigo-600 uppercase mr-3">[{logItem.model}]</span>
                          <span>Inference computed for active drafting session. Tokens: {logItem.tokens}</span>
                        </div>
                        <div className="text-right space-x-4">
                          <span className="text-green-600 font-bold">{logItem.status}</span>
                          <span className="font-semibold text-neutral-400">Est. Cost: {logItem.cost}</span>
                          <span className="text-neutral-500 text-[10px]">{logItem.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: SYSTEM OPERATIONS & FLAGS */}
            {activeTab === 'systems' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-wider mb-2">System Operations & Flags</h1>
                  <p className="text-sm font-serif italic text-neutral-500">
                    Interact directly with hot-reload Feature Flags, clear memory cache, simulate disaster backup recovery, or monitor queue workers.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Feature Flags Panel */}
                  <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                    <h3 className="text-sm font-black uppercase tracking-wider border-b border-inherit pb-3">Global Application Feature Flags</h3>
                    <div className="space-y-3">
                      {Object.entries(systemFlags).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-2 border-b border-inherit last:border-0 text-xs">
                          <span className="font-bold uppercase tracking-wider font-mono text-neutral-400">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <button
                            onClick={() => {
                              const nextFlags = { ...systemFlags, [key]: !value };
                              setSystemFlags(nextFlags);
                              const newLog = {
                                timestamp: new Date().toISOString(),
                                type: 'AUDIT',
                                message: `Global Feature Flag "${key}" changed to ${!value}.`,
                                ip: '127.0.0.1'
                              };
                              setLogs([newLog, ...logs]);
                            }}
                            className={`px-3 py-1 text-[10px] font-mono font-black rounded uppercase ${value ? 'bg-green-600 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'}`}
                          >
                            {value ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cache & DB Utilities */}
                  <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-6`}>
                    <h3 className="text-sm font-black uppercase tracking-wider border-b border-inherit pb-3">Quick Maintenance Controls</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={triggerSystemBackup}
                        className="p-4 border border-[#111111]/10 dark:border-[#FDFBF7]/10 hover:border-indigo-600 rounded text-left transition-all active:scale-95 space-y-1"
                      >
                        <div className="text-xs font-black uppercase tracking-wider">Trigger DB Backup</div>
                        <div className="text-[10px] text-neutral-400">Perform instant system-wide snapshot.</div>
                      </button>

                      <button
                        onClick={purgeSystemCache}
                        className="p-4 border border-[#111111]/10 dark:border-[#FDFBF7]/10 hover:border-red-600 rounded text-left transition-all active:scale-95 space-y-1"
                      >
                        <div className="text-xs font-black uppercase tracking-wider text-red-500">Purge Redis Cache</div>
                        <div className="text-[10px] text-neutral-400">Clears compiled Turborepo targets.</div>
                      </button>
                    </div>

                    <div className="p-4 bg-[#111111]/5 dark:bg-[#FDFBF7]/5 rounded text-xs font-mono space-y-2">
                      <div className="font-bold uppercase tracking-wider flex justify-between">
                        <span>Database Health Status</span>
                        <span className="text-green-600">100% HEALTHY</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
                        <div>Active Conn Pool: 14 / 100</div>
                        <div>Disk Utilization: 8.44%</div>
                        <div>Replication lag: 0.12ms</div>
                        <div>SLA Uptime: 99.999%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Background Scheduled Jobs / Queues */}
                <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                  <h3 className="text-sm font-black uppercase tracking-wider">Active Background Job Queues</h3>
                  <div className="space-y-2">
                    {jobs.map((job, i) => (
                      <div key={i} className="p-3 border border-inherit rounded flex flex-col md:flex-row justify-between items-center text-xs font-mono">
                        <div>
                          <span className="font-extrabold uppercase mr-3">{job.name}</span>
                          <span className="text-neutral-400">Schedule: {job.schedule}</span>
                        </div>
                        <div className="flex gap-6 items-center">
                          <span className="text-neutral-400">Last Executed: {job.lastRun}</span>
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider font-mono ${job.status === 'RUNNING' ? 'bg-indigo-600/10 text-indigo-600 animate-pulse' : job.status === 'SUCCESS' ? 'bg-green-600/10 text-green-600' : 'bg-red-600/10 text-red-600'}`}>
                            {job.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: STREAMING OBSERVABILITY LOGS */}
            {activeTab === 'observability' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-wider mb-2">Streaming Observability Logs</h1>
                  <p className="text-sm font-serif italic text-neutral-500">
                    Audit security logs, application events, slow requests, failed background jobs, and JWT validation records.
                  </p>
                </div>

                {/* Filter and Stream Controls */}
                <div className={`p-4 border ${isDarkMode ? 'border-[#FDFBF7]/10' : 'border-[#111111]/10'} rounded flex justify-between items-center text-xs font-mono`}>
                  <div className="flex gap-4">
                    <span className="font-bold uppercase text-neutral-400">Streaming:</span>
                    <span className="text-green-600 flex items-center gap-1.5 font-bold">
                      <span className="w-2 h-2 rounded-full bg-green-600 animate-ping"></span>
                      LIVE CONNECTION ACTIVE
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const demoLog = {
                        timestamp: new Date().toISOString(),
                        type: 'AUDIT',
                        message: 'Ad-hoc manual verification requested via Platform Ops admin page.',
                        ip: '127.0.0.1'
                      };
                      setLogs([demoLog, ...logs]);
                    }}
                    className="px-3 py-1 border border-inherit rounded hover:bg-indigo-600 hover:text-white transition-all font-bold font-mono"
                  >
                    Inject Test Log Event
                  </button>
                </div>

                {/* Logs Listing */}
                <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-3 font-mono text-xs`}>
                  {logs.map((log, i) => (
                    <div key={i} className="py-2.5 border-b border-inherit last:border-0 flex flex-col md:flex-row justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.type === 'SECURITY' ? 'bg-purple-600 text-white' : log.type === 'AUDIT' ? 'bg-blue-600 text-white' : log.type === 'ERROR' ? 'bg-red-600 text-white' : log.type === 'AUTH' ? 'bg-yellow-600 text-black' : 'bg-neutral-600 text-white'}`}>
                          {log.type}
                        </span>
                        <span>{log.message}</span>
                      </div>
                      <div className="text-right text-neutral-400 text-[10px] flex-shrink-0">
                        {log.timestamp} // {log.ip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 7: SENTINEL DOD GOVERNANCE */}
            {activeTab === 'validation' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-wider mb-2">Sentinel Governance Dashboard</h1>
                  <p className="text-sm font-serif italic text-neutral-500">
                    Certify release conditions, verify test suites, audit design tokens, and inspect independent validation outputs.
                  </p>
                </div>

                {/* DoD Compliance Progress */}
                <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                  <h3 className="text-sm font-black uppercase tracking-wider">Independent Quality Assurance Certification Status</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-black text-green-600">100%</div>
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-600 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                        All 5 core Sentinel gatekeepers verified as PASS // Zero active defects
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sentinel Verification Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(sentinelState).map(([key, val]) => (
                    <div key={key} className={`p-5 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-3`}>
                      <div className="flex justify-between items-center border-b border-inherit pb-2.5">
                        <span className="text-xs font-black uppercase tracking-wider font-mono">{key} Sentinel Gate</span>
                        <span className="px-2.5 py-0.5 bg-green-600 text-white text-[10px] font-mono font-black rounded uppercase">
                          {val.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs font-mono text-neutral-400">
                        <div>Last Execution: <span className="text-[#111111] dark:text-[#FDFBF7] font-bold">{val.lastRun}</span></div>
                        <div>Duration: <span className="text-[#111111] dark:text-[#FDFBF7] font-bold">{val.duration}</span></div>
                        <div>Linked Git Commit: <span className="text-indigo-600 font-bold">SHA {val.commit}</span></div>
                        <div className="pt-2">
                          <span className="text-[11px] underline cursor-pointer text-indigo-600 font-bold hover:text-indigo-800">
                            View GitHub Actions Asset Link
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 8: DEPLOYMENT & CI/CD */}
            {activeTab === 'deployment' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-wider mb-2">Deployment & CI/CD</h1>
                  <p className="text-sm font-serif italic text-neutral-500">
                    Oversee version states, active release branches, and compile metrics across the Litigation OS repository.
                  </p>
                </div>

                {/* Live Code Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`p-5 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'}`}>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2">Litigation OS Version</div>
                    <div className="text-2xl font-black">v1.0.0-rc1</div>
                  </div>
                  <div className={`p-5 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'}`}>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2">Active Git Branch</div>
                    <div className="text-xl font-bold font-mono">feat/admin-ops-console</div>
                  </div>
                  <div className={`p-5 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'}`}>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2">Commit SHA</div>
                    <div className="text-xl font-bold font-mono text-indigo-600">e28f3214da9</div>
                  </div>
                </div>

                {/* Deployment History Timeline */}
                <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                  <h3 className="text-sm font-black uppercase tracking-wider">Recent CI/CD Deployment History</h3>
                  <div className="space-y-4 text-xs font-mono">
                    {[
                      { version: 'v1.0.0-rc1', date: '2026-03-31 14:15', status: 'SUCCESS', trigger: 'Push trigger: branch main' },
                      { version: 'v0.9.0-rc.1', date: '2026-03-29 09:30', status: 'SUCCESS', trigger: 'Manual operator execution: build release' },
                      { version: 'v0.8.4', date: '2026-03-15 11:22', status: 'SUCCESS', trigger: 'Pull Request #4 merged into main' },
                    ].map((dep, i) => (
                      <div key={i} className="flex justify-between items-start py-2 border-b border-inherit last:border-0">
                        <div className="space-y-1">
                          <div className="font-bold flex items-center gap-2">
                            <span>Release {dep.version}</span>
                            <span className="px-2 py-0.5 bg-green-600/10 text-green-600 text-[9px] rounded font-mono">DEPLOYED</span>
                          </div>
                          <div className="text-neutral-400 text-[11px]">{dep.trigger}</div>
                        </div>
                        <div className="text-right text-neutral-400 text-[11px]">
                          {dep.date}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 9: GROWTH & USAGE ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-wider mb-2">Growth & Usage Analytics</h1>
                  <p className="text-sm font-serif italic text-neutral-500">
                    Examine system usage patterns, daily active advocates, search index query rates, and multi-tenant resource growth.
                  </p>
                </div>

                {/* Metric graphs representations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Daily Active Users Chart representation */}
                  <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                    <h3 className="text-sm font-black uppercase tracking-wider">User Growth & Daily Active Users (DAU)</h3>
                    <div className="h-44 flex items-end gap-2 border-b border-inherit pb-2">
                      {[12, 18, 25, 45, 62, 89, 112].map((height, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div className="w-full bg-indigo-600 hover:opacity-80 transition-all rounded-t" style={{ height: `${height}%` }}></div>
                          <span className="text-[10px] font-mono text-neutral-400 mt-2">Day {i+1}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-neutral-400 font-mono">
                      Metric summary: <span className="text-[#111111] dark:text-[#FDFBF7] font-bold">112 Daily Active Advocates</span> across all registered firm networks.
                    </div>
                  </div>

                  {/* Feature Usage & Storage consumption */}
                  <div className={`p-6 rounded border ${isDarkMode ? 'bg-[#1a1a1a] border-[#FDFBF7]/10' : 'bg-white border-[#111111]/10'} space-y-4`}>
                    <h3 className="text-sm font-black uppercase tracking-wider">Inference & Feature Usage Distribution</h3>
                    <div className="space-y-4 font-mono text-xs">
                      {[
                        { name: 'AI Conversation & Case Memory', percentage: 48 },
                        { name: 'OCR Ingestion Pipeline Stream', percentage: 28 },
                        { name: 'India PII Scrubbing (Aadhaar/PAN)', percentage: 14 },
                        { name: 'Offline IndexedDB Sync', percentage: 10 },
                      ].map((feat, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold">{feat.name}</span>
                            <span>{feat.percentage}%</span>
                          </div>
                          <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${feat.percentage}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      )}
    </div>
  );
}
