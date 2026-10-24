import * as React from 'react';
/** Small static label for status/source/metadata. */
export interface BadgeProps { tone?: "neutral"|"outline"|"accent"|"warn"|"danger"|"human"|"dark"; size?: "sm"|"md"; icon?: string; children?: React.ReactNode; style?: React.CSSProperties; }
export declare function Badge(props: BadgeProps): React.ReactElement | null;
