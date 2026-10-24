import * as React from 'react';
/** Overlapping avatars with +N overflow for meeting participants. */
export interface AvatarStackProps { people: {name: string; color?: string}[]; max?: number; size?: number; ring?: string; }
export declare function AvatarStack(props: AvatarStackProps): React.ReactElement | null;
