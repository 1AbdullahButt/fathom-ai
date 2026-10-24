import * as React from 'react';
/** Modal for focused tasks (create clip, upload, confirm delete). Esc + backdrop close. */
export interface DialogProps { open?: boolean; title: string; description?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; onClose?: () => void; width?: number; inline?: boolean; }
export declare function Dialog(props: DialogProps): React.ReactElement | null;
