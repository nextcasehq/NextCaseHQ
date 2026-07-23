'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function NavbarWrapper() {
  const pathname = usePathname();

  // Conditionally hide Navbar on dashboard, organization, admin, system,
  // matters, and cases routes (each has its own authenticated shell — see
  // matters/layout.tsx and cases/layout.tsx). /cases was missing from this
  // list entirely until now — the Case Diary was the one major
  // authenticated area of the app still showing the public marketing
  // navbar (Matters/Cases/Features/Solutions/Pricing) to a signed-in
  // advocate mid-workflow.
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
    pathname.startsWith('/cases');

  if (shouldHide) {
    return null;
  }

  return <Navbar />;
}
