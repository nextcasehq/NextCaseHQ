'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function NavbarWrapper() {
  const pathname = usePathname();

  // Conditionally hide Navbar on dashboard, organization, admin, system,
  // and matters routes (Matter Workspace has its own shell — see matters/layout.tsx).
  // Also hidden on the homepage itself: the product-first landing page
  // (LandingPageContent) carries its own self-contained branding and is a
  // single-screen experience by design — the marketing nav bar above it
  // would both duplicate the wordmark and push real content below the fold.
  const hideNavbarRoutes = ['/organization', '/'];
  const shouldHide =
    hideNavbarRoutes.includes(pathname) ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/matters') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/system') ||
    pathname.startsWith('/matters');

  if (shouldHide) {
    return null;
  }

  return <Navbar />;
}
