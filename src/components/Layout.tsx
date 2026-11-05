import { type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ 
      padding: '50px', 
      backgroundColor: '#f4f6f8', 
      minHeight: '100vh',
      fontFamily: '"Open Sans", sans-serif'
    }}>
      {children}
    </div>
  );
}