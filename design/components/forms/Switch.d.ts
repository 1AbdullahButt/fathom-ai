import * as React from 'react';
/** Binary setting toggle (e.g. "Follow playback"). */
export interface SwitchProps { checked?: boolean; onChange?: (checked: boolean) => void; label?: React.ReactNode; disabled?: boolean; }
export declare function Switch(props: SwitchProps): React.ReactElement | null;
