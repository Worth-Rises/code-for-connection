import React from 'react';
export interface LayoutProps {
    children: React.ReactNode;
    header?: React.ReactNode;
    sidebar?: React.ReactNode;
    footer?: React.ReactNode;
}
export declare const Layout: React.FC<LayoutProps>;
export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}
export declare const PageHeader: React.FC<PageHeaderProps>;
export interface ContainerProps {
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    className?: string;
}
export declare const Container: React.FC<ContainerProps>;
//# sourceMappingURL=Layout.d.ts.map