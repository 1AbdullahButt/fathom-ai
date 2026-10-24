import * as React from 'react';
/** Initials avatar tinted with the speaker colour; `speaking` adds a ring. */
export interface AvatarProps { name: string; color?: string; size?: number; speaking?: boolean; ring?: string; style?: React.CSSProperties; }
export declare function Avatar(props: AvatarProps): React.ReactElement | null;
export declare function initials(name: string): string;
