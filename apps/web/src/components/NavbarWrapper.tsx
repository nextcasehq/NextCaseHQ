'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function NavbarWrapper() {
  const pathname = usePathname();

  // Conditionally hide Navbar on dashboard, organization, admin, system,
  // and matters routes (Matter Workspace has its own shell — see matters/layout.tsx)
  const hideNavbarRoutes = ['/organization'];
  const shouldHide =
    hideNavbarRoutes.includes(pathname) ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/system') ||
    pathname.startsWith('/matters');

  if (shouldHide) {
    return null;
  }

  return <Navbar />;
}
