import React from 'react';
export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    closeOnOverlayClick?: boolean;
    showCloseButton?: boolean;
}
export declare const Modal: React.FC<ModalProps>;
export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}
export declare const ConfirmModal: React.FC<ConfirmModalProps>;
//# sourceMappingURL=Modal.d.ts.map