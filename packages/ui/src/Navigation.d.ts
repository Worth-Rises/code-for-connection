import React from 'react';
export interface NavItem {
    label: string;
    href: string;
    icon?: React.ReactNode;
    active?: boolean;
}
export interface NavigationProps {
    items: NavItem[];
    logo?: React.ReactNode;
    userMenu?: React.ReactNode;
}
export declare const Navigation: React.FC<NavigationProps>;
export interface SidebarNavProps {
    items: NavItem[];
    title?: string;
}
export declare const SidebarNav: React.FC<SidebarNavProps>;
export interface TabItem {
    id: string;
    label: string;
    count?: number;
}
export interface TabsProps {
    tabs: TabItem[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}
export declare const Tabs: React.FC<TabsProps>;
//# sourceMappingURL=Navigation.d.ts.map