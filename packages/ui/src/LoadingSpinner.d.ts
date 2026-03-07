import React from 'react';
export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'white' | 'gray';
    className?: string;
}
export declare const LoadingSpinner: React.FC<LoadingSpinnerProps>;
export interface LoadingOverlayProps {
    message?: string;
}
export declare const LoadingOverlay: React.FC<LoadingOverlayProps>;
export interface FullPageLoaderProps {
    message?: string;
}
export declare const FullPageLoader: React.FC<FullPageLoaderProps>;
//# sourceMappingURL=LoadingSpinner.d.ts.map