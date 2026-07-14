'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function NavbarWrapper() {
  const pathname = usePathname();

  // Conditionally hide Navbar on dashboard, login, and organization routes
  const hideNavbarRoutes = ['/login', '/organization'];

  // Safely evaluate pathname to prevent crashes during static generation or SSR
  const shouldHide = pathname
    ? (hideNavbarRoutes.includes(pathname) || pathname.startsWith('/dashboard'))
    : false;

  if (shouldHide) {
    return null;
  }

  return <Navbar />;
}
