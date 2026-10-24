import * as React from 'react';
/** Underline tabs with optional counts — the meeting side panel (Summary / Action items / Highlights). */
export interface TabsProps { tabs: {id: string; label: string; count?: number}[]; value: string; onChange?: (id: string) => void; fill?: boolean; size?: "sm"|"md"; }
export declare function Tabs(props: TabsProps): React.ReactElement | null;
