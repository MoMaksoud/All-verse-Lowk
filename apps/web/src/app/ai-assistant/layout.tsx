'use client';

import { Navigation } from '@/components/Navigation';

const NavComponent = Navigation as React.ComponentType;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavComponent />
      {children}
    </>
  );
}
