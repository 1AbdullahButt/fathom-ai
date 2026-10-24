import * as React from 'react';
/** Centered empty / error / not-found / processing message with optional actions. */
export interface StateBlockProps { kind?: "empty"|"noResults"|"error"|"offline"|"notFound"|"locked"|"processing"; icon?: string; title?: React.ReactNode; body?: React.ReactNode; actions?: React.ReactNode; compact?: boolean; loading?: boolean; }
export declare function StateBlock(props: StateBlockProps): React.ReactElement | null;
