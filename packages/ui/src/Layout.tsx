import React from 'react';

export interface LayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  header,
  sidebar,
  footer,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {header && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          {header}
        </header>
      )}
      
      <div className="flex-1 flex">
        {sidebar && (
          <aside className="w-64 bg-white border-r border-gray-200 hidden lg:block">
            {sidebar}
          </aside>
        )}
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      
      {footer && (
        <footer className="bg-white border-t border-gray-200">
          {footer}
        </footer>
      )}
    </div>
  );
};

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
}) => {
  return (
    <div className="flex items-center justify-between py-4 px-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};

export interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'xl',
  className = '',
}) => {
  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  return (
    <div className={`mx-auto ${maxWidthStyles[maxWidth]} ${className}`}>
      {children}
    </div>
  );
};
