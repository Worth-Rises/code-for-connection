import React from 'react';
export interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}
export declare const Card: React.FC<CardProps>;
export interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}
export declare const CardHeader: React.FC<CardHeaderProps>;
export interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}
export declare const CardContent: React.FC<CardContentProps>;
export interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}
export declare const CardFooter: React.FC<CardFooterProps>;
//# sourceMappingURL=Card.d.ts.map