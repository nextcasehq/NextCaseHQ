'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function NavbarWrapper() {
  const pathname = usePathname();

  // Conditionally hide Navbar on dashboard, login, and organization routes
  const hideNavbarRoutes = ['/login', '/organization'];
  const shouldHide = hideNavbarRoutes.includes(pathname) || pathname.startsWith('/dashboard');

  if (shouldHide) {
    return null;
  }

  return <Navbar />;
}
