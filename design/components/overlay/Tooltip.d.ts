import * as React from 'react';
/** Hover/focus label for icon-only or truncated UI. */
export interface TooltipProps { label: React.ReactNode; side?: "top"|"bottom"; children: React.ReactNode; forceOpen?: boolean; }
export declare function Tooltip(props: TooltipProps): React.ReactElement | null;
