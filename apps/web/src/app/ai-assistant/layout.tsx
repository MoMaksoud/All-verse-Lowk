'use client';

import { Navigation } from '@/components/Navigation';
import { ReactNode } from 'react';

const NavComponent = Navigation as React.ComponentType;

export default function Layout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <NavComponent />
      {children}
    </>
  );
}
