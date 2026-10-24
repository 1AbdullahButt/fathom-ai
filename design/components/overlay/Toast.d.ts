import * as React from 'react';
/** Dark transient confirmation, bottom-center; optional single action (Undo). */
export interface ToastProps { tone?: "success"|"error"|"info"|"link"; title: React.ReactNode; body?: React.ReactNode; actionLabel?: string; onAction?: () => void; onClose?: () => void; }
export declare function Toast(props: ToastProps): React.ReactElement | null;
