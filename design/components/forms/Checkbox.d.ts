import * as React from 'react';
/** Checkbox; used to complete action items. */
export interface CheckboxProps { checked?: boolean; onChange?: (checked: boolean) => void; label?: React.ReactNode; disabled?: boolean; size?: number; }
export declare function Checkbox(props: CheckboxProps): React.ReactElement | null;
